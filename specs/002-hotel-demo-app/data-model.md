# Data Model: Hotel Guest App Demo

No database table is created or changed. The feature reads LimeSurvey's response table (read-only), writes two static JSON files for the app (one committed, one generated), and stores one value in the guest's browser. Formats are fixed in `contracts/`.

## 1. Survey response (existing, read-only)

Owner: LimeSurvey. Table `lime_survey_420001`. Written only by the survey engine (guests and the seed job through the public survey).

| Field | Column | Read by the dashboard job? | Notes |
|---|---|---|---|
| id | `id` | No (never selected or output) | |
| Submission time | `submitdate` | Yes, filter only | NULL = incomplete (excluded, FR-030). Written in PHP's zone (UTC) |
| Language | `startlanguage` | Yes, counted | `en` or `fa`; anything else counted as `other` |
| Q1 Overall stay … Q6 Facilities | `420001X1X1` … `420001X1X6` | Yes, counted and summed in SQL | Codes `'1'`–`'5'`; other values ignored |
| Q7 Recommend | `420001X1X7` | Yes, bucketed in SQL | Codes `'0'`–`'10'` |
| Q8 Liked, Q9 Improve | `420001X1X8`, `420001X1X9` | **Never** | Sensitive comment text (FR-029, AGENTS.md) |
| `lastpage`, `seed`, `startdate`, `datestamp` | | No | |

Column names are resolved at run time from `lime_questions` by question code (`Q1OVERALL` … `Q7RECOMMEND`), research R-08.

State (engine-managed, unchanged from spec 001): *not started* → *started* (row created when the guest leaves the welcome screen) → *completed* (`submitdate` set). Leaving mid-survey leaves a *started* row, never counted.

## 2. Survey session (engine-managed, observed by the theme)

Not stored by this feature. The theme reads the screen type from `aSurveyInfo.include_content` and derives the shell state:

| Screen (`include_content`) | Shell state | Drawer language switch | Tab bar active |
|---|---|---|---|
| `firstpage` (welcome) | `welcome` | Enabled: links reload the welcome screen with `?lang=` | Rate |
| question screens (`main`, any other value) | `in-progress` | Disabled + note `d.langLocked` | Rate |
| `submit` (thank-you) | `completed` | Enabled: stores the language and opens Home | Rate |

The session's language is `aSurveyInfo.languagecode`. The survey shell always renders in it (FR-015), whatever the app preference is.

## 3. Language preference (browser)

| Field | Value |
|---|---|
| Storage | `localStorage`, key `hotel.lang` (same origin for `/app/*` and `/index.php/*`) |
| Values | `en` \| `fa`. Any other stored value is ignored |
| Default (no value, or storage blocked) | `fa` if `fa` ranks above `en` in `navigator.languages`, else `en` (spec 001 FR-005 rule) |
| Written by | App drawer switch; survey welcome screen when the URL has `lang`; survey thank-you switch |
| Read by | App pages on load; survey welcome-screen alignment script |
| Not written by | Question screens, resumed sessions (a resumed session never changes the preference) |

Derived: `dir = rtl` for `fa`, `ltr` for `en`; set on `<html lang dir>` by the app, by LimeSurvey on survey pages.

## 4. Place (mock, committed)

File: `app/data/places.json`, schema `contracts/places.schema.json`. 21 places (the prototype's set, A-07), `"demo": true` at the top level.

| Field | Type | Rule |
|---|---|---|
| `id` | integer | Unique, ≥ 1 |
| `category` | `"restaurant"` \| `"cafe"` \| `"poi"` | |
| `name` | `{ en, fa }` strings | Non-empty both |
| `distance_m` | integer | 1–10000. Walking time = `max(1, round(distance_m / 80))` min |
| `rating` | number | 1.0–5.0, one decimal |
| `price` | integer | 1–3 |
| `hours` | `[open, close]` numbers | `0 ≤ open < close ≤ 48`; `close > 24` = after midnight; `[0, 24]` = 24 h |
| `tags` | `{ en: string[], fa: string[] }` | ≥ 1 each, same length |
| `description` | `{ en, fa }` strings | Non-empty both |

Top level also has `note` (a sentence saying the places are fictional demo data, FR-016) and `highlights: [8, 1, 17]` (A-08: one café, one restaurant, one point of interest), each an existing `id`.

Derived at run time (not stored): `openNow` (research R-12, device local time), `walkMin`, display distance (`m` below 1000, else `km` with one decimal), folded search text (research R-11).

## 5. Strings (new or shared keys)

Source tables: `app/js/i18n.js` (app) and `limesurvey/themes/hotel-classic/views/subviews/hotel/i18n.twig` (survey). All prototype `S` keys are carried over as they are. Keys marked **shared** must exist in both files with identical text (research R-17). Persian is a proposal pending the open Persian copy review.

| Key | English | Persian (proposed) | Shared |
|---|---|---|---|
| `menu`, `notifications` | Menu / Notifications | منو / اعلان‌ها | yes |
| `tab.home` … `tab.services` | Home / Nearby / Rate / Dashboard / Services | خانه / اطراف / نظرسنجی / داشبورد / خدمات | yes |
| `nav.main` (tab bar label) | Main | منوی اصلی | yes |
| `title.rate` | Rate your stay | نظر شما دربارهٔ اقامت | yes |
| `d.mystay`, `d.room`, `d.wifi`, `d.settings`, `d.soon` | as prototype | as prototype | yes |
| `d.lang`, `d.langLocked` | Language / Locked while the survey is open | زبان / تا پایان نظرسنجی قابل تغییر نیست | yes |
| `demo` | Demo build · placeholder brand | نسخهٔ نمایشی · نام تجاری موقت | yes |
| `soon` | Coming soon in the full app | به‌زودی در نسخهٔ کامل | yes |
| `lang.en`, `lang.fa` | English / فارسی | English / فارسی | yes |
| `brand.en`, `brand.fa`, `tagline` | as `i18n.twig` `brand.*` | as `i18n.twig` | yes (Twig keeps its `brand.*` names; the parity test maps them) |
| `s.time`, `s.anon`, `s.q9`, `s.langNote` | About 2 minutes / Anonymous / 9 questions / The survey stays in English once you start. | حدود ۲ دقیقه / بدون نام / ۹ پرسش / پس از شروع، نظرسنجی به فارسی می‌ماند. | survey only (Twig) |
| `s.done.home`, `s.done.nearby` | Back to home / Explore nearby | بازگشت به خانه / گشتی در اطراف | survey only (Twig) |
| `n.m`, `n.km` | %1 m / %1 km | %1 متر / %1 کیلومتر | app only |
| `n.24h` | Open 24 hours | شبانه‌روزی | app only |
| `n.sheet` (sheet dialog label) | Place details | جزئیات مکان | app only |
| `db.unavailable` | Dashboard data is not available yet. Start the refresh job and wait a few seconds. | دادهٔ داشبورد هنوز آماده نیست. فرایند به‌روزرسانی را اجرا کنید و چند لحظه صبر کنید. | app only |
| `db.stale` | Not refreshed since %1. Is the refresh job running? | از %1 به‌روزرسانی نشده است. آیا فرایند به‌روزرسانی در حال اجراست؟ | app only |
| `db.cat.overall` … `db.cat.facilities` | Overall stay / Cleanliness / Comfort / Staff / Breakfast / Facilities | اقامت کلی / تمیزی اتاق / راحتی اتاق / کارکنان / صبحانه / امکانات | app only |

## 6. Dashboard snapshot (generated, not committed)

File: `app/data/dashboard.json`, written by `scripts/build-dashboard.py`, schema `contracts/dashboard.schema.json`, semantics `contracts/dashboard-data.md`. Git-ignored.

```
Snapshot
├── schemaVersion: 1
├── generatedAt: UTC ISO 8601 (DB NOW() of the cycle)
├── surveyId: 420001
└── ranges: { "7d": Range, "30d": Range, "all": Range }

Range
├── total: completed responses in range
├── languages: { en, fa, other }          counts
├── categories: [6 × Category]             fixed order Q1..Q6
└── nps: { n, promoters, passives, detractors, score }

Category
├── key: overall | cleanliness | comfort | staff | breakfast | facilities
├── code: Q1OVERALL … Q6FACILITIES
├── n: answered count
├── sum: sum of answer codes
└── avg: one decimal, half-up, null when n = 0
```

Validation rules: no other keys anywhere (allow-list, FR-029); every count is an integer ≥ 0; `languages.en + fa + other = total`; `nps.promoters + passives + detractors = nps.n`; `score` in −100…100 or null; `avg` in 1.0…5.0 or null. Ranges are nested sets on the same clock: `7d.total ≤ 30d.total ≤ all.total`.

Lifecycle: absent until the job first succeeds → replaced atomically every cycle → left unchanged when a cycle fails (stale after 60 s in the browser).

## 7. Ephemeral UI state (not stored)

| Screen | State | Initial | Reset |
|---|---|---|---|
| Nearby | `q` (search), `cat` (`all` \| `restaurant` \| `cafe` \| `poi`), `open` (bool), `sort` (`dist` \| `rating`) | `''`, `all`, `false`, `dist` | "Clear filters" resets `q`, `cat`, `open` (sort kept, as the prototype) |
| Nearby | open sheet place id | from `#place=<id>` hash, else none | backdrop, Esc |
| Dashboard | range (`7d` \| `30d` \| `all`) | `30d` (prototype default) | page load |
| Shell | drawer open, toast timer | closed | navigation, Esc, backdrop |

Sort order: `dist` ascending by `distance_m`, ties by `id`; `rating` descending, ties by `distance_m` then `id` (stable, testable).
