<?php
/*
 * Nearby places for the guest app: Neshan Maps Platform (Nearby + POI Details), called server-side.
 *
 *   GET /app/api/places.php  ->  JSON in the app's places format (see docs/neshan-places.md).
 *
 * - The API key comes from the environment (NESHAN_API_KEY in .env, passed by docker-compose.yml).
 *   It is sent in the Api-Key header, never sent to the browser and never logged.
 * - No key, no hotel location, or a Neshan failure: the bundled demo data is returned with
 *   "source": "demo" and a "fallback_reason", so the app never breaks.
 * - The endpoint takes no request parameters. The result is kept in the container's temp directory for
 *   PLACES_CACHE_TTL seconds (default 900, minimum 60). One refresh = one Nearby call per category plus
 *   one POI Details call per place, so the cost per refresh is bounded by PLACES_MAX_PER_CATEGORY.
 * - Only the HTTP status and Neshan's error message are logged (docker compose logs).
 *
 * Runs under the LimeSurvey container's Apache/PHP (8.x, curl). Also runs from the CLI for checks:
 *   docker compose exec limesurvey php /var/www/html/app/api/places.php
 */

declare(strict_types=1);

const API_BASE_DEFAULT = 'https://api.neshan.org/v1';
const DEMO_FILE = __DIR__ . '/../data/places.json';
const STALE_ON_ERROR = 21600;   // Serve the last good result for up to 6 hours if Neshan fails.

// App category -> Neshan layer slug. Slugs come from the Nearby docs' examples; confirm each with a live call.
const CATEGORY_LAYERS = [
    'restaurant' => 'restaurant',
    'cafe' => 'cafe',
    'poi' => 'park',
];

// Neshan day names -> index in the app's week (0 = Sunday, as JavaScript's Date.getDay()).
const DAY_INDEX = [
    'sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4, 'friday' => 5, 'saturday' => 6,
];

final class NeshanError extends RuntimeException
{
    public string $status;

    public function __construct(string $status, int $code = 0)
    {
        parent::__construct($status, $code);
        $this->status = $status;
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
    $base = rtrim(env_value('NESHAN_API_BASE', API_BASE_DEFAULT), '/');
    if (!preg_match('#^https?://#', $base)) {
        $base = API_BASE_DEFAULT;
    }
    return [
        'key' => env_value('NESHAN_API_KEY'),
        'base' => $base,
        'lat' => $hasCoords ? (float) $lat : null,
        'lng' => $hasCoords ? (float) $lng : null,
        'radius' => env_int('PLACES_RADIUS_M', 2000, 100, 50000),
        'ttl' => env_int('PLACES_CACHE_TTL', 900, 60, 86400),
        'max' => env_int('PLACES_MAX_PER_CATEGORY', 12, 1, 20),
        'tz' => $tz,
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

/** Neshan error codes from the docs (HTTP status in the 4xx/5xx range, sometimes 470-485). */
const NESHAN_CODES = [
    400 => 'INVALID_ARGUMENT', 404 => 'NOT_FOUND', 470 => 'COORDINATE_PARSE_ERROR',
    480 => 'KEY_NOT_FOUND', 481 => 'LIMIT_EXCEEDED', 482 => 'RATE_EXCEEDED',
    483 => 'KEY_TYPE_ERROR', 484 => 'KEY_SCOPE_ERROR', 485 => 'SERVICE_NOT_ENABLED', 500 => 'GENERIC_ERROR',
];

/** GET request, runs in parallel with the others. Returns [label => decoded body or null]. */
function neshan_get_all(array $cfg, array $requests): array
{
    $multi = curl_multi_init();
    $handles = [];
    foreach ($requests as $label => [$path, $query]) {
        $ch = curl_init($cfg['base'] . $path . '?' . http_build_query($query));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Api-Key: ' . $cfg['key'], 'Accept: application/json'],
        ]);
        curl_multi_add_handle($multi, $ch);
        $handles[$label] = $ch;
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
        if ($curlError !== '') {
            error_log('places.php: ' . $label . ' network error: ' . $curlError);
            $first = $first ?? new NeshanError('NETWORK_ERROR', $http);
        } else {
            $msg = is_array($body) ? preg_replace('/\s+/', ' ', (string) ($body['message'] ?? $body['error'] ?? '')) : '';
            error_log(sprintf('places.php: %s failed: http=%d message=%s', $label, $http, mb_substr((string) $msg, 0, 200)));
            $first = $first ?? new NeshanError(NESHAN_CODES[$http] ?? ('HTTP_' . $http), $http);
        }
        $results[$label] = null;
    }
    curl_multi_close($multi);
    // Throw only when every request failed; a partial result is still useful.
    if ($first !== null && !array_filter($results)) {
        throw $first;
    }
    return $results;
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

/** "HH:MM" -> minutes after midnight, or null. */
function clock_minutes($value): ?int
{
    if (!is_string($value) || !preg_match('/^(\d{1,2}):(\d{2})$/', trim($value), $m)) {
        return null;
    }
    $h = (int) $m[1];
    $min = (int) $m[2];
    return ($h > 24 || $min > 59) ? null : $h * 60 + $min;
}

/**
 * Neshan workHours: [{ day, ranges: [{ start, end }] }]. An empty ranges list means closed that day.
 * Returns opening periods in minutes of the week (Sunday 00:00 = 0), or null when no hours are listed.
 */
function opening(array $p): ?array
{
    $hours = $p['workHours'] ?? null;
    if (!is_array($hours) || !$hours) {
        return null;
    }
    $periods = [];
    foreach ($hours as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $day = $entry['day'] ?? null;
        $dayIndex = is_string($day) ? (DAY_INDEX[strtolower(trim($day))] ?? null) : null;
        if ($dayIndex === null) {
            continue;
        }
        foreach (($entry['ranges'] ?? []) as $r) {
            $o = clock_minutes($r['start'] ?? null);
            $c = clock_minutes($r['end'] ?? null);
            if ($o === null || $c === null) {
                continue;
            }
            $base = $dayIndex * 1440;
            if ($c <= $o) {
                $c += 1440;   // Closes after midnight.
            }
            $periods[] = [$base + $o, $base + $c];
        }
    }
    usort($periods, fn($a, $b) => $a[0] <=> $b[0]);
    return ['always' => false, 'periods' => $periods];
}

/** Guest-facing phone: digits and a leading plus only, or null. */
function phone_tel(?string $raw): ?string
{
    if (!is_string($raw)) {
        return null;
    }
    $tel = preg_replace('/[^0-9+]/', '', $raw);
    return ($tel !== '' && preg_match('/^\+?[0-9]{5,16}$/', $tel)) ? $tel : null;
}

function text_or_null($v): ?string
{
    $s = is_string($v) ? trim(preg_replace('/\s+/', ' ', $v)) : '';
    return $s === '' ? null : $s;
}

/**
 * Builds the places list from the Nearby results and the POI Details results.
 * Neshan returns Persian names only, so the English fields repeat the Persian text.
 */
function normalize(array $cfg, array $lists, array $details): array
{
    $places = [];
    $seen = [];
    foreach ($lists as $cat => $body) {
        if (!is_array($body)) {
            continue;
        }
        foreach (($body['layerPoints']['nearestPoints'] ?? []) as $pt) {
            $hash = is_string($pt['poiHash'] ?? null) ? $pt['poiHash'] : '';
            $name = text_or_null($pt['name'] ?? null);
            $loc = $pt['location'] ?? null;
            if ($hash === '' || $name === null || isset($seen[$hash]) || !is_array($loc)
                || !isset($loc['latitude'], $loc['longitude'])) {
                continue;
            }
            $seen[$hash] = true;
            $d = is_array($details[$hash] ?? null) ? $details[$hash] : [];
            $address = text_or_null($d['address'] ?? null);
            $phoneRaw = text_or_null($d['phoneNumber'] ?? null);
            $places[] = [
                'id' => $hash,
                'category' => $cat,
                'name' => ['en' => $name, 'fa' => $name],
                'address' => $address ? ['en' => $address, 'fa' => $address] : null,
                'distance_m' => (int) ($pt['distance'] ?? 0),
                'duration_s' => isset($pt['duration']) ? (int) $pt['duration'] : null,
                'opening' => opening($d),
                'phone' => phone_tel($phoneRaw),
                'phone_display' => $phoneRaw,
            ];
        }
    }
    usort($places, fn($a, $b) => $a['distance_m'] <=> $b['distance_m']);

    return [
        'source' => 'neshan',
        'demo' => false,
        'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'timezone' => $cfg['tz'],
        'radius_m' => $cfg['radius'],
        'origin' => ['lat' => round($cfg['lat'], 6), 'lng' => round($cfg['lng'], 6), 'resolved_by' => 'env'],
        'partial' => in_array(null, $lists, true),
        'highlights' => highlights($places),
        'places' => $places,
    ];
}

/** One highlight per category: the nearest place. */
function highlights(array $places): array
{
    $best = [];
    foreach ($places as $p) {
        if (!isset($best[$p['category']])) {
            $best[$p['category']] = $p['id'];
        }
    }
    $out = [];
    foreach (array_keys(CATEGORY_LAYERS) as $cat) {
        if (isset($best[$cat])) {
            $out[] = $best[$cat];
        }
    }
    return $out;
}

function fetch_neshan(array $cfg): array
{
    // 1. Nearby search, one call per category.
    $requests = [];
    foreach (CATEGORY_LAYERS as $cat => $layer) {
        $requests[$cat] = ['/nearby', [
            'location' => $cfg['lat'] . ',' . $cfg['lng'],
            'layer' => $layer,
            'searchRadius' => $cfg['radius'],
        ]];
    }
    $lists = neshan_get_all($cfg, $requests);
    if (!array_filter($lists)) {
        throw new NeshanError('NO_RESULTS');
    }

    // 2. POI Details for each place (phone, hours, address). Capped per category.
    $hashes = [];
    foreach ($lists as $body) {
        foreach (array_slice($body['layerPoints']['nearestPoints'] ?? [], 0, $cfg['max']) as $pt) {
            if (is_string($pt['poiHash'] ?? null) && $pt['poiHash'] !== '') {
                $hashes[$pt['poiHash']] = true;
            }
        }
    }
    $detailRequests = [];
    foreach (array_keys($hashes) as $hash) {
        $detailRequests[$hash] = ['/point', ['hash' => $hash]];
    }
    // Details are optional: a failed chunk leaves those places without phone and hours.
    $details = [];
    foreach (array_chunk($detailRequests, 12, true) as $chunk) {
        try {
            $details += neshan_get_all($cfg, $chunk);
        } catch (NeshanError $e) {
            continue;
        }
    }
    $details = array_filter($details, 'is_array');

    // Keep only the top PLACES_MAX_PER_CATEGORY results per category.
    foreach ($lists as $cat => $body) {
        if (is_array($body)) {
            $lists[$cat]['layerPoints']['nearestPoints'] = array_slice($body['layerPoints']['nearestPoints'] ?? [], 0, $cfg['max']);
        }
    }
    return normalize($cfg, $lists, $details);
}

function demo(array $cfg, string $reason, ?NeshanError $err = null): array
{
    $data = read_json_file(DEMO_FILE) ?? ['places' => [], 'highlights' => []];
    $data['source'] = 'demo';
    $data['demo'] = true;
    $data['timezone'] = $cfg['tz'];
    $data['fallback_reason'] = $reason;
    if ($err !== null) {
        $data['neshan_status'] = $err->status;
    }
    return $data;
}

function places(array $cfg): array
{
    if ($cfg['key'] === '') {
        return demo($cfg, 'not_configured');
    }
    if ($cfg['lat'] === null || $cfg['lng'] === null) {
        return demo($cfg, 'no_location');
    }
    $sigCfg = $cfg;
    unset($sigCfg['key']);   // The key never goes into a file name.
    $sig = substr(sha1(json_encode([$sigCfg, CATEGORY_LAYERS])), 0, 16);
    $path = cache_path('neshan-' . $sig . '.json');
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
            $data = fetch_neshan($cfg);
            write_json_file($path, ['at' => time(), 'data' => $data]);
            return $data;
        } catch (NeshanError $e) {
            $old = read_json_file($path);
            if ($old && (time() - (int) ($old['at'] ?? 0)) < STALE_ON_ERROR) {
                $old['data']['stale'] = true;
                return $old['data'];
            }
            return demo($cfg, 'neshan_error', $e);
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
