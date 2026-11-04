# Contract: app screens (`app/`)

Static files served at `http://hotelsurvey.localhost/app/…` (read-only mount, research R-01). Vanilla HTML, CSS and JS, no build step, no framework, no third-party request. Each page = shell (`app-shell.md`) + one screen. Visual and string reference: `prototype/index.html` (`home()`, `nearby()`, `dash()`).

## 1. Files

```
app/
├── index.html        Home            (title.home, Home tab current)
├── nearby.html       Nearby          (title.nearby, Nearby tab current)
├── dashboard.html    Dashboard       (title.dash, Dashboard tab current)
├── css/app.css       screen styles (cards, chips, list, sheet, KPI, bars); var(--…) only
├── js/i18n.js        string tables en/fa, t(key, …args), num(x, decimals), fold(s)
├── js/app.js         SURVEY_URL, renderShell(route), applyLang(), loadJSON(url)
├── js/home.js
├── js/nearby.js
├── js/dashboard.js
└── data/
    ├── places.json       committed, DEMO DATA (places.schema.json)
    └── dashboard.json    generated, git-ignored (dashboard.schema.json)
```

Each HTML file contains only the `<head>` from `app-shell.md` §1, an empty shell mount and `<main id="hs-main">`, and the scripts. With JavaScript off, a translated `<noscript>` line (both languages) says the app needs JavaScript.

Common page behaviour: on load, `applyLang(HotelShell.getLang())` sets `<html lang dir>`, renders shell and screen; on `hotel:langchange`, re-render shell and screen in place with state kept (search text, filters, range) and the drawer left open.

## 2. Home (`index.html`, FR-008 to FR-011)

| Block | Content | Action |
|---|---|---|
| Hero card | greeting by local hour (`greet.m` < 12, `greet.a` < 17, else `greet.e`), wordmark, Persian name, tagline | none |
| Rate card | star icon, `home.rate.t`, `home.rate.d`, chevron (flips in RTL); gold 2px border | `<a href="/index.php/420001">` |
| Hotel services | `home.services` heading, 3 × 2 grid: Room service, Housekeeping, Wi-Fi, Late checkout, Concierge, Spa | each `data-soon` (toast) |
| Nearby highlights | `home.nearby` heading + `seeAll` link to `/app/nearby.html`; horizontal strip of the 3 `highlights` places (category pill, name, rating, distance) | each `<a href="/app/nearby.html#place=<id>">` |
| Bell (app bar) | | toast |

The horizontal strip scrolls inside itself; the page never scrolls horizontally (FR-038).

## 3. Nearby (`nearby.html`, FR-016 to FR-021)

Controls (in order): search field (`n.search` placeholder and label, `type="search"`), category chips All / Restaurants / Cafés / Places of interest (`aria-pressed`, single select, row scrolls inside itself), Open now switch (`role="switch"`, `aria-checked`), sort segmented control Nearest / Top rated (`aria-pressed`).

List: result count `n.results` + `n.demo` pill, then rows: category icon, name (current language), rating, distance, price (`$`×price), Open/Closed pill, chevron. Each row is a button opening the sheet.

Filtering (all conditions combined, updated on every `input` event and control change, no debounce needed for 21 items):

```
match(p) = (cat == 'all' || p.category == cat)
        && (!open || openNow(p))
        && (fold(q) == '' || any(fold(s).includes(fold(q)) for s in [name.en, name.fa, ...tags.en, ...tags.fa]))
```

`fold()` and `openNow()` per research R-11 and R-12. Sort per `data-model.md` §7.

Empty state (no match): search icon, `n.empty.t`, `n.empty.d`, button `n.clear` → resets search, category and Open now, keeps sort, focuses the search field.

Detail sheet (`.hs-sheet`, `role="dialog"`, `aria-modal`, labelled by the place name): drag handle (visual), category label, name, rating, walking time (`n.min`), price, open pill, description, hours (`n.hours`: `HH:MM – HH:MM` or `n.24h`), tag pills, three buttons Directions / Call / Save (`data-soon`). Closes on scrim tap or Esc. Opening from Home: `#place=<id>` opens that place's sheet after the list renders; an unknown id is ignored.

## 4. Dashboard (`dashboard.html`, FR-022 to FR-027, FR-031)

Rendered from `data/dashboard.json` per `dashboard-data.md` §3. Order: label `db.view` + range chips (`db.7`, `db.30`, `db.all`, `aria-pressed`), optional low-sample / stale note, KPI row (Responses, Overall stay, NPS), NPS card, category card (six rows, each with its own `n`), language card, footer (`db.privacy`, `db.updated`). No login (FR-031). The page never fetches anything other than `data/dashboard.json`.

## 5. Formatting

- Numbers through `num()` (`Intl.NumberFormat` `fa-IR` / `en-US`), research R-13.
- Distances: `< 1000` → `n.m`; else `n.km` with one decimal.
- All text inserted with `textContent` or escaped; data from JSON files is never inserted as raw HTML.
