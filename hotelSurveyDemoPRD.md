# Demo PRD: Hotel Guest App (single iteration)

**Version:** Demo 1.0
**Status:** Active. Replaces `hotelSurveyPRD.md` for the current iteration
**Goal:** A presentable demo that looks and feels like a mobile app, finished in one iteration
**Full MVP spec:** `hotelSurveyPRD.md` (kept for later; everything it lists that's not here is deferred, not dropped)

---

## 1. What the demo shows

A guest opens the hotel app on their phone and can:

1. **Rate their stay.** This is the existing nine-question LimeSurvey survey (Milestone 2), now inside the app shell.
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
- Primary card: "Rate your stay, 2 minutes" → starts the survey.
- Quick-action grid (mock): Room service, Housekeeping, Wi-Fi, Late checkout, Concierge, Spa.
- "Nearby highlights" strip: three places from the Nearby data → opens Nearby.

### D-03 Survey (existing, re-skinned)

- The current LimeSurvey survey, questions and rules unchanged: Q1–Q6 rated 1–5, Q7 0–10, Q8–Q9 optional text. Required validation, progress bar, Back/Continue, thank-you screen.
- Only the theme changes: app bar, drawer and bottom tab bar added. Question screens are restyled as app cards.
- The thank-you screen gets two buttons: "Back to home" and "Explore nearby".
- No room token or QR code.

### D-04 Nearby places

- List of 18–24 **mock** places, each with: name (en and fa), category, distance (m) and walking time, rating (1–5), price level (1–3), opening hours and open-now flag, a short description (en and fa), and tags.
- Categories: **Restaurants, Cafés, Points of interest**.
- **Search:** by name and tag, as you type, in the current language.
- **Filters:** category chips (All / Restaurants / Cafés / Places of interest), "Open now" toggle, sort (Distance / Rating).
- **Detail view:** bottom sheet with full info and mock buttons (Directions, Call, Save).
- Empty state when nothing matches ("No places match. Clear filters").
- No maps, photos or third-party APIs. Category icons are inline SVG. Data is a static JSON file clearly marked as demo data.

### D-05 Dashboard (simple)

- **KPI tiles:** total completed responses, average overall stay (Q1), NPS (Q7: % promoters 9–10 minus % detractors 0–6).
- **Category bars:** average of Q1–Q6 on a 1–5 scale, each with its response count.
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

Keeps the existing tokens (`limesurvey/themes/hotel-classic/css/tokens.css`) and fonts. Classic hotel palette, with gold for accents and selected states only.

Changes towards "app, not website":

| Element | Spec |
|---|---|
| App bar | 56px, ivory surface, subtle bottom border, title centred on mobile |
| Bottom tab bar | 64px + safe-area inset, icon + label, active tab in gold, centre "Rate" tab raised |
| Drawer | Slides from the start edge (right in RTL), dimmed backdrop, closes on backdrop tap or Esc |
| Cards | 12px radius, white surface, soft shadow, 16px padding |
| Lists | Full-width rows with leading icon, trailing chevron or meta |
| Chips | 36px visual height, 48px touch target, gold outline when selected |
| Bottom sheet | Rounded top corners, drag handle (visual), closes on backdrop tap |
| Toast | Bottom, above tab bar, auto-hides after 2s |
| Motion | Only drawer, sheet and toast transitions (≤200ms), respects `prefers-reduced-motion` |

Rules that still apply: touch targets ≥ 48px, no horizontal scrolling from 320px, no hex values outside `tokens.css`, no third-party fonts or assets, minimal JavaScript (vanilla, no framework, no build step).

## 4. Technical approach

```
Browser ──► hotelsurvey.localhost/app/*.html   static app (Home, Nearby, Dashboard)
        └─► hotelsurvey.localhost/index.php/…  LimeSurvey survey, same shell via theme
                                                    │
scripts/build-dashboard.py ── reads (read-only) ────┘ writes app/data/dashboard.json
```

- **Static app** in `app/` (HTML, CSS, vanilla JS, JSON). Mounted read-only into the LimeSurvey container at `/var/www/html/app`, so it's served by the same Apache with no new container and no Caddy change.
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
- Real maps, real place data, photos, booking, any working Services feature.
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
