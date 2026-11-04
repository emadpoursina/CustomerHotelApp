---

description: "Task list for Branded Bilingual Guest Survey (Milestone 2)"
---

# Tasks: Branded Bilingual Guest Survey (Milestone 2)

**Input**: Design documents from `specs/001-branded-bilingual-survey/`

**Prerequisites**: plan.md, spec.md (with Clarifications), research.md, data-model.md, contracts/theme-contract.md, contracts/survey-definition.md, quickstart.md

**Tests**: The spec asks for no automated test suite (research R-18). Each story phase instead ends with verification tasks that run the scripted walkthroughs in `specs/001-branded-bilingual-survey/quickstart.md` (W1–W17), using phone-sized viewports (320, 360, 390px) and a desktop width in Chrome DevTools device emulation against `http://hotelsurvey.localhost`. `./scripts/validate.sh` gets new static checks.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own.

**Scope guards (apply to every task)**:

- Languages are **Persian (`fa`) and English (`en`, base)** only (operator decision, spec Clarifications). German is dropped.
- Do **not** edit `AGENTS.md`, `hotelSurveyPRD.md` or `docs/brand.md`. The language-scope conflict with those files is an open operator item (plan Risk R1). No task here resolves it.
- Do **not** edit LimeSurvey core files or LimeSurvey core tables. No custom SQL. Survey content changes go through the LimeSurvey admin only (FR-035).
- Do **not** add room tokens, room fields, hidden fields or anything room-related (FR-036, Milestone 3).
- Do **not** decide items listed as open in `docs/decisions.md` §2.
- No hex colour values outside `limesurvey/themes/hotel-classic/css/tokens.css` (FR-026). No third-party font or asset URLs (FR-033).
- Never log, copy or paste guest comment text (FR-025, AGENTS.md).
- Do not commit or push.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US5 from spec.md)
- `THEME` below means `limesurvey/themes/hotel-classic/`. Paths are relative to the repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the gate, the running stack and the vanilla markup the overrides depend on. Create the theme folder structure and fetch the fonts.

- [x] T001 Confirm the implementation gate in `specs/001-branded-bilingual-survey/plan.md` (Constitution Check note and Risk R1): ask the operator whether `hotelSurveyPRD.md` FR-03, `AGENTS.md` and `docs/brand.md` have been updated for the Persian and English scope, or whether that update is explicitly waived. Do not edit those three files. Do not start Phase 2 until the operator answers. Also ask the operator to confirm the proposed Persian typefaces Noto Naskh Arabic and Vazirmatn (plan Risk R5, research R-12). (gate waived by the operator for this milestone)
- [x] T002 Check that the stack runs: `docker compose up -d`, then `docker compose ps` shows `db` healthy and `limesurvey` up. Check that `http://hotelsurvey.localhost` and `http://hotelsurvey.localhost/index.php/admin` load. Check, read-only, that `/var/www/html/themes/survey/vanilla/` exists in the container and that `THEME` is mounted at `upload/themes/survey/hotel-classic` as `docker-compose.yml` defines. Do not change `docker-compose.yml`.
- [x] T003 [P] Copy the vanilla views the overrides are based on into `scratch/vanilla-views/` as read-only reference. Use `docker compose exec limesurvey cat …` and do not change anything in the container. Copy `views/subviews/header/nav_bar.twig`, `views/subviews/header/progress_bar.twig`, `views/subviews/navigation/navigator.twig`, `views/subviews/navigation/language_changer_first_page.twig`, `views/subviews/navigation/language_changer_top_menu.twig`, `views/subviews/content/submit.twig`, `views/subviews/content/firstpage.twig` (or the vanilla welcome view), the question-text view that shows the mandatory asterisk (`question_text_content.twig` or the nearest equivalent), `views/layout_global.twig`, and the core view `application/views/survey/questions/question_help/mandatory_tip.twig`. Write down the exact names and ids vanilla uses for the Back, Next and Submit buttons and for the welcome container, in `scratch/vanilla-views/NOTES.txt`.
- [x] T004 [P] Create the theme directory structure from plan.md "Source Code": `THEME/css/`, `THEME/scripts/`, `THEME/fonts/{cormorant-garamond,inter,noto-naskh-arabic,vazirmatn}/`, `THEME/views/subviews/hotel/`, `THEME/views/subviews/header/`, `THEME/views/subviews/navigation/`, `THEME/views/subviews/content/`, `THEME/views/subviews/survey/question_subviews/`, `THEME/views/survey/questions/question_help/`, and `limesurvey/survey/`.
- [x] T005 [P] Fetch the self-hosted WOFF2 files and each family's `OFL.txt` into `THEME/fonts/<family>/` (research R-12): Cormorant Garamond 500/600 and Inter 400/500/600 (Latin subset), Noto Naskh Arabic 500/600 and Vazirmatn 400/500/600 (Arabic-script subset that covers Persian). Download them from the upstream OFL sources once, at build time. Nothing at runtime may reference a remote font URL (FR-033). The Persian families depend on the operator confirmation in T001.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme manifest, tokens, fonts, the shared string and brand macros, the static checks, theme install, and the survey structure in both languages. Every user story needs these.

**CRITICAL**: No user-story work starts until this phase is complete.

- [x] T006 Create `THEME/config.xml` per `contracts/theme-contract.md` §2 and research R-01. `metadata`: `name` = `hotel-classic`, `extends` = `vanilla`, `apiVersion` = `3`, `compatibility/version` = `6.0`, and a description that marks the brand as a "development placeholder". `files/css/add`: `css/tokens.css`, `css/fonts.css`, `css/hotel.css`, in that order. Do not add `css/theme.css`, because that would replace vanilla's file. `files/js/add`: `scripts/custom.js`. `options` per `data-model.md` §6: `placeholdernotice` `on`/`off` default `on`; `showpopups` `0`; `showclearall` `off`; `questionhelptextposition` `top`; `brandlogo` `off`. `packages`: `<remove>font-noto</remove>` only if the 6.x manifest accepts it (research R-12). Otherwise leave the package alone. Covers FR-035 and FR-037.
- [x] T007 Update `THEME/css/tokens.css` (research R-13, contract §3). Remove the Google Fonts `@import` line and its TODO comment (FR-033). Keep every existing token and value. Add `--font-heading-fa` (Noto Naskh Arabic, then `Tahoma, "Noto Sans Arabic", "Segoe UI", serif`-style Persian-capable fallbacks) and `--font-body-fa` (Vazirmatn, then `Tahoma, "Noto Sans Arabic", "Segoe UI", sans-serif`). Add only the new tokens that `hotel.css` needs, for example `--size-body-sm: 15px`, `--border-width`, `--border-width-selected`, `--progress-height`, and a focus-ring colour that points at an existing colour token. This file stays the only place with hex values (FR-026, FR-028).
- [x] T008 [P] Create `THEME/css/fonts.css` with one `@font-face` rule per family and weight from T005. Use relative `url("../fonts/<family>/<file>.woff2") format("woff2")` and `font-display: swap`. Add a `unicode-range` on the Persian families. No remote URLs, no hex values (FR-033, SC-008).
- [x] T009 [P] Create `THEME/css/hotel.css` with a header comment and only the cross-cutting base rules. `:lang(fa)` sets `--font-heading: var(--font-heading-fa)` and `--font-body: var(--font-body-fa)`. `.hotel-wordmark` always uses the Latin heading stack. Add the dual-language hide rule from research R-08: `html:not(:lang(fa)) [lang="fa"].hotel-i18n, html:lang(fa) [lang="en"].hotel-i18n { display: none; }`. Only `var(--…)` values and logical properties. Story-specific sections are added in later phases.
- [x] T010 [P] Create `THEME/views/subviews/hotel/i18n.twig` (research R-05, R-08, `data-model.md` §5). Add a macro `t(key, lang)` that returns the `en` or `fa` string and falls back to `en` only for an unknown `lang`, never for a missing key. Add a macro `digits(n, lang)` that maps 0–9 to ۰–۹ when `lang == 'fa'` and the constant `persianDigits` is true. Set the constant `persianDigits` default to `true`. Add all keys with the exact texts from `data-model.md` §5 and the spec string table: `nav.back`, `nav.continue`, `nav.submit`, `nav.start`, `progress.step` ("Question %1 of %2" / «پرسش %1 از %2»), `question.optional`, `question.required_msg`, `notice.placeholder`, `lang.label`, `done.icon_label`, `brand.name_en`, `brand.name_fa`, `brand.tagline`. Mark the Persian strings in a comment as "proposal pending fluent-speaker review" (A-05). Use only `macro`/`import` and filters the LimeSurvey Twig sandbox allows.
- [x] T011 Create `THEME/views/subviews/hotel/brand.twig`, which imports `i18n.twig` (depends on T010). Add macros `wordmark()` (English name in an element with class `hotel-wordmark`), `names()` (both names, each in `<bdi lang="en" dir="ltr">` and `<bdi lang="fa" dir="rtl">`) and `tagline(lang)`. All brand text comes from the `brand.*` keys, so the brand is defined in one place (FR-021, FR-030, FR-032, research R-16, contract §7).
- [x] T012 Extend `scripts/validate.sh` (plan "Source Code", research R-13). Add `THEME/config.xml`, `THEME/css/fonts.css`, `THEME/css/hotel.css`, `THEME/scripts/custom.js`, `THEME/views/subviews/hotel/i18n.twig` and `THEME/views/subviews/hotel/brand.twig` to `required`. Fail when a hex colour (`#` plus 3, 4, 6 or 8 hex digits, as a whole token) appears in any `.css`, `.twig`, `.js`, `.xml` or `.html` file under `THEME` other than `css/tokens.css`. Print the matching file and line. Fail on any `fonts.googleapis.com` or `fonts.gstatic.com` reference under `THEME`. Fail on any `@import url(http…)` under `THEME`. Check that `THEME/config.xml` is well-formed with `xmllint --noout`, falling back to `python3 -c 'import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])'`. Keep `set -euo pipefail`, keep the existing checks, and keep `validate: ok` as the last line. Do not print file contents beyond the matching line.
- [x] T013 Create `THEME/scripts/custom.js` as an empty, strict-mode IIFE with a header comment that says what the file may contain: the FR-005 language redirect, plus the FR-022 submit guard only if needed. That way the file listed in `config.xml` exists before install. The redirect logic comes in T025.
- [x] T014 Install the theme in the admin (`http://hotelsurvey.localhost/index.php/admin` → Configuration → Themes): check that `hotel-classic` is listed and extends `vanilla`, install it, then Reset it so the manifest is re-read (research R-01). In Theme options check `placeholdernotice = on`, `showpopups = 0`, `showclearall = off`, `questionhelptextposition = top`, `brandlogo = off`. Check that `tokens.css`, `fonts.css`, `hotel.css` and `custom.js` load after vanilla's assets, with DevTools → Network on a preview page. Run `./scripts/validate.sh` and expect `validate: ok`. Repeat the Reset after every later `THEME/config.xml` change.
- [x] T015 Create the survey in the admin with exactly the settings in `data-model.md` §1 and `contracts/survey-definition.md` "Settings": base language `en`, additional language `fa` and no others (FR-004); theme `hotel-classic`; format question by question (`S`); welcome screen on; "There are X questions" off; group name and description hidden; question number and code hidden; progress bar on; backward navigation on; question index off; save and resume off; anonymized `Y`; IP address `N`; referrer URL `N`; date stamp `Y`; save timings `N`; no participant table (open access); cookie to prevent repeat participation `N`; privacy policy notice not shown; `navigationdelay = 0`. Survey description: "Development placeholder brand". Create one group `G1` "Guest survey". Settle all of this before activation (T018), because anonymity cannot change once responses exist.
- [x] T016 Add the nine questions to group `G1` in the admin, in this order, exactly per `data-model.md` §3: `Q1OVERALL`, `Q2CLEAN`, `Q3COMFORT`, `Q4STAFF`, `Q5BREAKFAST`, `Q6FACILITIES` as List (radio) `L`, Mandatory `Y`, answer codes `1`–`5` ("`1`–`5` (no N/A)" for Q5), help text "1 = Very poor, 5 = Excellent". `Q7RECOMMEND` as `L`, Mandatory `Y`, answer codes `0`–`10`, help text "0 = Not at all likely, 10 = Extremely likely". `Q8LIKED` and `Q9IMPROVE` as Long free text `T`, Mandatory `N`, no `maximum_chars` ("No maximum length is set"; "empty or whitespace-only text is accepted"). Use the English question text from spec FR-009 and answer labels `1`…`5` and `0`…`10`. Set the question attribute "CSS class" to `hotel-scale hotel-scale-5` on Q1–Q6, `hotel-scale hotel-scale-11` on Q7 and `hotel-comment` on Q8–Q9, so `hotel.css` can target them without extra Twig. No other questions, hidden fields or equations (FR-009, FR-011, FR-012, FR-013, FR-036).
- [x] T017 Enter the Persian (`fa`) content for all nine questions in the admin: question text from the spec string table, help text («۱ = بسیار ضعیف، ۵ = عالی» and «۰ = اصلاً احتمال ندارد، ۱۰ = به احتمال بسیار زیاد»), and answer labels in Persian digits ۱…۵ and ۰…۱۰ (planned default, research R-05). Codes stay the same as `en`. Enter the survey title for both languages: "Paradise Garden Hotel – Guest survey" / «نظرسنجی مهمانان – باغ پردیس» (FR-007 page titles). The Persian content is a proposal pending fluent-speaker review (A-05).
- [x] T018 Check the survey with the admin's built-in survey consistency check and preview it in both languages. Then activate it (`contracts/survey-definition.md` "Activation"). Note the survey ID and the guest URL `http://hotelsurvey.localhost/index.php/<sid>` in `scratch/m2-notes.txt`. After activation, welcome, end and question texts can still be edited, but question types and codes cannot.

**Checkpoint**: Theme installed, survey active in `en` and `fa`, `validate.sh` passes. User-story work can start.

---

## Phase 3: User Story 1 - Guest completes the survey in their language (Priority: P1) MVP

**Goal**: Welcome, nine questions and thank-you screens fully in English or Persian, with browser-language start, a welcome-only language selector, progress bar and step text, Back/Continue/Submit labels (no Back on Q1), RTL on Persian screens, the brand header and the placeholder notice.

**Independent Test**: quickstart.md W1–W6 at 360px and 390px. Complete the survey once in English and once in Persian. Every guest-visible string is in the chosen language, Persian screens are RTL, and two completed responses are stored with `startlanguage` `en` and `fa`.

### Implementation for User Story 1

- [x] T019 [US1] Enter the welcome text and end text for `en` and `fa` in the admin (survey text elements). Welcome: tagline heading "Your experience matters" / «تجربهٔ شما برای ما ارزشمند است», the FR-002 message, a short intro, and "About 2 minutes" / «حدود ۲ دقیقه». End: "Thank you" / «سپاسگزاریم» and the FR-020 appreciation message. Use the exact texts from the spec string table. No personal-data questions and no formal privacy notice (A-09). Covers FR-001, FR-002, FR-003, FR-019, FR-020.
- [x] T020 [P] [US1] Override `THEME/views/subviews/header/nav_bar.twig`, based on the vanilla copy from T003. Render the brand header with `brand.wordmark()` and `brand.names()`. Render the placeholder notice (`i18n.t('notice.placeholder', aSurveyInfo.languagecode)`, small text, `role="note"`) only when `aSurveyInfo.options.placeholdernotice == 'on'`, and output no wrapper when it is off. Remove the language top menu include so no language control shows after the welcome screen. Keep whatever vanilla needs for pjax and layout. Covers FR-006, FR-021, FR-030, FR-037, research R-15, contract §4.
- [x] T021 [P] [US1] Override `THEME/views/subviews/header/progress_bar.twig`. Render a thin bar (`role="progressbar"` with `aria-valuemin`, `aria-valuemax` and `aria-valuenow`) and step text `i18n.t('progress.step', lang)` with `%1` = `digits(currentstep + 1)` and `%2` = `digits(total)` from `aSurveyInfo.progress`. Render nothing on the welcome and thank-you screens. First record in `scratch/m2-notes.txt` the real `currentstep` value on the welcome screen, Q1 and Q9, and check that `progress.total` is 9 (research R-02 Verify), and use those values. Covers FR-016, US1-AS5.
- [x] T022 [P] [US1] Override `THEME/views/subviews/navigation/navigator.twig`. Keep vanilla's button names, ids and `type` attributes (from `scratch/vanilla-views/NOTES.txt`) so the engine still handles navigation. Labels come from `i18n.t`: "Start survey" on the welcome screen, "Continue" on question screens, "Submit" on the last question, "Back" from Q2 onward. Hide Back on Q1 and on the welcome screen whatever `aMovePrev.show` says (research R-02), using the step values recorded in T021. Covers FR-010, FR-017, US1-AS6.
- [x] T023 [P] [US1] Override `THEME/views/subviews/navigation/language_changer_first_page.twig` (research R-07). Two plain links, "English" (`lang="en" dir="ltr"`) and «فارسی» (`lang="fa" dir="rtl"`), pointing to `aSurveyInfo.surveyUrl` with `lang=en` / `lang=fa`. Add a visually labelled group named by `i18n.t('lang.label')`, `aria-current="true"` on the current language, and each link at least `var(--touch-min)` high. If pjax swaps the page without updating `<html lang dir>`, add `data-pjax="false"` or vanilla's equivalent opt-out (research R-19). Covers FR-005, edge case "Switching language on the welcome screen".
- [x] T024 [US1] Check that no language control appears on question or thank-you screens in either language (FR-006). Only if one still appears after T020, override `THEME/views/subviews/navigation/language_changer_top_menu.twig` so it renders nothing. Record the result in `scratch/m2-notes.txt`.
- [x] T025 [US1] Add the browser-language redirect to `THEME/scripts/custom.js` per `contracts/theme-contract.md` §6 and research R-06. Run only when the welcome-screen marker from T003 is present, the URL has no `lang` parameter, `document.documentElement.lang` is `en`, and the sessionStorage key `hotelLangChecked` is not set. Set the key first (in try/catch, so blocked storage means no redirect). Then, if the first `fa`/`fa-*` entry in `navigator.languages` ranks above the first `en`/`en-*` entry (or there is no `en` entry), call `location.replace` with the same URL and `lang=fa` set through `URLSearchParams`. No network calls, no console output, no reading of form fields (FR-025, FR-034). Runs once per tab session, so it never overrides the guest's own choice. Covers FR-005, A-01, SC-012.
- [x] T026 [P] [US1] Override `THEME/views/subviews/content/submit.twig` (thank-you). Show a neutral inline-SVG check icon using `currentColor` (no hex) with an accessible label `i18n.t('done.icon_label')`, the end-text heading and message from the survey content, and `brand.names()` with both hotel names. No progress, navigation or language control. Covers FR-019, FR-020, FR-021, US1-AS8, A-11.
- [x] T027 [US1] Add the US1 layout rules to `THEME/css/hotel.css` that the screens need to be usable before the full visual design: hide vanilla elements the overrides replace, make the brand header and notice readable, set `text-align: start`, and use logical properties so Persian pages lay out RTL (FR-031). Tokens only.

### Verification for User Story 1

- [x] T028 [US1] Run quickstart.md W1–W4 at 360px and 390px in fresh incognito windows: English browser (W1), `fa-IR` / `fa, en` languages (W2, one reload into Persian with `<html lang="fa" dir="rtl">`), `de` browser (W3, English), and switching English ↔ فارسی on the welcome screen with no response created (W4). Record pass/fail in `scratch/m2-notes.txt`. Covers SC-012, US1-AS1, US1-AS2.
- [x] T029 [US1] Run quickstart.md W5 and W6 at 360px and 390px: a full English run and a full Persian run, answering Q1–Q7 and leaving Q8–Q9 empty. Check the progress bar and step text on all nine screens, no Back on Q1, Back keeps answers, the right Submit label, the thank-you screen with icon, heading, message and both names, every string in the chosen language including page titles, and RTL plus a bar filling from the right on every Persian screen. Time each run against 2 minutes. Covers US1-AS3–AS8, SC-001, SC-002, SC-009, SC-010.

**Checkpoint**: US1 works in both languages. This is the MVP.

---

## Phase 4: User Story 2 - Required answers are enforced, optional ones are not (Priority: P1)

**Goal**: Q1–Q7 cannot be skipped and show the translated hotel message next to the question, with an error colour and an icon. Q8–Q9 are marked "Optional" and can be left empty.

**Independent Test**: quickstart.md W7 and W8 in both languages. 7 of 7 required questions are blocked with a translated message, and 2 of 2 optional questions can be skipped.

### Implementation for User Story 2

- [x] T030 [P] [US2] Override the core view at `THEME/views/survey/questions/question_help/mandatory_tip.twig` (research R-09). Keep the element and class that the Expression Manager toggles (from the core copy in T003). Render both language variants as `<span class="hotel-i18n" lang="en">Please choose an answer to continue.</span>` and `<span class="hotel-i18n" lang="fa" dir="rtl">لطفاً برای ادامه یک گزینه را انتخاب کنید.</span>`, with the strings taken from the `question.required_msg` key in `i18n.twig` if that view can import it. Add an inline-SVG error icon (`currentColor`, `aria-hidden="true"`) and `role="alert"`. Check that the theme copy is the one rendered. If it is not, use the R-09 fallback (keep the core view, restyle `.ls-question-mandatory`, and put the dual-language spans in the vanilla question container view) and record which path was used in `scratch/m2-notes.txt`. Covers FR-014, FR-007.
- [x] T031 [P] [US2] Override the question-text view found in T003 at `THEME/views/subviews/survey/question_subviews/question_text_content.twig` (or the nearest vanilla view, same relative path). When the question is not mandatory, render the `i18n.t('question.optional', lang)` marker next to the heading. Keep vanilla's mandatory handling otherwise, and hide the asterisk on mandatory questions only if it would show untranslated text. Covers FR-013, US2-AS4.
- [x] T032 [US2] Add the validation-message and optional-marker rules to `THEME/css/hotel.css`: message in `var(--color-error)` with the icon as a non-colour cue, placed with logical properties so it mirrors on RTL pages; the optional marker in `var(--color-text-muted)` at `var(--size-label)`. Confirm in Theme options that `showpopups = 0`, so no popup modal appears (contract §4, FR-014, FR-031).

### Verification for User Story 2

- [x] T033 [US2] Run quickstart.md W7 and W8 at 360px in both languages: Continue with no answer on each of Q1–Q7 (stays on the question, hotel message in the right language with error colour and icon, message clears after answering), and Q8–Q9 empty and then whitespace-only (moves on with no message, "Optional" marker visible). Record 7/7 and 2/2 per language in `scratch/m2-notes.txt`. Covers US2-AS1–AS4, SC-003.

**Checkpoint**: US1 and US2 both work.

---

## Phase 5: User Story 3 - Survey looks and feels like the hotel on a phone (Priority: P2)

**Goal**: Classic-hotel visual design from tokens only, Persian-capable typefaces, rating tiles and the 0–10 grid, the gold selected state with a non-colour cue, 48px touch targets, a 680px column, no horizontal scroll from 320px in either direction, and the switchable placeholder notice.

**Independent Test**: quickstart.md W9, W12–W17 at 320, 360 and 390px and desktop in both languages. Measurements and the contrast check meet SC-004, SC-006, SC-007, SC-008, SC-010 and SC-011.

### Implementation for User Story 3

All tasks in this phase edit `THEME/css/hotel.css`, so they run in order. Use only `var(--…)` tokens and logical properties (`margin-inline-*`, `padding-inline-*`, `inset-inline-*`, `text-align: start`).

- [x] T034 [US3] Base layout in `THEME/css/hotel.css`: page background `--color-bg`, cards `--color-surface` with `--radius-card` and a `--color-border` border, text `--color-text`, secondary text `--color-text-muted`, content column centred with `max-width: var(--width-survey)` and full width on phones, a 4px spacing scale from `--space-*`, and overflow guards (`max-width: 100%` on media, `overflow-wrap: anywhere` on long words) so nothing scrolls horizontally from 320px (FR-027, FR-029, FR-031, US3-AS1, US3-AS4).
- [x] T035 [US3] Typography in `THEME/css/hotel.css`: headings in `var(--font-heading)` and body and UI text in `var(--font-body)`, at sizes `--size-h1` 32px, `--size-h2` 24px, `--size-h3` 18px, body `--size-body` / `--size-body-sm` (15–16px), supporting `--size-support` 13px, labels `--size-label` (11–12px), for both languages through the `:lang(fa)` swap from T009. The wordmark stays in the Latin heading font in `--color-accent` on ivory, as decorative text only. Gold is never used for body-size text (FR-028, FR-030, FR-032, US3-AS5).
- [x] T036 [US3] Brand header and placeholder notice styling in `THEME/css/hotel.css`: wordmark, tagline and bilingual names laid out for both directions. The notice is small `--size-label` text in `--color-text-muted` or `--color-text` (AA contrast), does not cover controls, leaves no gap when the option is off, and never causes horizontal scroll (FR-037, US3-AS7).
- [x] T037 [US3] Rating tiles in `THEME/css/hotel.css` for `.hotel-scale` (research R-03). Turn the radio list into tappable tiles: `.hotel-scale-5` is one row of 5 equal tiles; `.hotel-scale-11` is a grid with 6 columns from 360px and 4 columns below 360px. Each tile has `min-height: var(--touch-min)`, `--radius-control` and a `--space-2`-or-larger gap, so a tap does not hit a neighbour. Keep the real radio inputs accessible (visually hidden, not `display: none`). The grid follows the reading direction (research R-04 default). Leave the single-rule switch `[dir="rtl"] .hotel-scale { direction: ltr; }` commented out with a note that it is pending operator review. Covers FR-011, FR-012, US3-AS2.
- [x] T038 [US3] Selected and focus states in `THEME/css/hotel.css` per contract §5: `input:checked + label` (or vanilla's equivalent) gets a `--color-accent` border or fill plus a non-colour cue (`--border-width-selected` and a check glyph through `::after`, placed with logical properties). Text stays `--color-text`. `:focus-visible` gets an outline in the focus token that looks different from the selected state (US3-AS3, FR-032).
- [x] T039 [US3] Navigation buttons in `THEME/css/hotel.css`: `min-height: var(--touch-min)`, `--radius-control`, a primary Continue/Submit/Start button in espresso and ivory tokens (gold only as an accent such as a border or hover rule), Back as a secondary button, and a flex row whose order mirrors on RTL pages through normal flow (no hard-coded left/right). No heavy gradients or heavy animation (FR-029, FR-031).
- [x] T040 [US3] Progress bar styling in `THEME/css/hotel.css`: track `--color-border`, fill `--color-accent`, height `--progress-height`, filling from the inline start (from the right on RTL pages), with the step text in `--size-support` muted text (FR-016).
- [x] T041 [US3] Comment fields in `THEME/css/hotel.css` for `.hotel-comment textarea`: full width, `--radius-control`, a `--color-border` border, a comfortable `min-height`, and `unicode-bidi: plaintext; text-align: start;` (research R-14). No JavaScript (edge case "Mixed-direction comments").
- [x] T042 [US3] Thank-you and engine error-page styling in `THEME/css/hotel.css`: check icon in `--color-success`, heading and message spacing, bilingual names. Basic token styling for vanilla's `layout_errors` page (research R-11 risk) so the session-expired screen still matches the theme.

### Verification for User Story 3

- [x] T043 [US3] Phone-viewport check at `http://hotelsurvey.localhost` (quickstart.md W12, W13): at 320, 360 and 390px in both languages, on the welcome screen, a 1–5 question, Q7, Q8 and the thank-you screen, run `document.documentElement.scrollWidth <= innerWidth` in the console and measure every tile, button and language link as 48px or more high. Repeat at 200% zoom at 360px. Check a desktop width shows a centred column of 680px or less. Record the results in `scratch/m2-notes.txt`. Covers SC-004, US3-AS1, US3-AS2, US3-AS4.
- [x] T044 [US3] Design and RTL review (quickstart.md W6 visual pass, W16): for each screen type in both languages, check that colours, typefaces, sizes, radii and spacing trace back to tokens, that Persian screens are RTL with mirrored navigation, progress, icons and markers, and that both hotel names display correctly. Run an AA contrast check (DevTools or axe) on every screen type. Covers SC-006, SC-007, SC-010, US3-AS5, US3-AS6.
- [x] T045 [US3] Fonts and performance (quickstart.md W14, W15, W9): in DevTools → Network, check there are zero third-party requests and that each screen is usable within 3 s on "Fast 4G" throttling. Block `fonts/` requests and check that the fallbacks keep the layout and that Persian stays readable. Paste 1,200 characters of mixed Persian and English into Q8 and check it shows in its natural direction and is accepted. Do not record the text. Covers SC-008, the edge cases "Fonts fail to load" and "Very long comment".
- [x] T046 [US3] Placeholder-notice switch (quickstart.md W17): with `placeholdernotice = on`, check the notice is on all 11 page types in both languages. Set it to `off` in Themes → hotel-classic → Theme options, check it is gone from all 11 with no gap, then set it back to `on`. Covers SC-011, FR-037.

**Checkpoint**: US1–US3 work, and the design is verified on phone viewports.

---

## Phase 6: User Story 4 - Guest feedback is anonymous by default (Priority: P2)

**Goal**: No personal-data fields. Stored responses hold only answers, the submission time and the language. No custom code logs comments.

**Independent Test**: Complete a survey, then inspect the response in the admin (quickstart.md §5).

### Verification for User Story 4

- [x] T047 [US4] In the admin, check the active survey's settings against `data-model.md` §1: anonymized `Y`, IP address `N`, referrer URL `N`, date stamp `Y`, save timings `N`, no participant table, cookie `N`, privacy notice not shown. Check there is no name, email, phone or contact question and no hidden or room field (FR-023, FR-024, FR-036, US4-AS1). Record the result in `scratch/m2-notes.txt`.
- [x] T048 [P] [US4] Audit the custom code for comment handling (FR-025): `grep -nE "console\.|fetch\(|XMLHttpRequest|sendBeacon|localStorage|\.value" limesurvey/themes/hotel-classic/scripts/custom.js` returns only the reviewed `sessionStorage` language flag. Check that no Twig override in `THEME/views/` prints answer values outside the engine's own fields.
- [x] T049 [US4] Response check (quickstart.md §5): in Admin → Responses, every completed walkthrough row has `submitdate` set and `startlanguage` = `en` or `fa`, and no IP, referrer or token data. Do not copy comment text into notes, tickets or chat. Covers FR-008, FR-018, FR-024, US4-AS2, part of SC-005.

**Checkpoint**: Anonymity confirmed.

---

## Phase 7: User Story 5 - Accidental duplicate submission is avoided (Priority: P3)

**Goal**: A double tap, refresh or Back after Submit never creates a second completed response. A new session can still start a fresh survey.

**Independent Test**: quickstart.md W10 and W11, then count completed responses.

### Implementation for User Story 5

- [x] T050 [US5] Check the engine on its own first (research R-11): note the completed-row count, double-tap Submit on Q9 at 360px (DevTools touch emulation), refresh the thank-you page, use browser Back, and count completed rows again. Record in `scratch/m2-notes.txt` whether exactly one row was added and whether core JavaScript already disables Submit.
- [x] T051 [US5] Only if T050 shows a duplicate or an active second submit: add the submit guard to `THEME/scripts/custom.js` (contract §6). Use one delegated `submit` listener on `document` for the survey form (it must survive pjax swaps, research R-19). On the first submit, set `disabled` on the form's navigation buttons after the browser has captured the submitter's name and value, so the engine still receives the move. Never read field values. Mark the task as skipped if the engine already prevents duplicates. Covers FR-022, FR-034. (skipped: the engine already prevents a duplicate, see T050)

### Verification for User Story 5

- [x] T052 [US5] Run quickstart.md W10 and W11 in both languages: exactly one new completed response per run after a double tap, refresh and Back, and the guest is never shown earlier answers in an editable state. A new incognito window on the same URL starts a fresh, empty survey. Covers US5-AS1–AS3, SC-005, A-07.

**Checkpoint**: All five user stories work.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Export the survey, write the documentation, run the final static and walkthrough checks, and report.

- [x] T053 Export the survey structure from the admin (Survey → Export → Survey structure `.lss`) to `limesurvey/survey/hotel-guest-survey.lss`, structure only, never responses (`contracts/survey-definition.md` "Export rules"). Check that the file contains both languages, the nine question codes, the settings from `data-model.md` §1 and the description "Development placeholder brand", and that it contains no response data or secrets. Re-export after any later admin change.
- [x] T054 [P] Add `limesurvey/survey/hotel-guest-survey.lss` to the `required` list in `scripts/validate.sh`, and check that it is well-formed XML the same way as `config.xml` (T012).
- [x] T055 [P] Update `limesurvey/themes/hotel-classic/README.md`. Cover the file structure (contract §1), the new CSS file names in place of the old "css/theme.css that imports tokens.css" step (research R-01), the placeholder-brand warning (FR-030), how to switch `placeholdernotice` off at launch, the need to Reset the theme after `config.xml` changes, the brand replacement steps (contract §7), the font sources and OFL licences, how to import `limesurvey/survey/hotel-guest-survey.lss`, and the open items (Persian copy review, rating direction R-04, digit style R-05, Persian typefaces R5, language-scope conflict R1). Do not edit `AGENTS.md`, `hotelSurveyPRD.md` or `docs/brand.md`.
- [x] T056 Run `./scripts/validate.sh` and expect `validate: ok`. Then add a temporary hex colour to `THEME/css/hotel.css` and a `fonts.googleapis.com` string to `THEME/css/fonts.css`, check that each makes the script fail, and remove both again (SC-006, SC-008).
- [x] T057 Final regression of the full quickstart.md (§1–§5, W1–W17) at 320, 360 and 390px and a desktop width, in both languages, against `http://hotelsurvey.localhost`, after the last CSS and Twig change and a theme Reset. Record pass/fail per walkthrough in `scratch/m2-notes.txt`.
- [x] T058 Scope audit. Check that nothing changed outside `limesurvey/themes/hotel-classic/`, `limesurvey/survey/`, `scripts/validate.sh` and `scratch/` (use `git status` / `git diff --stat` if available). In particular, no change to `docker-compose.yml`, `db/init/`, LimeSurvey core, `AGENTS.md`, `hotelSurveyPRD.md`, `docs/brand.md` or `docs/decisions.md`, no room tokens or room fields, `.env` and `backups/` untracked, and nothing committed or pushed.
- [x] T059 Write the Milestone 2 completion report for the operator in the session hand-off, not as a new repo file. Give results against PRD §8 Milestone 2 and SC-001–SC-012, the verification notes from `scratch/m2-notes.txt` (no comment text), and the open items still pending from plan.md Risks: R1 language-scope documents, R2 rating direction, R3 digit style, R4 Persian copy review, R5 Persian typefaces, R11 partial-response retention, R13 placeholder brand before production.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (operator gate) blocks everything after it. T002–T005 can run in parallel once the operator has answered.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories. Order: T006, T007 → T008/T009/T010 in parallel → T011 → T012, T013 → T014 (install) → T015 → T016 → T017 → T018 (activate).
- **US1 (Phase 3, P1)**: Depends on Phase 2. This is the MVP.
- **US2 (Phase 4, P1)**: Depends on Phase 2. Its Twig files are separate from US1's, so it can run alongside US1. T032 and T027 both edit `hotel.css`, so do them one after the other. W7/W8 verification is easiest after US1's navigator (T022).
- **US3 (Phase 5, P2)**: Depends on Phase 2. The styling targets the markup from US1 (T020–T026) and US2 (T030–T031), so start it after those overrides exist.
- **US4 (Phase 6, P2)**: Depends on Phase 2 (settings in T015). T049 needs completed responses from US1 runs. T048 needs `custom.js` from T025, and from T051 if that runs.
- **US5 (Phase 7, P3)**: Depends on US1 (a working Submit and thank-you screen).
- **Polish (Phase 8)**: Depends on all stories. T053 (export) comes after the last admin change. T057 comes after the last theme change.

### User Story Dependencies

- **US1**: none beyond Foundational.
- **US2**: none beyond Foundational. Shares `hotel.css` with US1 and US3, so edits to that file happen in order.
- **US3**: styles the US1 and US2 markup. It can be tested on its own once those views exist.
- **US4**: verification only. It needs completed responses (from US1).
- **US5**: needs US1's submit flow.

### Within Each User Story

- Twig overrides first, then `hotel.css` rules, then verification.
- Survey content (admin) before the views that show it are checked.
- Re-export the `.lss` (T053) after any admin change made during a story.

### Parallel Opportunities

- Phase 1: T003, T004 and T005.
- Phase 2: T008, T009 and T010 (separate files, after T006 and T007).
- US1: T020, T021, T022, T023 and T026 (separate Twig files).
- US2: T030 and T031 (separate Twig files). They can also run alongside the US1 Twig tasks.
- US4: T048 alongside T047.
- Polish: T054 and T055.
- Not parallel: anything that edits `THEME/css/hotel.css` (T009, T027, T032, T034–T042), `THEME/scripts/custom.js` (T013, T025, T051), `scripts/validate.sh` (T012, T054), or the admin survey (T015–T019).

---

## Parallel Example: User Story 1

```text
# After Phase 2, launch the independent Twig overrides together:
Task: "T020 Override THEME/views/subviews/header/nav_bar.twig (brand header + notice, no language menu)"
Task: "T021 Override THEME/views/subviews/header/progress_bar.twig (bar + Question N of 9)"
Task: "T022 Override THEME/views/subviews/navigation/navigator.twig (no Back on Q1, translated labels)"
Task: "T023 Override THEME/views/subviews/navigation/language_changer_first_page.twig (English / فارسی links)"
Task: "T026 Override THEME/views/subviews/content/submit.twig (thank-you)"
# Then run in order: T024 → T025 (custom.js) → T027 (hotel.css) → T028 → T029
```

## Parallel Example: User Story 2

```text
Task: "T030 Override THEME/views/survey/questions/question_help/mandatory_tip.twig"
Task: "T031 Override THEME/views/subviews/survey/question_subviews/question_text_content.twig (Optional marker)"
# Then: T032 (hotel.css, after T027) → T033
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Get the operator's answer to the T001 gate.
2. Complete Phase 1 and Phase 2: theme installed, survey active in `en` and `fa`, `validate.sh` passing.
3. Complete Phase 3 (US1).
4. **Stop and validate**: W1–W6 at 360px and 390px in both languages.

### Incremental Delivery

1. Setup + Foundational → theme and survey ready.
2. US1 → bilingual flow works (MVP).
3. US2 → required and optional behaviour confirmed (completes the P1 scope).
4. US3 → full hotel visual design, verified on phone viewports.
5. US4 → anonymity confirmed.
6. US5 → duplicate protection confirmed (the guard is added only if needed).
7. Polish → `.lss` export, README, final `validate.sh` and quickstart regression, scope audit, report.

---

## Notes

- `THEME` = `limesurvey/themes/hotel-classic/`. Reset the theme in the admin after every `config.xml` change.
- [P] tasks touch different files and have no dependency on an unfinished task.
- Admin tasks (T014–T019, T046–T047, T053) change LimeSurvey state only through its supported UI, never through SQL.
- Persian copy, rating direction (R-04), digit style (R-05) and the Persian typefaces (R5) ship as marked, reversible defaults pending operator or reviewer sign-off.
- Never write guest comment text into `scratch/`, logs, tickets or chat.
- Do not commit or push.

## Phase 9: Convergence

- [x] T060 [US3] Make the engine error page (vanilla `layout_errors` view, e.g. session expired or invalid request) show Persian text on Persian sessions instead of the English core string recorded in `scratch/m2-notes.txt`: add a theme-level override of the error view under `limesurvey/themes/hotel-classic/views/` (no core edits) that renders a translated fa/en message via `subviews/hotel/i18n.twig`, then re-check one error page in each language. If the language cannot be determined on that page, show both languages. Record the 404-for-unknown-survey-id case (core default template) as an accepted limitation. Per FR-007, research R-11 (partial)
