# Nearby places: Google Places setup

The Nearby screen and the Home "Nearby highlights" strip read live restaurants, cafés and sights from the **Google Places API (New)**. Everything is built and wired. The only thing missing is your API key (and, ideally, the complex's coordinates).

Until a key is set, the app shows the bundled demo list (`app/data/places.json`, marked "Demo data"), so nothing breaks.

## How it works

```
Phone ──► /app/nearby.html ──► /app/api/places.php ──► places.googleapis.com (server-side, key from .env)
                                   │  no key / Google error
                                   └► app/data/places.json (demo data)
```

- `app/api/places.php` runs in the existing LimeSurvey container (Apache + PHP). There is no new service and no Caddy change.
- The key stays on the server. Guests' phones only talk to your server, never to Google's API.
- Each refresh makes 6 Nearby Search calls in parallel: restaurants, cafés and sights, each in English and Persian. Results are merged, de-duplicated and sorted by distance.
- Results are cached in the container's temp folder for `PLACES_CACHE_TTL` seconds (default 900), so Google is called at most 6 times per 15 minutes, however many guests open the page. If Google fails, the last good result is served for up to 6 hours, then the demo list.
- Opening hours are evaluated in the complex's time zone (`HOTEL_TIMEZONE`), not the guest phone's.
- "Directions" opens Google Maps directions to the place. "Call" dials the place's number (hidden when Google has none). "Save" is still a demo button.

## What you need to do

### 1. Google Cloud project and billing

1. Open <https://console.cloud.google.com/>, create a project (for example "kowsar-guest-app") or pick an existing one.
2. **Billing → Link a billing account.** Places API calls require billing, even within the free monthly usage.

### 2. Enable the API

**APIs & Services → Library →** search **"Places API (New)"** (`places.googleapis.com`) **→ Enable.**
The older "Places API" is a different product and is not used.

### 3. Create and restrict the key

1. **APIs & Services → Credentials → Create credentials → API key.**
2. Open the key and set:
   - **API restrictions:** Restrict key → **Places API (New)** only.
   - **Application restrictions:** **IP addresses** → the public IP your server uses for outgoing traffic. For local testing, use your current public IP (`curl -s https://ifconfig.me`), or leave it unrestricted only while testing.
   - Do **not** use "HTTP referrers": the calls come from the server, not a browser.
3. Optional but recommended: **Places API (New) → Quotas** → cap "SearchNearby requests per day" (for example 500), so a bug or abuse can't run up a bill.

### 4. Put the key in `.env`

`.env` already has the lines (empty). Fill them in:

```bash
GOOGLE_PLACES_API_KEY=AIza...your key...
# Recommended: right-click the complex in Google Maps → click the coordinates to copy them.
HOTEL_LAT=32.xxxxxx
HOTEL_LNG=51.xxxxxx
```

If you leave `HOTEL_LAT`/`HOTEL_LNG` empty, the proxy looks the complex up once by name (`HOTEL_PLACE_QUERY`, default `مجتمع گردشگری کوثر ملکشهر اصفهان`) and keeps the result for 30 days. Check the `origin` it found (step 5); if it's wrong, set the coordinates.

Other settings (all optional, see `.env.example`): `PLACES_RADIUS_M` (2000), `PLACES_MAX_PER_CATEGORY` (12), `PLACES_CACHE_TTL` (900), `HOTEL_TIMEZONE` (Asia/Tehran), `PLACES_REGION_CODE` (IR).

Never commit the key. `.env` is git-ignored and `./scripts/validate.sh` fails if a Google key appears in any repository file.

### 5. Restart and check

```bash
docker compose up -d limesurvey          # picks up the new .env values
curl -s http://hotelsurvey.localhost/app/api/places.php | python3 -m json.tool | head -40
```

You should see `"source": "google"`, an `origin` near the complex, and a `places` list. Then open `http://hotelsurvey.localhost/app/nearby.html`: the "Demo data" badge is gone and "Google Maps" appears under the list.

If `"source"` is still `"demo"`, read `fallback_reason` and `google_status`:

| `fallback_reason` / `google_status` | Meaning | Fix |
|---|---|---|
| `not_configured` | No key reached the container | Check `.env`, then `docker compose up -d limesurvey` |
| `PERMISSION_DENIED` + `SERVICE_DISABLED` | Places API (New) not enabled | Step 2 |
| `PERMISSION_DENIED` + `API_KEY_SERVICE_BLOCKED` | Key restricted to other APIs | Step 3, API restrictions |
| `PERMISSION_DENIED` + `API_KEY_IP_ADDRESS_BLOCKED` | Server IP not in the key's allow list | Step 3, add the server's outgoing IP |
| `PERMISSION_DENIED` + `BILLING_DISABLED` | No billing account | Step 1 |
| `INVALID_ARGUMENT` + `API_KEY_INVALID` | Key mistyped | Copy it again |
| `RESOURCE_EXHAUSTED` | Quota reached | Raise the cap or wait for the reset |
| `NETWORK_ERROR`, `HTTP_0` | Container can't reach Google | Outbound internet, firewall, or region (see below) |
| `origin_not_found` | Name lookup found nothing | Set `HOTEL_LAT` and `HOTEL_LNG` |

Google's full error message is in the container log (never the key): `docker compose logs limesurvey | grep places.php`.

To force a fresh fetch (for example after changing the radius), changing any setting is enough: the cache key includes the settings. Otherwise wait for `PLACES_CACHE_TTL`.

## Cost

The request asks only for Pro and Enterprise fields (name, type, location, rating, review count, price level, opening hours, phone, address, Maps link). It does not ask for reviews, photos or summaries, which would move it to the more expensive "Atmosphere" tier.

- One refresh = 6 Nearby Search (New) requests, billed at the **Enterprise** SKU because of rating, hours and phone.
- The name lookup (only when no coordinates are set) = 1 Text Search (New) request per 30 days.
- With the default 15-minute cache, the worst case while the app is in constant use is 24 refreshes per 6 hours, about 576 requests a day. A demo uses far fewer.

Google gives free monthly usage per SKU. Check current prices and free caps at <https://developers.google.com/maps/billing-and-pricing/pricing>, and set the quota cap in step 3.

## Google's display and caching rules (already handled)

- **Attribution.** Places data shown without a Google map must carry "Google Maps". The app shows the text "Google Maps" under the list, under the Home highlights and in the place sheet: sans-serif, regular weight, Google's grey, not translated (`translate="no"`). When Google names third-party data providers, they're listed next to it.
- **No reviews or photos** are shown, so no author credits are needed.
- **Caching.** Google allows storing place IDs indefinitely and coordinates for up to 30 days. Other content is subject to the caching limits in the Google Maps Platform Terms. The proxy keeps results only briefly (`PLACES_CACHE_TTL`, default 15 minutes, plus the 6-hour fallback on errors) to limit cost and keep the demo stable. If you want stricter behaviour, lower `PLACES_CACHE_TTL` (minimum 60 s).

## Availability in Iran: check before relying on it

Google Maps Platform's terms exclude sanctioned territories, and Iran is one of them. Requests sent from servers in Iran, or from billing accounts set up there, may be refused. In practice:

- If the server that runs this app is outside Iran and your Google account complies with Google's terms, the setup above works as described.
- If the production server is in Iran, expect `NETWORK_ERROR` or `PERMISSION_DENIED`. The app then falls back to the demo list, so the demo itself never breaks.
- A local provider (for example Neshan or Balad, which have place-search APIs and cover Iran well) can replace Google. Only `app/api/places.php` would change; the app reads the same JSON shape either way.

## Response format (for developers)

`GET /app/api/places.php` takes no parameters and returns:

| Field | Notes |
|---|---|
| `source` | `"google"` or `"demo"` |
| `fallback_reason`, `google_status`, `google_reason` | Only when `source` is `demo` |
| `stale` | `true` when an older Google result is served because Google failed |
| `timezone` | IANA zone used for opening hours |
| `radius_m`, `origin` | Search radius and centre (`resolved_by`: `env` or `text_search`) |
| `attribution`, `providers` | "Google Maps" and any third-party data providers |
| `highlights` | Up to 3 place IDs (one per category) for the Home strip |
| `places[]` | `id`, `category` (`restaurant`/`cafe`/`poi`), `name{en,fa}`, `address{en,fa}`, `distance_m`, `rating`, `rating_count`, `price` (1–4), `opening{always, periods[[openMin, closeMin]]}` (minutes from Sunday 00:00), `tags{en[],fa[]}`, `phone`, `phone_display`, `maps_url`, `directions_url` |

The demo file uses the older `hours: [open, close]` and `description{en,fa}` fields. `app/js/places.js` reads both shapes.

Run the proxy from the command line (pretty-printed): `docker compose exec limesurvey php /var/www/html/app/api/places.php`.
