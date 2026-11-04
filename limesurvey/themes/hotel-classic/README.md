# hotel-classic: LimeSurvey child theme (Milestone 2)

**Development placeholder brand.** The name "Paradise Garden Hotel" / باغ پردیس and the tagline are placeholders from `docs/brand.md`. They are not cleared for production. Replace them before launch (see "Brand replacement"). Turn the on-page notice off at launch (see "Placeholder notice").

The theme extends the stock `vanilla` theme of LimeSurvey CE 6.17.18. It is mounted into the container at `upload/themes/survey/hotel-classic` by `docker-compose.yml`. No LimeSurvey core file is changed.

## File structure

| Path | Role |
|---|---|
| `config.xml` | Manifest: extends `vanilla`, CSS and JS files, theme options |
| `css/tokens.css` | The only place with colour, font, size, spacing and radius values |
| `css/fonts.css` | `@font-face` rules for the four self-hosted families (no remote URLs) |
| `css/hotel.css` | All hotel styling, using `var(--…)` tokens and logical properties only |
| `scripts/custom.js` | Welcome-screen browser-language redirect (once per tab session) |
| `fonts/<family>/` | WOFF2 files and each family's `OFL.txt` |
| `views/subviews/hotel/i18n.twig` | Every theme string in English and Persian, the `t()` and `digits()` macros |
| `views/subviews/hotel/brand.twig` | Wordmark, bilingual names and tagline macros |
| `views/subviews/header/nav_bar.twig` | Brand header and the placeholder notice (no language menu) |
| `views/subviews/header/progress_bar.twig` | Thin progress bar and "Question N of 9" text |
| `views/subviews/navigation/navigator.twig` | Start, Back (not on Q1), Continue and Submit labels |
| `views/subviews/navigation/language_changer_first_page.twig` | English / فارسی links on the welcome screen only |
| `views/subviews/content/firstpage.twig` | Welcome screen: title, tagline, admin welcome text, Start |
| `views/subviews/content/submit.twig` | Thank-you screen: check icon, admin end text, both hotel names |
| `views/layout_errors.twig` | Engine error page (session expired, invalid request) in Persian or English; both shown if the language is unknown (core view, overridden here) |
| `views/subviews/messages/no_js_alert.twig` | Translated no-JavaScript notice |
| `views/subviews/survey/question_subviews/question_text_content.twig` | Required and Optional markers |
| `views/survey/questions/question_help/mandatory_tip.twig` | Translated required-answer message (core view, overridden here) |

The survey content (questions, answers, welcome and end text, settings) lives in LimeSurvey, not in this theme. Its structure export is `limesurvey/survey/hotel-guest-survey.lss`.

## CSS load order

`config.xml` adds `css/tokens.css`, then `css/fonts.css`, then `css/hotel.css`, after vanilla's own files. It does not add `css/theme.css`, because in LimeSurvey 6 a file with the same name as the parent's replaces it. `scripts/custom.js` is added as the only custom script.

## Rules

- Colours, type and spacing come only from `css/tokens.css`. `scripts/validate.sh` fails on a hex colour anywhere else in the theme, and on any Google Fonts reference.
- Layout uses logical properties (`margin-inline-*`, `inset-inline-*`, `text-align: start`) so Persian (RTL) pages mirror.
- Touch targets are at least 48px. No horizontal scrolling from 320px.
- JavaScript stays minimal. The only custom code is the welcome-screen language redirect. It reads no answers and sends nothing.
- Guest comments are sensitive. Nothing in this theme logs them.

## Placeholder notice

The notice "Development preview – placeholder brand" appears on every guest page. One setting controls it: in LimeSurvey admin, go to **Configuration → Themes → hotel-classic → Theme options → Placeholder brand → Show the placeholder-brand notice on guest pages**. Set it to **Off** at launch. No layout change is needed, and no empty space is left behind.

## Reset after changing config.xml

LimeSurvey caches the theme manifest in its database. After any change to `config.xml`, go to **Configuration → Themes**, then **Reset** `hotel-classic`. CSS and JavaScript are also copied into LimeSurvey's runtime asset cache, which is keyed by hash and is not always rebuilt after an edit. If a CSS or JS change does not show, reset the theme, or clear the generated asset folders under the container's `tmp/assets/` (runtime cache only, never core files).

## Brand replacement

1. Edit the `brand.*` keys in `views/subviews/hotel/i18n.twig` (English name, Persian name, tagline). Nothing else holds the brand text.
2. If a logo file is added, change `views/subviews/hotel/brand.twig` and set the `brandlogo` option to `on`.
3. Turn the placeholder notice off (see above).
4. Update the survey title and description in the admin, then re-export the structure file.
5. Run a trademark check on the new name (`docs/decisions.md` §2 item 3).

## Fonts and licences

All four families are served from `fonts/`. Nothing loads from a third-party font service (FR-033).

| Family | Use | Weights | Licence |
|---|---|---|---|
| Cormorant Garamond | English headings and wordmark | 500, 600 | SIL OFL 1.1 (`fonts/cormorant-garamond/OFL.txt`) |
| Inter | English body and interface text | 400, 500, 600 | SIL OFL 1.1 (`fonts/inter/OFL.txt`) |
| Noto Naskh Arabic | Persian headings | 500, 600 | SIL OFL 1.1 (`fonts/noto-naskh-arabic/OFL.txt`) |
| Vazirmatn | Persian body and interface text | 400, 500, 600 | SIL OFL 1.1 (`fonts/vazirmatn/OFL.txt`) |

## Importing the survey

Recreate the survey from `limesurvey/survey/hotel-guest-survey.lss` through **Surveys → Import** in the LimeSurvey admin. Then check the settings against `specs/001-branded-bilingual-survey/data-model.md` §1. The export contains structure only, never responses. Re-export after every admin change to content or settings.

## Open items

- **Persian copy review:** the Persian strings in `i18n.twig` and the survey content are proposals (spec A-05).
- **Rating direction (R-04):** the 0–10 and 1–5 tiles follow the page direction. The single-rule switch `[dir="rtl"] .hotel-scale { direction: ltr; }` is commented out in `hotel.css`, pending operator review.
- **Digit style (R-05):** Persian screens use Persian digits (۰–۹), controlled by `persianDigits` in `i18n.twig`, pending review (R3).
- **Persian typefaces (R5):** Noto Naskh Arabic and Vazirmatn are the proposed choices.
- **Language scope (R1):** `AGENTS.md`, `hotelSurveyPRD.md` FR-03 and `docs/brand.md` still describe German and English. Those files are an operator action and were not edited here.
- **Placeholder brand (R13):** replace the placeholder brand and turn the notice off before any production use.
