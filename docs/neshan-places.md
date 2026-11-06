# Nearby places: Neshan setup

The Nearby screen and the Home "Nearby highlights" strip read live restaurants, cafés and parks from the **Neshan Maps Platform** (Nearby Search and POI Details). The app is built. It needs your API key, the service enabled, and the complex's coordinates.

Until a key is set, the app shows the bundled demo list (`app/data/places.json`, marked "Demo data"), so nothing breaks.

## How it works

```
Phone ──► /app/nearby.html ──► /app/api/places.php ──► api.neshan.org (server-side, key from .env)
                                   │  no key / Neshan error
                                   └► app/data/places.json (demo data)
```

- `app/api/places.php` runs in the existing LimeSurvey container (Apache + PHP). No new service, no Caddy change.
- The key stays on the server. It is sent in the `Api-Key` header.
- Each refresh makes one Nearby Search per category (restaurant, café, park) within `PLACES_RADIUS_M` of the complex, then one POI Details call per place for phone, address and opening hours.
- The result is cached in the container's temp folder for `PLACES_CACHE_TTL` seconds (default 900). If Neshan fails, the last good result is served for up to 6 hours, then the demo list.
- Opening hours are evaluated in the complex's time zone (`HOTEL_TIMEZONE`), not the guest phone's.

## What Neshan provides, and what the app shows

| App field | Neshan source | Notes |
|---|---|---|
| Name | Nearby `name` | Persian only. The English UI shows the Persian name. |
| Category | Which Nearby layer returned it | `restaurant`, `cafe`, `park` |
| Distance, walking time | Nearby `distance` (metres), `duration` (seconds) | Travel distance, not straight-line. Mode of `duration` not stated. |
| Address | POI Details `address` | Persian only |
| Phone | POI Details `phoneNumber` | Hidden when empty |
| Opening hours, open now | POI Details `workHours` | "Hours not listed" when empty |

Removed because Neshan does not provide them: ratings, review counts, price level, tags, Google Maps links, directions links, and the sort-by-rating option. The Directions button is a mock button until a Neshan directions link is chosen.

## What you need to do

1. **Create a key.** In the Neshan developer panel, create an API key.
2. **Enable the services.** Neshan says Nearby and POI Details must be enabled by a support ticket in the user panel. Ask for both.
3. **Confirm limits.** Ask support (platform@neshan.org) for the per-request prices, monthly quota, per-minute rate limit, and whether the data may be cached. Also check the Terms of Service (`/tos/`) for caching and attribution rules.
4. **Put the key and coordinates in `.env`.**

   ```bash
   NESHAN_API_KEY=your-key-here
   # Right-click the complex in Neshan (or Google) Maps and copy the coordinates.
   HOTEL_LAT=32.xxxxxx
   HOTEL_LNG=51.xxxxxx
   ```

   Never commit the key. `.env` is git-ignored.
5. **Restart and check.**

   ```bash
   docker compose up -d limesurvey
   curl -s http://hotelsurvey.localhost/app/api/places.php | python3 -m json.tool | head -40
   ```

   You should see `"source": "neshan"` and a `places` list. Then open `http://hotelsurvey.localhost/app/nearby.html`: the "Demo data" badge is gone.

If `"source"` is still `"demo"`, read `fallback_reason` and `neshan_status`:

| `fallback_reason` | Meaning | Fix |
|---|---|---|
| `not_configured` | No key reached the container | Check `.env`, then `docker compose up -d limesurvey` |
| `no_location` | `HOTEL_LAT` or `HOTEL_LNG` is missing or invalid | Set both coordinates |
| `neshan_error` + `KEY_NOT_FOUND` (480) | Key missing or invalid | Copy the key again |
| `neshan_error` + `SERVICE_NOT_ENABLED` (485) | Nearby or POI Details not enabled | Support ticket (step 2) |
| `neshan_error` + `KEY_SCOPE_ERROR` (484) | Key not allowed to use this service | Support ticket |
| `neshan_error` + `LIMIT_EXCEEDED` (481) | Quota reached | Ask support to raise it |
| `neshan_error` + `RATE_EXCEEDED` (482) | Per-minute limit reached | Wait; raise `PLACES_CACHE_TTL` |
| `neshan_error` + `NETWORK_ERROR` | Container cannot reach Neshan | Outbound internet, firewall |

Neshan's error text is in the container log, never the key: `docker compose logs limesurvey | grep places.php`.

## Cost

- One refresh = 3 Nearby Search calls, plus up to 3 × `PLACES_MAX_PER_CATEGORY` POI Details calls (36 at the default of 12).
- With the default 15-minute cache, a busy app makes at most about 96 refreshes a day, so the worst case is roughly 3,700 calls a day. Lower `PLACES_MAX_PER_CATEGORY` to reduce this.
- Check the real prices in the Neshan panel before going live.

## Not yet verified against the live API

These were written from the Neshan docs and a local fake server. Check them with the first live response:

- **`workHours` format.** The docs show the shape `[{ day, ranges: [{ start, end }] }]` but not the value types. The code assumes English day names (`"saturday"`) and `"HH:MM"` times. If the live data differs, fix `opening()` in `app/api/places.php`.
- **Layer slugs.** `restaurant`, `cafe`, `park` come from the docs' example list. Confirm them with a live call.
- **Persian and English names.** Neshan names appear to be Persian only. If an English name exists in POI Details, use it.

## Response format (for developers)

`GET /app/api/places.php` takes no parameters and returns:

| Field | Notes |
|---|---|
| `source` | `"neshan"` or `"demo"` |
| `fallback_reason`, `neshan_status` | Only when `source` is `demo` |
| `stale` | `true` when an older result is served because Neshan failed |
| `timezone` | IANA zone used for opening hours |
| `radius_m`, `origin` | Search radius and centre |
| `highlights` | One place ID per category (the nearest) for the Home strip |
| `places[]` | `id`, `category` (`restaurant`/`cafe`/`poi`), `name{en,fa}`, `address{en,fa}`, `distance_m`, `duration_s`, `opening{always, periods[[openMin, closeMin]]}` (minutes from Sunday 00:00), `phone`, `phone_display` |

The demo file uses `hours: [open, close]`. `app/js/places.js` reads both shapes.

Run the proxy from the command line: `docker compose exec limesurvey php /var/www/html/app/api/places.php`.
