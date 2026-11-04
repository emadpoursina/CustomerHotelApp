# Research: Branded Bilingual Guest Survey (Milestone 2)

**Feature**: `specs/001-branded-bilingual-survey/spec.md` | **Date**: 2026-11-04

Findings come from reading the running LimeSurvey CE 6.17.18 container (`docker compose exec limesurvey`), read-only. File references such as `vanilla/config.xml` mean `/var/www/html/themes/survey/vanilla/config.xml` inside the container. Items marked **Verify** must be confirmed against the running install during implementation. Items marked **Open (operator)** are carried forward and are not decided here.

---

## R-01 Child-theme mechanism

- **Decision**: `limesurvey/themes/hotel-classic/config.xml` declares `<metadata><name>hotel-classic</name>…<extends>vanilla</extends><apiVersion>3</apiVersion>` and `<compatibility><version>6.0</version>`, matching how the stock `bootswatch` theme extends `vanilla`. Twig views are overridden only where CSS cannot do the job. Vanilla's own CSS and JS are kept. Hotel CSS is added as new files.
- **Rationale**: `bootswatch/config.xml` uses `<extends>vanilla</extends>`, so this is the supported 6.x syntax. `vanilla/config.xml` warns that `<add>` with an existing file name *replaces* the parent file. Adding `css/theme.css` (as the theme README suggests) would therefore drop vanilla's `theme.css`, which holds its base layout and RTL rules. New names (`css/tokens.css`, `css/fonts.css`, `css/hotel.css`) add to vanilla without replacing it. `scripts/custom.js` intentionally replaces vanilla's empty `custom.js`.
- **Alternatives considered**: Copy vanilla wholesale (rejected: forks core code, breaks on upgrade). Replace `css/theme.css` (rejected: loses vanilla base and RTL styles). Use `fruity_twentythree` as the base (rejected: `docs/decisions.md` §1 item 3 binds `vanilla`).
- **Note**: The theme README's step 3 ("css/theme.css that imports tokens.css") is updated to the new file names as part of implementation.
- **Verify**: After a `config.xml` change, LimeSurvey re-reads it only after a theme reset in *Themes* (it caches the manifest in the database). This is a normal admin action and is documented in `quickstart.md`.

## R-02 Survey format and navigation

- **Decision**: Survey format **question by question** (`format = S`), one question group, nine questions. `allowprev = Y`, `showprogress = Y`, `showwelcome = Y`, `questionindex = 0`, `allowsave = N`, `showxquestions = N`, `showgroupinfo = X` (none), `showqnumcode = X` (none), `navigationdelay = 0`, `nokeyboard = N`.
- **Rationale**: Format S gives one screen per question (FR-010) without nine groups. `SurveyRuntimeHelper.php` (lines 345–366) computes `aSurveyInfo.progress.currentstep` (0-based on question 1) and `aSurveyInfo.progress.total`, so the theme can render "Question N of 9" as `currentstep + 1` of `total` without custom code.
- **Back on question 1**: The `navigator.twig` override hides Back when `progress.currentstep == 0`, whatever LimeSurvey's `aMovePrev.show` says (with the welcome page on, the engine may offer Back to the welcome screen).
- **Start button**: On the welcome screen (step 0) the navigator's Next button is labelled "Start survey" / «شروع نظرسنجی».
- **Alternatives considered**: Group by group with nine groups (rejected: more admin overhead, same result). All in one (rejected: FR-010).
- **Verify**: The exact `currentstep` value on question 1 and on the last question, and that `progress.total` is 9.

## R-03 Answer types for ratings

- **Decision**: Questions 1–7 use the core **List (radio)** type (`L`) with no question theme. Questions 1–6 have answer codes `1`–`5`. Question 7 has codes `0`–`10`. All seven are mandatory (`mandatory = Y`). Answer *labels* are per language, so the digits shown on Persian screens are survey content. Questions 8 and 9 use **Long free text** (`T`), not mandatory.
- **Rationale**: The core 5-point type (`5`) prints fixed Western digits that cannot be translated, which would close off the open digit-style decision (A-19). List (radio) stores the same codes in both languages (FR-008, A-19) and lets digits change by editing labels only. Real radio inputs keep keyboard and screen-reader behaviour. Hotel CSS turns the radio list into a row or grid of tiles (`input:checked + label` gives the gold selected state plus a border and check cue, FR-011, US3-AS3). With `mandatory = Y` there is no "No answer" option, so question 5 offers exactly 1–5 (A-03).
- **0–10 layout**: Eleven tiles in a CSS grid, 6 columns from 360px up (6 + 5 rows, about 48px each at 360px) and 4 columns below 360px (4 + 4 + 3). The grid never overflows, so there is no horizontal scrolling (FR-012, SC-004). Tile height is at least `--touch-min`.
- **End labels**: The scale-end meaning ("1 = Very poor, 5 = Excellent"; "0 = Not at all likely, 10 = Extremely likely") goes in each question's help text, translated in the admin. Theme option `questionhelptextposition = top`.
- **Alternatives considered**: `bootstrap_buttons` question theme (rejected: renders a btn-group that does not wrap well to 11 options at 360px). Core 5-point type (rejected: fixed digits). Array type (rejected: one question per screen is needed).

## R-04 Rating direction on Persian screens — Open (operator)

- **Default planned**: The rating row follows the reading direction (A-19). On `dir="rtl"` pages the grid flows right to left, so the lowest value is on the right. This happens without extra CSS.
- **Reversibility**: If the review chooses the left-to-right number order on Persian screens, one rule (`[dir="rtl"] .hotel-scale { direction: ltr; }`) changes it. Nothing else depends on the choice.
- **Status**: Not decided in Clarifications. Listed in plan risks for operator or Persian-reviewer sign-off.

## R-05 Digit style on Persian screens — Open (operator)

- **Default planned**: Persian digits (۰–۹), matching the proposed string table (for example «پرسش ۳ از ۹», «حدود ۲ دقیقه»).
- **Mechanism**: Theme-rendered numbers (the step text) pass through one `digits()` macro in `views/subviews/hotel/i18n.twig`, controlled by one constant `persianDigits`. Rating labels are survey content (R-03). Stored values are always the Western codes.
- **Status**: Part of the Persian copy review (A-05, A-19).

## R-06 Language set, base language and browser detection

- **Decision**: Survey base language `en`, additional language `fa`. LimeSurvey 6 lists `fa` with `rtl = true` (`surveytranslator_helper.php` line 753) and has a core `fa` locale, so `<html lang="fa" dir="rtl">` and `dir-rtl` classes are produced by vanilla's `layout_global.twig` (line 71).
- **Finding**: The survey runtime does **not** use the browser language. `SurveyIndex.php` (lines 193–202) picks `lang` request parameter, then session, then token, then the survey base language. `getBrowserLanguage()` is used only by admin controllers.
- **Decision for FR-005 / A-01**: A short script in `scripts/custom.js` runs on the welcome screen only. If the URL has no `lang` parameter, the page is in English, and `fa` ranks above `en` in `navigator.languages`, it reloads the welcome screen with `?lang=fa`. A `sessionStorage` flag ensures it runs at most once per tab session, so it never overrides a guest's own choice. This is the one script justified by FR-005 under FR-034.
- **Rationale**: No server code, no LimeSurvey core change, no shared-Caddy change. With JavaScript off the guest sees English and can still choose Persian, which is an acceptable fallback.
- **Alternatives considered**: A LimeSurvey plugin on `beforeSurveyPage` reading `Accept-Language` (rejected for now: PHP backend code plus a new plugin mount and activation. It is the fallback if the script approach fails review). A Caddy `Accept-Language` matcher (rejected: lives in shared infrastructure outside this repo). Persian as base language (rejected: Clarifications fix English as base).
- **Known limitation**: LimeSurvey accepts `?lang=` on any page, so a guest who edits the URL can switch language mid-survey. FR-006 is about offered controls, and none are offered after the start. Logged as a risk.

## R-07 Language selector on the welcome screen

- **Decision**: Override `subviews/navigation/language_changer_first_page.twig` with two links ("English" / «فارسی») to `aSurveyInfo.surveyUrl` with `lang=en` / `lang=fa`. Each link is at least 48px high, marked with its own `lang` and `dir`, and the current language has `aria-current="true"`. Override `subviews/navigation/language_changer_top_menu.twig` (or the `nav_bar.twig` include) so no language control appears after the welcome screen (FR-006).
- **Rationale**: Plain links need no JavaScript and change both text and direction with a normal page load. No response row exists before the guest starts.
- **Verify**: That pjax (vanilla loads the `pjax` package) does a full reload for these links so `<html lang dir>` updates. If not, add `data-pjax="false"` or the vanilla equivalent.

## R-08 Theme-level strings (not survey content)

- **Decision**: Strings that belong to the theme (Back, Continue, Submit, Start survey, step text, Optional, the required-answer message, placeholder notice, brand names and tagline, confirmation-icon label) live in one Twig macro file, `views/subviews/hotel/i18n.twig`, keyed by language (`en`, `fa`). Views call `i18n.t('key', aSurveyInfo.languagecode)`. The LimeSurvey Twig sandbox allows `macro` and `import` (`application/config/internal.php` line 332).
- **Where the language variable is not available** (core question-help views rendered by the Expression Manager, for example the mandatory tip): render both language variants, each with its own `lang` attribute, and hide the non-matching one with `html:not(:lang(fa)) [lang="fa"].hotel-i18n, html:lang(fa) [lang="en"].hotel-i18n { display: none; }`. `display: none` also hides it from screen readers.
- **Survey content** (welcome text, question text, help text, answer labels, end text, survey title) is entered per language in the admin (FR-035).
- **Alternatives considered**: Rely on LimeSurvey core `gT()` Persian strings (rejected: wording differs from the spec string table, for example "Previous"/"Next" against "Back"/"Continue"). Per-language theme copies (rejected: duplicates every view).

## R-09 Required-answer message

- **Decision**: Theme option `showpopups = 0` (show on page) so the message appears next to the question (FR-014). Override the core view `survey/questions/question_help/mandatory_tip.twig` from the theme's `views/` directory with the hotel message ("Please choose an answer to continue." / «لطفاً برای ادامه یک گزینه را انتخاب کنید.»), an error icon (non-colour cue), `role="alert"` and the `--color-error` token. R-08's dual-language markup is used here.
- **Rationale**: `LSETwigViewRenderer` resolves views through the theme inheritance chain (`getTemplateForView`, lines 530–601), and the Expression Manager renders `mandatory_tip.twig` by that path (`em_manager_helper.php` line 6204 onward).
- **Verify**: That the theme copy is picked up for Expression Manager renders. Fallback: keep the core view and use CSS to restyle `.ls-question-mandatory`, with the message text overridden through the dual-language spans placed in `question_container.twig`.
- **Risk**: Overriding a core view couples the theme to LimeSurvey 6.17 markup. Re-check on upgrade.

## R-10 Anonymity and timestamps

- **Decision**: Survey settings `anonymized = Y`, `ipaddr = N`, `refurl = N`, `datestamp = Y`, `savetimings = N`, no participant table (open access), `usecookie = N`, no email or name questions, `showsurveypolicynotice = 0`.
- **Rationale**: With `anonymized = Y` and `datestamp = N` LimeSurvey stores a dummy submit date, so `datestamp = Y` is needed for FR-018. LimeSurvey stores `startlanguage` in every response row, which meets FR-008 with no custom field. `ipaddr` and `refurl` off meet FR-024. `usecookie = N` keeps A-07 (a shared phone can start a new survey).
- **Privacy notice**: Not added (open GDPR item, `docs/decisions.md` §2 item 4, A-09).

## R-11 Duplicate submission (FR-022)

- **Decision**: Rely on the engine first. On completion LimeSurvey ends the survey session, so a refresh or re-POST of the last page cannot create a second completed row (the engine shows its own session message instead). Verify double-tap behaviour. If LimeSurvey's core JavaScript does not already disable the Submit button after the first click, add a few lines to `scripts/custom.js` that disable navigation buttons on the form's first `submit` event.
- **Rationale**: Smallest change that meets FR-022. No cookie block, so a new session still starts a fresh survey (A-07).
- **Verify**: Double tap, refresh on the thank-you page, browser Back after submit; then count completed rows in the admin.
- **Risk**: The engine's session-expired page uses LimeSurvey's core `fa` translations and the `layout_errors.twig` layout, so its wording is not the hotel's. It is still translated and styled by `hotel.css`.

## R-12 Fonts (self-hosted)

- **Decision**: Self-host WOFF2 files in `limesurvey/themes/hotel-classic/fonts/` with `@font-face` rules in `css/fonts.css` and `font-display: swap`. Remove the Google Fonts `@import` from `css/tokens.css` (FR-033, SC-008).
  - English headings: **Cormorant Garamond** 500/600 (SIL OFL 1.1).
  - English body: **Inter** 400/500/600 (SIL OFL 1.1).
  - Persian headings (proposed): **Noto Naskh Arabic** 500/600 (SIL OFL 1.1). Classic Naskh calligraphic style, a good match for Cormorant's classic feel. Full Persian coverage.
  - Persian body (proposed): **Vazirmatn** 400/500/600 (SIL OFL 1.1). Clean, widely used Persian UI sans-serif.
  - Each font's `OFL.txt` ships next to the files.
- **Fallbacks**: Persian stacks end in `Tahoma, "Noto Sans Arabic", "Segoe UI", sans-serif`, which show Persian on common phones, so text never falls back to empty boxes.
- **Status**: **Open (operator)**: the operator confirms the Persian typefaces and their licence. OFL 1.1 allows self-hosting and bundling, so no licence blocker is expected.
- **Vanilla `font-noto` package**: It is served locally (not third party), so it does not break FR-033. Milestone 2 leaves it in place: `config.xml` has no `<packages><remove>` block, because the removal was never verified against the 6.x manifest and was a no-op in the critic review.
- **Alternatives considered**: Amiri for Persian headings (OFL, more Arabic-oriented letterforms). Sahel/Samim (OFL, older). Google Fonts CDN (rejected: FR-033).

## R-13 Design tokens

- **Decision**: Extend `css/tokens.css` (still the single source, FR-026) with `--font-heading-fa`, `--font-body-fa`, `--size-h1`…`--size-label` unchanged, plus any new tokens needed by `hotel.css` (for example `--size-body-sm: 15px`, `--border-width`, `--progress-height`). `hotel.css` uses only `var(--…)` values. `:lang(fa)` swaps `--font-heading`/`--font-body` to the Persian stacks. The wordmark keeps the Latin heading font in both languages.
- **Layout**: `hotel.css` uses CSS logical properties (`margin-inline-start`, `padding-inline`, `text-align: start`, `inset-inline-*`) so one stylesheet serves LTR and RTL (FR-031). The progress bar fills from the inline start, which is the right on RTL pages (FR-016).
- **Contrast**: Gold `#B89A65` on ivory is about 2.5:1, so gold is used only for the wordmark, borders, the selected-tile fill or border, and decorative rules, never for body-size text (FR-032). Text on a gold-filled selected tile uses `--color-text` (Deep Espresso), roughly 5:1. **Verify** every pair with a contrast checker (SC-007).
- **Check**: `scripts/validate.sh` gains a grep that fails on any hex colour in `limesurvey/themes/hotel-classic/` outside `css/tokens.css`, and on any `fonts.googleapis.com` / `fonts.gstatic.com` reference.

## R-14 Mixed-direction comments

- **Decision**: CSS on the comment textareas: `unicode-bidi: plaintext; text-align: start;`. Each paragraph then takes its direction from its first strong character, whatever the page direction. No JavaScript, no change to the stored text.
- **Comment length**: No `maximum_chars` set. Long free-text answers are stored in a `text` column (65,535 bytes, about 32,000 Persian characters), which exceeds the 1,000-character minimum (A-16). Nothing is silently cut off at realistic lengths.

## R-15 Placeholder-brand notice

- **Decision**: A theme option `placeholdernotice` (`on|off`, default `on`) in `config.xml` `<options>`. The `nav_bar.twig` override renders the notice when `aSurveyInfo.options.placeholdernotice == 'on'`. Because `nav_bar.twig` is included by `layout_global.twig` for the welcome, question and completed screens, one setting covers all 11 page types (SC-011). When off, nothing is rendered, so no gap is left.
- **Where the setting is changed**: *Themes → hotel-classic → Theme options* in the admin. That is a normal admin action (LimeSurvey stores it in its own table through its own UI, which does not break the "do not modify core tables" rule).

## R-16 Brand in one place

- **Decision**: `views/subviews/hotel/brand.twig` holds macros for the wordmark, the bilingual hotel-name header, and the tagline (via `i18n.twig`). All views call these macros. Replacing the brand later means editing `i18n.twig` brand keys and, if a logo arrives, `brand.twig` only (FR-030).
- **Bidi**: Names are wrapped in `<bdi lang="fa" dir="rtl">باغ پردیس</bdi>` and `<bdi lang="en" dir="ltr">Paradise Garden Hotel</bdi>` (FR-021, FR-032).

## R-17 Survey definition in the repo (A-17)

- **Decision**: Build the survey in the admin, then export it as `.lss` to `limesurvey/survey/hotel-guest-survey.lss` (structure, both languages, settings, no responses). It is the reproducible record of survey content and is imported through the supported admin import.
- **Rationale**: The survey can be recreated after a database reset without hand re-entry. Stays outside core files and tables.
- **Alternatives considered**: Hand-written SQL into LimeSurvey tables (rejected: AGENTS.md forbids it). No export (rejected: content would exist only in the database volume).

## R-18 Testing approach

- **Decision**: Manual, scripted walkthroughs in `quickstart.md` at 320/360/390px and desktop, in both languages, with Chrome DevTools device emulation against `http://hotelsurvey.localhost` (A-15). An automated E2E suite is not added in this milestone (no test stack exists. Adding one would be a new dependency the spec does not require). `./scripts/validate.sh` gains static checks (R-13) and must pass.
- **Alternatives considered**: Playwright suite (deferred: worth adding at Milestone 3 or 5 when room-token flows need regression coverage).

## R-19 pjax and the theme script

- **Finding**: Vanilla loads `pjax`, so moving between questions may swap page fragments instead of full loads.
- **Decision**: Keep pjax. `custom.js` runs its welcome-page logic only when the welcome markup is present, and binds the double-submit guard (if needed) through event delegation on `document`, so it survives fragment swaps. **Verify** in the walkthrough.
