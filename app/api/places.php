<?php
/*
 * Nearby places for the guest app: Google Places API (New), called server-side.
 *
 *   GET /app/api/places.php  ->  JSON in the app's places format (see app/data/places.json and
 *                                docs/google-places.md for the fields).
 *
 * - The API key comes from the environment (GOOGLE_PLACES_API_KEY in .env, passed by docker-compose.yml).
 *   It is never sent to the browser and never logged.
 * - No key, no hotel location, or a Google failure: the bundled demo data is returned with
 *   "source": "demo" and a "fallback_reason", so the app never breaks.
 * - The endpoint takes no request parameters. Results are kept in the container's temp directory for
 *   PLACES_CACHE_TTL seconds (default 900, minimum 60), so Google is called at most 6 times per TTL
 *   (3 categories x 2 languages) whatever the traffic.
 * - Only the HTTP status and Google's error status, reason and message are logged (docker compose logs).
 *
 * Runs under the LimeSurvey container's Apache/PHP (8.x, curl). Also runs from the CLI for checks:
 *   docker compose exec limesurvey php /var/www/html/app/api/places.php
 */

declare(strict_types=1);

const API_BASE_DEFAULT = 'https://places.googleapis.com/v1';
const DEMO_FILE = __DIR__ . '/../data/places.json';
const LANGS = ['en', 'fa'];
const DEFAULT_QUERY = 'مجتمع گردشگری کوثر ملکشهر اصفهان';
const ORIGIN_TTL = 2592000;      // 30 days: the longest Google allows latitude/longitude to be cached.
const STALE_ON_ERROR = 21600;    // Serve the last good result for up to 6 hours if Google fails.

// Table A types per app category (verified against the Places API type list, 2026).
const CATEGORY_TYPES = [
    'restaurant' => ['restaurant', 'persian_restaurant', 'middle_eastern_restaurant', 'fast_food_restaurant'],
    'cafe' => ['cafe', 'coffee_shop', 'tea_house', 'ice_cream_shop', 'dessert_shop'],
    'poi' => ['tourist_attraction', 'museum', 'park', 'historical_landmark', 'cultural_landmark', 'art_gallery'],
];

// Pro + Enterprise fields only (no Atmosphere fields: no reviews, photos or summaries).
const FIELD_MASK = 'places.id,places.displayName,places.primaryType,places.types,places.location,'
    . 'places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,'
    . 'places.regularOpeningHours,places.nationalPhoneNumber,places.internationalPhoneNumber,'
    . 'places.googleMapsUri,places.shortFormattedAddress,places.businessStatus,places.attributions';

// Google type -> guest-facing tag, both languages. Types not listed here are not shown as tags.
const TYPE_TAGS = [
    'persian_restaurant' => ['Persian', 'ایرانی'],
    'middle_eastern_restaurant' => ['Middle Eastern', 'خاورمیانه‌ای'],
    'fast_food_restaurant' => ['Fast food', 'فست‌فود'],
    'pizza_restaurant' => ['Pizza', 'پیتزا'],
    'seafood_restaurant' => ['Seafood', 'غذای دریایی'],
    'italian_restaurant' => ['Italian', 'ایتالیایی'],
    'vegetarian_restaurant' => ['Vegetarian', 'گیاهی'],
    'breakfast_restaurant' => ['Breakfast', 'صبحانه'],
    'buffet_restaurant' => ['Buffet', 'بوفه'],
    'fine_dining_restaurant' => ['Fine dining', 'رستوران مجلل'],
    'sandwich_shop' => ['Sandwiches', 'ساندویچ'],
    'coffee_shop' => ['Coffee', 'قهوه'],
    'cafe' => ['Café', 'کافه'],
    'tea_house' => ['Tea house', 'چایخانه'],
    'ice_cream_shop' => ['Ice cream', 'بستنی'],
    'dessert_shop' => ['Desserts', 'دسر'],
    'bakery' => ['Bakery', 'شیرینی‌پزی'],
    'museum' => ['Museum', 'موزه'],
    'park' => ['Park', 'پارک'],
    'garden' => ['Garden', 'باغ'],
    'historical_landmark' => ['Historic', 'تاریخی'],
    'cultural_landmark' => ['Cultural', 'فرهنگی'],
    'art_gallery' => ['Gallery', 'نگارخانه'],
    'tourist_attraction' => ['Attraction', 'جاذبهٔ گردشگری'],
    'mosque' => ['Mosque', 'مسجد'],
    'market' => ['Market', 'بازار'],
    'shopping_mall' => ['Shopping', 'مرکز خرید'],
];

const PRICE = [
    'PRICE_LEVEL_INEXPENSIVE' => 1,
    'PRICE_LEVEL_MODERATE' => 2,
    'PRICE_LEVEL_EXPENSIVE' => 3,
    'PRICE_LEVEL_VERY_EXPENSIVE' => 4,
];

final class GoogleError extends RuntimeException
{
    public string $status;
    public string $reason;

    public function __construct(string $status, string $reason = '', int $code = 0)
    {
        parent::__construct($status, $code);
        $this->status = $status;
        $this->reason = $reason;
    }
}

function env_value(string $name, string $default = ''): string
{
    $v = getenv($name);
    if ($v === false || trim($v) === '') {
        return $default;
    }
    return trim($v);
}

function env_int(string $name, int $default, int $min, int $max): int
{
    $v = env_value($name);
    if ($v === '' || !preg_match('/^\d+$/', $v)) {
        return $default;
    }
    return max($min, min($max, (int) $v));
}

function config(): array
{
    $lat = env_value('HOTEL_LAT');
    $lng = env_value('HOTEL_LNG');
    $hasCoords = is_numeric($lat) && is_numeric($lng)
        && abs((float) $lat) <= 90 && abs((float) $lng) <= 180;
    $tz = env_value('HOTEL_TIMEZONE', 'Asia/Tehran');
    if (!in_array($tz, timezone_identifiers_list(), true)) {
        $tz = 'Asia/Tehran';
    }
    $region = strtoupper(env_value('PLACES_REGION_CODE', 'IR'));
    if (!preg_match('/^[A-Z]{2}$/', $region)) {
        $region = 'IR';
    }
    $base = rtrim(env_value('PLACES_API_BASE', API_BASE_DEFAULT), '/');
    if (!preg_match('#^https?://#', $base)) {
        $base = API_BASE_DEFAULT;
    }
    return [
        'key' => env_value('GOOGLE_PLACES_API_KEY'),
        'base' => $base,
        'lat' => $hasCoords ? (float) $lat : null,
        'lng' => $hasCoords ? (float) $lng : null,
        'query' => env_value('HOTEL_PLACE_QUERY', DEFAULT_QUERY),
        'radius' => env_int('PLACES_RADIUS_M', 2000, 100, 50000),
        'ttl' => env_int('PLACES_CACHE_TTL', 900, 60, 86400),
        'max' => env_int('PLACES_MAX_PER_CATEGORY', 12, 1, 20),
        'tz' => $tz,
        'region' => $region,
    ];
}

function cache_path(string $name): string
{
    return rtrim(sys_get_temp_dir(), '/') . '/kowsar-places-' . $name;
}

function read_json_file(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function write_json_file(string $path, array $data): void
{
    $tmp = $path . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false) {
        @rename($tmp, $path);
    }
}

function log_google(string $what, int $http, ?array $body = null): void
{
    $err = is_array($body) && isset($body['error']) && is_array($body['error']) ? $body['error'] : [];
    $status = (string) ($err['status'] ?? '');
    $message = preg_replace('/\s+/', ' ', (string) ($err['message'] ?? ''));
    error_log(sprintf('places.php: %s failed: http=%d status=%s message=%s', $what, $http, $status, mb_substr($message, 0, 300)));
}

function google_error_from(int $http, ?array $body, string $curlError): GoogleError
{
    if ($curlError !== '') {
        return new GoogleError('NETWORK_ERROR', '', $http);
    }
    $err = is_array($body) && isset($body['error']) && is_array($body['error']) ? $body['error'] : [];
    $reason = '';
    foreach (($err['details'] ?? []) as $d) {
        if (is_array($d) && isset($d['reason']) && is_string($d['reason'])) {
            $reason = $d['reason'];
            break;
        }
    }
    $status = is_string($err['status'] ?? null) ? $err['status'] : ('HTTP_' . $http);
    return new GoogleError($status, $reason, $http);
}

/** One POST handle for the Places API. */
function google_handle(array $cfg, string $path, string $fieldMask, array $body)
{
    $ch = curl_init($cfg['base'] . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Goog-Api-Key: ' . $cfg['key'],
            'X-Goog-FieldMask: ' . $fieldMask,
        ],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
    ]);
    return $ch;
}

/** Runs the handles in parallel. Returns [label => decoded body]; throws the first Google error. */
function google_run(array $handles): array
{
    $multi = curl_multi_init();
    foreach ($handles as $ch) {
        curl_multi_add_handle($multi, $ch);
    }
    do {
        $status = curl_multi_exec($multi, $running);
        if ($running) {
            curl_multi_select($multi, 1.0);
        }
    } while ($running && $status === CURLM_OK);

    $results = [];
    $first = null;
    foreach ($handles as $label => $ch) {
        $raw = curl_multi_getcontent($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($ch);
        curl_multi_remove_handle($multi, $ch);
        curl_close($ch);
        $body = is_string($raw) ? json_decode($raw, true) : null;
        if ($curlError === '' && $http === 200 && is_array($body)) {
            $results[$label] = $body;
            continue;
        }
        log_google((string) $label, $http, is_array($body) ? $body : null);
        if ($curlError !== '') {
            error_log('places.php: ' . $label . ' network error: ' . $curlError);
        }
        $first = $first ?? google_error_from($http, is_array($body) ? $body : null, $curlError);
        $results[$label] = null;
    }
    curl_multi_close($multi);
    if ($first !== null && !array_filter($results)) {
        throw $first;
    }
    return $results;
}

/** Hotel location: HOTEL_LAT/HOTEL_LNG, else a Text Search for HOTEL_PLACE_QUERY (cached up to 30 days). */
function resolve_origin(array $cfg): array
{
    if ($cfg['lat'] !== null) {
        return ['id' => null, 'name' => null, 'lat' => $cfg['lat'], 'lng' => $cfg['lng'], 'resolved_by' => 'env'];
    }
    $path = cache_path('origin-' . substr(md5($cfg['query']), 0, 12) . '.json');
    $cached = read_json_file($path);
    if ($cached && (time() - (int) ($cached['at'] ?? 0)) < ORIGIN_TTL && isset($cached['origin'])) {
        return $cached['origin'];
    }
    $ch = google_handle($cfg, '/places:searchText', 'places.id,places.displayName,places.location,places.formattedAddress', [
        'textQuery' => $cfg['query'],
        'languageCode' => 'fa',
        'regionCode' => $cfg['region'],
        'pageSize' => 1,
    ]);
    $body = google_run(['origin' => $ch])['origin'];
    $place = $body['places'][0] ?? null;
    if (!is_array($place) || !isset($place['location']['latitude'], $place['location']['longitude'])) {
        throw new GoogleError('ORIGIN_NOT_FOUND');
    }
    $origin = [
        'id' => is_string($place['id'] ?? null) ? $place['id'] : null,
        'name' => (string) ($place['displayName']['text'] ?? ''),
        'address' => (string) ($place['formattedAddress'] ?? ''),
        'lat' => (float) $place['location']['latitude'],
        'lng' => (float) $place['location']['longitude'],
        'resolved_by' => 'text_search',
    ];
    write_json_file($path, ['at' => time(), 'origin' => $origin]);
    return $origin;
}

function distance_m(float $lat1, float $lng1, float $lat2, float $lng2): int
{
    $r = 6371000.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    $m = 2 * $r * asin(min(1.0, sqrt($a)));
    return (int) (round($m / 10) * 10);
}

/** Opening periods as minutes of the week (Sunday 00:00 = 0), the close may pass 10080. */
function opening(array $p): ?array
{
    $hours = $p['currentOpeningHours'] ?? $p['regularOpeningHours'] ?? null;
    if (!is_array($hours) || empty($hours['periods']) || !is_array($hours['periods'])) {
        return null;
    }
    $periods = [];
    foreach ($hours['periods'] as $per) {
        $open = $per['open'] ?? null;
        if (!is_array($open) || !isset($open['day'])) {
            continue;
        }
        $o = (int) $open['day'] * 1440 + (int) ($open['hour'] ?? 0) * 60 + (int) ($open['minute'] ?? 0);
        $close = $per['close'] ?? null;
        if (!is_array($close) || !isset($close['day'])) {
            // An open with no close is Google's "open 24 hours, every day".
            return ['always' => true, 'periods' => []];
        }
        $c = (int) $close['day'] * 1440 + (int) ($close['hour'] ?? 0) * 60 + (int) ($close['minute'] ?? 0);
        if ($c <= $o) {
            $c += 10080;
        }
        $periods[] = [$o, $c];
    }
    if (!$periods) {
        return null;
    }
    usort($periods, fn($a, $b) => $a[0] <=> $b[0]);
    return ['always' => false, 'periods' => $periods];
}

function safe_https(?string $url): ?string
{
    if (!is_string($url) || !preg_match('#^https://[^\s"<>]+$#', $url)) {
        return null;
    }
    return $url;
}

function normalize(array $cfg, array $origin, array $results): array
{
    $byId = [];
    $assigned = [];
    $providers = [];
    foreach ($results as $label => $body) {
        if (!is_array($body)) {
            continue;
        }
        [$cat, $lang] = explode('|', (string) $label);
        foreach (($body['places'] ?? []) as $p) {
            $id = $p['id'] ?? null;
            if (!is_string($id) || $id === '' || $id === $origin['id']) {
                continue;
            }
            $status = $p['businessStatus'] ?? 'OPERATIONAL';
            if ($status === 'CLOSED_PERMANENTLY' || $status === 'CLOSED_TEMPORARILY') {
                continue;
            }
            if (!isset($p['location']['latitude'], $p['location']['longitude'])) {
                continue;
            }
            $name = trim((string) ($p['displayName']['text'] ?? ''));
            if (!isset($byId[$id])) {
                $byId[$id] = ['raw' => $p, 'name' => [], 'address' => []];
                $assigned[$id] = $cat;
            } elseif (in_array($p['primaryType'] ?? '', CATEGORY_TYPES[$cat], true)) {
                // Listed by two categories: the one that holds the primary type wins.
                $assigned[$id] = $cat;
            }
            if ($name !== '') {
                $byId[$id]['name'][$lang] = $name;
            }
            $addr = trim((string) ($p['shortFormattedAddress'] ?? ''));
            if ($addr !== '') {
                $byId[$id]['address'][$lang] = $addr;
            }
            // Third-party data providers must be credited next to "Google Maps" (Places API policies).
            foreach (($p['attributions'] ?? []) as $a) {
                if (is_array($a) && is_string($a['provider'] ?? null) && trim($a['provider']) !== '') {
                    $providers[trim($a['provider'])] = true;
                }
            }
        }
    }

    $places = [];
    foreach ($byId as $id => $entry) {
        $p = $entry['raw'];
        $names = $entry['name'];
        if (!$names) {
            continue;
        }
        $names += ['en' => $names['fa'] ?? '', 'fa' => $names['en'] ?? ''];
        $address = $entry['address'];
        if ($address) {
            $address += ['en' => $address['fa'] ?? '', 'fa' => $address['en'] ?? ''];
        }
        $lat = (float) $p['location']['latitude'];
        $lng = (float) $p['location']['longitude'];
        $tags = ['en' => [], 'fa' => []];
        foreach (($p['types'] ?? []) as $t) {
            if (isset(TYPE_TAGS[$t]) && count($tags['en']) < 3) {
                $tags['en'][] = TYPE_TAGS[$t][0];
                $tags['fa'][] = TYPE_TAGS[$t][1];
            }
        }
        $phone = (string) ($p['internationalPhoneNumber'] ?? $p['nationalPhoneNumber'] ?? '');
        $tel = preg_replace('/[^0-9+]/', '', $phone);
        $places[] = [
            'id' => $id,
            'category' => $assigned[$id],
            'name' => ['en' => $names['en'], 'fa' => $names['fa']],
            'address' => $address ? ['en' => $address['en'], 'fa' => $address['fa']] : null,
            'distance_m' => distance_m($origin['lat'], $origin['lng'], $lat, $lng),
            'rating' => isset($p['rating']) ? round((float) $p['rating'], 1) : null,
            'rating_count' => isset($p['userRatingCount']) ? (int) $p['userRatingCount'] : null,
            'price' => PRICE[$p['priceLevel'] ?? ''] ?? null,
            'opening' => opening($p),
            'tags' => $tags,
            'phone' => $tel !== '' ? $tel : null,
            'phone_display' => (string) ($p['nationalPhoneNumber'] ?? $phone) ?: null,
            'maps_url' => safe_https($p['googleMapsUri'] ?? null),
            'directions_url' => 'https://www.google.com/maps/dir/?api=1&destination=' . rawurlencode($lat . ',' . $lng)
                . '&destination_place_id=' . rawurlencode($id),
        ];
    }
    usort($places, fn($a, $b) => $a['distance_m'] <=> $b['distance_m']);

    return [
        'source' => 'google',
        'demo' => false,
        'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'timezone' => $cfg['tz'],
        'radius_m' => $cfg['radius'],
        'origin' => [
            'name' => $origin['name'] ?? null,
            'lat' => round($origin['lat'], 6),
            'lng' => round($origin['lng'], 6),
            'resolved_by' => $origin['resolved_by'],
        ],
        'attribution' => 'Google Maps',
        'providers' => array_keys($providers),
        'partial' => in_array(null, $results, true),
        'highlights' => highlights($places),
        'places' => $places,
    ];
}

/** One highlight per category: best rating weighted by review count, else the nearest. */
function highlights(array $places): array
{
    $best = [];
    foreach ($places as $p) {
        $score = $p['rating'] !== null ? $p['rating'] * log10(($p['rating_count'] ?? 0) + 10) : -1 / (1 + $p['distance_m']);
        $cat = $p['category'];
        if (!isset($best[$cat]) || $score > $best[$cat][0]) {
            $best[$cat] = [$score, $p['id']];
        }
    }
    $out = [];
    foreach (['restaurant', 'cafe', 'poi'] as $cat) {
        if (isset($best[$cat])) {
            $out[] = $best[$cat][1];
        }
    }
    return $out;
}

function fetch_google(array $cfg): array
{
    $origin = resolve_origin($cfg);
    $handles = [];
    foreach (CATEGORY_TYPES as $cat => $types) {
        foreach (LANGS as $lang) {
            $handles[$cat . '|' . $lang] = google_handle($cfg, '/places:searchNearby', FIELD_MASK, [
                'includedTypes' => $types,
                'maxResultCount' => $cfg['max'],
                'locationRestriction' => ['circle' => [
                    'center' => ['latitude' => $origin['lat'], 'longitude' => $origin['lng']],
                    'radius' => (float) $cfg['radius'],
                ]],
                'rankPreference' => 'POPULARITY',
                'languageCode' => $lang,
                'regionCode' => $cfg['region'],
            ]);
        }
    }
    $data = normalize($cfg, $origin, google_run($handles));
    if (!$data['places']) {
        throw new GoogleError('NO_RESULTS');
    }
    return $data;
}

function demo(array $cfg, string $reason, ?GoogleError $err = null): array
{
    $data = read_json_file(DEMO_FILE) ?? ['places' => [], 'highlights' => []];
    $data['source'] = 'demo';
    $data['demo'] = true;
    $data['timezone'] = $cfg['tz'];
    $data['fallback_reason'] = $reason;
    if ($err !== null) {
        $data['google_status'] = $err->status;
        if ($err->reason !== '') {
            $data['google_reason'] = $err->reason;
        }
    }
    return $data;
}

function places(array $cfg): array
{
    if ($cfg['key'] === '') {
        return demo($cfg, 'not_configured');
    }
    $sig = substr(sha1(json_encode([$cfg, CATEGORY_TYPES, FIELD_MASK])), 0, 16);
    $path = cache_path('nearby-' . $sig . '.json');
    $fresh = function () use ($path, $cfg): ?array {
        $c = read_json_file($path);
        return ($c && (time() - (int) ($c['at'] ?? 0)) < $cfg['ttl']) ? $c['data'] : null;
    };
    if ($hit = $fresh()) {
        return $hit;
    }

    // One refresh at a time: other requests wait for it, then read the new cache.
    $lock = @fopen($path . '.lock', 'c');
    if ($lock) {
        flock($lock, LOCK_EX);
    }
    try {
        if ($hit = $fresh()) {
            return $hit;
        }
        try {
            $data = fetch_google($cfg);
            write_json_file($path, ['at' => time(), 'data' => $data]);
            return $data;
        } catch (GoogleError $e) {
            $old = read_json_file($path);
            if ($old && (time() - (int) ($old['at'] ?? 0)) < STALE_ON_ERROR) {
                $old['data']['stale'] = true;
                return $old['data'];
            }
            $reason = $e->status === 'ORIGIN_NOT_FOUND' ? 'origin_not_found' : 'google_error';
            return demo($cfg, $reason, $e);
        }
    } finally {
        if ($lock) {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}

// ---- Request ---------------------------------------------------------------------------------

$cli = PHP_SAPI === 'cli';
if (!$cli) {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && $method !== 'HEAD') {
        http_response_code(405);
        header('Allow: GET, HEAD');
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
}
@set_time_limit(30);

try {
    $out = places(config());
} catch (Throwable $e) {
    error_log('places.php: unexpected ' . get_class($e) . ': ' . $e->getMessage());
    $out = demo(config(), 'server_error');
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | ($cli ? JSON_PRETTY_PRINT : 0));
if ($cli) {
    echo PHP_EOL;
}
