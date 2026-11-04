# Contract: `hotel-classic` child theme

The interface between the theme and LimeSurvey CE 6.17.18 (`vanilla` parent), and between the theme and whoever replaces the placeholder brand later.

## 1. File layout (all under `limesurvey/themes/hotel-classic/`)

| Path | Role | Replaces vanilla file? |
|---|---|---|
| `config.xml` | Manifest: `<extends>vanilla</extends>`, files, options | – |
| `css/tokens.css` | Single token source (existing, extended) | No (new name) |
| `css/fonts.css` | `@font-face` for the four self-hosted families | No |
| `css/hotel.css` | All hotel styling, `var(--…)` only, logical properties | No |
| `scripts/custom.js` | Browser-language redirect on welcome; double-submit guard only if needed | Yes (vanilla's is empty) |
| `fonts/<family>/*.woff2` + `OFL.txt` | Self-hosted fonts | – |
| `views/subviews/hotel/i18n.twig` | Theme strings macro `t(key, lang)`, `digits(n, lang)` | – |
| `views/subviews/hotel/brand.twig` | Wordmark, bilingual names, tagline macros | – |
| `views/subviews/header/nav_bar.twig` | Brand header + placeholder notice. No language menu | Yes |
| `views/subviews/header/progress_bar.twig` | Thin bar + "Question N of 9" | Yes |
| `views/subviews/navigation/navigator.twig` | Back (hidden on Q1) / Continue / Submit / Start labels | Yes |
| `views/subviews/navigation/language_changer_first_page.twig` | Two-link English / فارسی selector | Yes |
| `views/subviews/content/submit.twig` | Thank-you: check icon, heading, end text, bilingual header | Yes |
| `views/subviews/survey/question_subviews/question_text_content.twig` (or nearest vanilla view) | "Optional" marker on non-mandatory questions | Yes |
| `views/survey/questions/question_help/mandatory_tip.twig` | Hotel required-answer message (dual-language spans) | Yes (core view, via theme path) |
| `README.md` | Updated: structure, placeholder-brand warning, how to toggle the notice, reset after `config.xml` changes | – |

Any other override must be justified by a spec requirement that CSS cannot meet. No file outside this directory, `scripts/`, `db/init/` or `limesurvey/survey/` changes.

## 2. `config.xml` obligations

- `metadata`: `name = hotel-classic`, `extends = vanilla`, `apiVersion = 3`, `compatibility/version = 6.0`, description marks the brand as a development placeholder.
- `files/css/add`: `css/tokens.css`, `css/fonts.css`, `css/hotel.css`, in that order, after vanilla's files.
- `files/js/add`: `scripts/custom.js`.
- `options`: as in `data-model.md` §6. `placeholdernotice` is the only new option.
- `packages`: none. `font-noto` is left in place (research R-12).

## 3. Token contract (`css/tokens.css`)

- Every colour, font family, font size, spacing value, radius, touch size and width used in `hotel.css` or Twig inline styles is a `var(--token)`. Only `tokens.css` contains hex values. Enforced by `scripts/validate.sh`.
- `:lang(fa)` (in `hotel.css`) sets `--font-heading: var(--font-heading-fa)` and `--font-body: var(--font-body-fa)`. `.hotel-wordmark` always uses the Latin heading stack.
- No `@import` of remote URLs anywhere in the theme.

## 4. Rendering contract per screen

All screens: `<html lang="en|fa" dir="ltr|rtl">` (from vanilla). Brand header with wordmark. Placeholder notice when the option is on. Content column centred, `max-width: var(--width-survey)`. No horizontal overflow from 320px. Every interactive element has `min-height: var(--touch-min)`.

| Screen | Must show | Must not show |
|---|---|---|
| Welcome (step 0) | Wordmark, tagline heading, welcome message, intro, "About 2 minutes", language selector (current language marked), Start survey | Progress, Back, language top menu |
| Question 1 | Progress bar + "Question 1 of 9", question heading, help text, answer control, Continue | Back, language control |
| Questions 2–8 | Progress bar + step text, heading, help, control, Back + Continue. "Optional" on Q8 | Language control |
| Question 9 | As above with Back + Submit, "Optional" | Language control |
| Required violation | Hotel message next to the question, error colour + icon, `role="alert"` | Popup modal |
| Thank-you | Check icon (with text label for AT), thank-you heading, appreciation message, both hotel names (each in `<bdi>` with its `lang`/`dir`) | Progress, navigation, language control |

RTL obligations: text aligns to the start, the Back/Continue order is mirrored by the flex direction, the progress bar fills from the right, icons and markers use logical positioning, and the rating grid follows the reading direction (default, research R-04).

## 5. Selected-state contract

A checked rating tile shows **both** a gold accent (border or fill using `--color-accent`) and a non-colour cue (a thicker border plus a check glyph or an inverted weight). Text on the tile stays `--color-text`. Focus is visible (`:focus-visible` outline in a token colour) and distinct from the selected state.

## 6. Script contract (`scripts/custom.js`)

- Browser-language redirect: runs only on the welcome screen, only if there is no `lang` query parameter, the document language is `en`, `fa` ranks above `en` in `navigator.languages`, and a `sessionStorage` key is not yet set. Sets the key, then navigates to the same URL with `lang=fa`.
- Double-submit guard (only if the engine lacks one): on the first `submit` of the survey form, disables its navigation buttons.
- Never reads, logs or transmits answer or comment content (FR-025). No network calls. No third-party code.

## 7. Brand replacement contract

Replacing the placeholder brand means editing `brand.*` keys in `i18n.twig` and, if a logo is added, `brand.twig` only, plus turning `placeholdernotice` off. No layout file changes (FR-030).
