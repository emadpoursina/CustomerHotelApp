# Demo PRD: Hotel Guest App (single iteration)

**Version:** Demo 1.1 (2026-11-06: Kowsar Malekshahr brand, live nearby places from Neshan)
**Status:** Active. Replaces `hotelSurveyPRD.md` for the current iteration
**Goal:** A presentable demo that looks and feels like a mobile app, finished in one iteration
**Full MVP spec:** `hotelSurveyPRD.md` (kept for later; everything it lists that's not here is deferred, not dropped)

---

## 1. What the demo shows

A guest opens the hotel app on their phone and can:

1. **Leave feedback.** Two-step LimeSurvey: pick a department, then an optional comment.
2. **Browse nearby places.** Restaurants, cafés and points of interest, with search and filters.
3. **See a simple dashboard.** Live satisfaction numbers from submitted surveys (the manager view, shown in the same app for the demo).

The app should look like a native mobile app, not a website: a top app bar with a hamburger menu, a bottom tab bar, cards, and mock buttons for features that aren't built.

## 2. In scope

### D-01 App shell (every screen, including the survey)

- **Top app bar:** hamburger icon (start side), screen title, hotel wordmark or icon.
- **Hamburger drawer:** hotel name, menu items (Home, Rate your stay, Nearby, Dashboard), mock items (My stay, Room service, Wi-Fi, Settings), language switch (English / فارسی), a "Demo" label.
- **Bottom tab bar** (fixed, safe-area aware, 5 tabs): Home · Nearby · Rate (centre, accented) · Dashboard · Services (mock).
- **Mock buttons** show a small "Coming soon" toast. They never navigate to a broken page.
- The language switch is disabled during the survey. The survey language stays fixed once it starts (existing rule).
- Phone frame: on desktop widths, the app is centred in a phone-width column (max 430px) so it presents like a device.

### D-02 Home screen

- Welcome card with the hotel name and tagline.
- Primary card: "Rate your stay, 1 minute" → starts the survey.
- Quick-action grid (mock): Room service, Housekeeping, Wi-Fi, Late checkout, Concierge, Spa.
- "Nearby highlights" strip: three places from the Nearby data → opens Nearby.

### D-03 Survey (existing, re-skinned)

- Two-step LimeSurvey: required department cards, then one optional comment. Progress bar, Back/Continue, thank-you screen.
- Only the theme changes: app bar, drawer and bottom tab bar added. Question screens are restyled as app cards.
- The thank-you screen gets two buttons: "Back to home" and "Explore nearby".
- No room token or QR code.

### D-04 Nearby places

- **Live places from the Neshan Maps Platform** (Nearby Search and POI Details) within `PLACES_RADIUS_M` (default 2 km) of the complex, fetched server-side by `app/api/places.php` (key in `.env`, never sent to the browser). Each place has: name, category, distance (m) and walking time, opening hours and open-now (in the complex's time zone), address and phone. Neshan does not provide ratings, price level, tags or reviews, so these are not shown. Setup: `docs/neshan-places.md`.
- **Fallback:** without a key, or when Neshan fails, the 21 mock places in `app/data/places.json` are shown with a "Demo data" badge. The screen never breaks.
- Categories: **Restaurants, Cafés, Points of interest**.
- **Search:** by name and address, as you type.
- **Filters:** category chips (All / Restaurants / Cafés / Places of interest), "Open now" toggle. Sorted by distance.
- **Detail view:** bottom sheet with today's hours, address and phone. With Neshan data, Call dials the place when a phone number is listed; Directions and Save are mock buttons.
- Empty state when nothing matches ("No places match. Clear filters").
- No embedded maps, place photos or reviews. Category icons are inline SVG. Loading and error states (with Retry) are shown.

### D-05 Dashboard (simple)

- **KPI tiles:** total completed responses (by date range and department). Score tiles are omitted while the survey has no ratings.
- **Language split:** en vs fa share.
- **Date filter:** chips for Last 7 days / Last 30 days / All.
- **Small-sample note:** when n < 10, show "Low sample, treat with care".
- "Last updated" time.
- **Aggregates only.** No guest comment text, no individual responses (AGENTS.md: guest comments are sensitive).
- Data source: a host-side script reads LimeSurvey's response table **read-only** and writes `app/data/dashboard.json`. Running it with `--watch` refreshes the file every 10 seconds, so a survey submitted during the demo shows up within seconds.
- No login in the demo. The dashboard is visible to anyone who can reach the local URL. It's local only and has no personal data.

### D-06 Languages

- English and Persian, with RTL for Persian, across the whole app: shell, Home, Nearby, Dashboard, survey.
- The language choice persists across tabs (stored in the browser).

### D-07 Demo data

- A seed script submits about 40 realistic fake responses **through the public survey** (no direct writes to LimeSurvey tables). Answers are varied, both languages are used, and dates are spread over 30 days where LimeSurvey allows it.
- Mock places JSON (D-04).

## 3. Design

Brand: **Kowsar Malekshahr Complex (مجتمع کوثر ملکشهر)**, `docs/brand.md`. Tokens in `limesurvey/themes/hotel-classic/css/tokens.css`: cream background `#F4EBDD`, lapis primary `#214F72`, sea blue `#214F68`, sand gold `#C6A15B` for accents and selected states only. Brand mark (arch over water) and a photo of the complex on Home and the survey welcome card. Fonts are self-hosted: Cormorant Garamond (Latin headings), Inter, Vazirmatn (Persian).

Changes towards "app, not website":

| Element | Spec |
|---|---|
| App bar | 56px, cream surface, subtle bottom border, brand mark and lapis title centred |
| Bottom tab bar | 64px + safe-area inset, icon + label, active tab in lapis with a gold indicator, centre "Rate" tab raised (lapis, gold when active) |
| Drawer | Slides from the start edge (right in RTL), dimmed backdrop, closes on backdrop tap or Esc |
| Cards | 16px radius, warm white surface, soft shadow, 16–20px padding |
| Lists | Full-width rows with leading icon, trailing chevron or meta |
| Chips | 36px visual height, 48px touch target, lapis fill with a gold ring when selected |
| Bottom sheet | Rounded top corners, drag handle (visual), closes on backdrop tap |
| Toast | Bottom, above tab bar, auto-hides after 2s |
| Motion | Only drawer, sheet and toast transitions (≤200ms), respects `prefers-reduced-motion` |

Rules that still apply: touch targets ≥ 48px, no horizontal scrolling from 320px, no hex values outside `tokens.css`, no third-party fonts or front-end assets, minimal JavaScript (vanilla, no framework, no build step). The only third-party call is the server-side Places request.

## 4. Technical approach

```
Browser ──► hotelsurvey.localhost/app/*.html   static app (Home, Nearby, Dashboard)
        └─► hotelsurvey.localhost/index.php/…  LimeSurvey survey, same shell via theme
                                                    │
scripts/build-dashboard.py ── reads (read-only) ────┘ writes app/data/dashboard.json
```

- **Static app** in `app/` (HTML, CSS, vanilla JS, JSON). Mounted read-only into the LimeSurvey container at `/var/www/html/app`, so it's served by the same Apache with no new container and no Caddy change.
- **Places proxy:** `app/api/places.php`, the only server-side code, runs on the same Apache/PHP. It calls Neshan with the key from `.env`, caches briefly in the container's temp folder and falls back to `app/data/places.json`.
  - Links must name the file (`/app/index.html`). LimeSurvey's rewrite sends bare directory URLs to `index.php`.
- **Shared styling:** the app uses the theme's `tokens.css` and `fonts/` (one source of design tokens). The shell markup is duplicated in the theme's Twig header/footer and in the app pages, so it's kept small.
- **Survey:** LimeSurvey unchanged. Only the `hotel-classic` theme files change.
- **Dashboard script:** Python 3, standard library only. Queries the database via `docker compose exec db mariadb`. No new web backend.
- **Seed script:** Python 3, submits through the public survey URL.
- Not touched: LimeSurvey core files and core tables (read-only access only).

## 5. Out of scope for the demo (deferred)

From `hotelSurveyPRD.md`, deferred to after the demo:

- QR codes, room registry, room tokens, token validation, room filter (Milestone 3). The `hotel_rooms` table stays as-is, unused.
- Exports and full reporting (Milestone 4). LimeSurvey's own admin statistics and export still work if needed.
- Production deployment, HTTPS, admin IP restriction, backup restore test, GDPR policy, real branding (Milestone 5 and `docs/decisions.md` §2). None are resolved by this demo.
- Embedded maps, place photos and reviews, booking, any working Services feature.
- Dashboard authentication.

## 6. Acceptance criteria (demo is done when)

- [ ] On a 360–430px viewport, every screen shows the app bar and bottom tab bar, and the hamburger drawer opens and closes.
- [ ] All five tabs respond: four navigate, Services shows "Coming soon". Every mock button shows the toast.
- [ ] Home → Rate starts the survey. The survey runs to the thank-you screen with the existing validation. "Back to home" works.
- [ ] Nearby: search narrows results as you type. Category chips, Open now and sort all work, alone and combined. The detail sheet opens. The empty state shows.
- [ ] Dashboard shows total, average, NPS and six category bars with counts, and the numbers match a manual SQL check. The date chips change the numbers. The low-sample note shows when n < 10.
- [ ] A survey submitted during the demo appears on the dashboard within about 15 seconds while `--watch` is running.
- [ ] English and Persian work on every screen. Persian is RTL, including the drawer side.
- [ ] No horizontal scroll at 320px. Touch targets ≥ 48px. `./scripts/validate.sh` passes.
- [ ] On desktop, the app is presented in a centred phone-width column.

## 7. Build order (one iteration)

1. Shared shell CSS and JS (app bar, drawer, tab bar, toast, i18n, phone column), using the theme tokens.
2. Home screen.
3. Nearby: mock data, list, search, filters, sort, sheet.
4. Survey theme: add the shell to the Twig header/footer, card restyle, thank-you buttons.
5. Dashboard script (`--watch`) and dashboard page.
6. Seed script and demo data.
7. Walkthrough at 320 / 390 / 430 / desktop in en and fa, then `validate.sh`.

## 8. Demo-day checklist

- `docker compose up -d`
- `python3 scripts/build-dashboard.py --watch` (leave running)
- Open `http://hotelsurvey.localhost/app/index.html` in Chrome device mode (iPhone 14 or Pixel 7). A real phone needs the LAN hostname from `docs/decisions.md` §2 item 5.
- Script: Home → Nearby (search "cafe", filter Open now) → Rate (submit) → Dashboard (count goes up).
