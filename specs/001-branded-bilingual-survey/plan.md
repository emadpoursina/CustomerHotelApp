# Implementation Plan: Branded Bilingual Guest Survey (Milestone 2)

**Branch**: `milestone-2-design-survey` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-branded-bilingual-survey/spec.md`

## Summary

Deliver the guest survey (welcome, nine questions, thank-you) in English (base) and Persian (RTL), branded with the placeholder Paradise Garden Hotel / باغ پردیس identity. The approach adds nothing beside LimeSurvey. It has three parts:

1. A `hotel-classic` child theme that extends `vanilla` through `config.xml`. It is styled only from `css/tokens.css`, uses self-hosted fonts, overrides a small set of Twig views (brand header and notice, progress with step text, navigation labels, language selector, thank-you, the optional marker and the required message), and has one small script for browser-language detection.
2. The survey content and settings, built in the LimeSurvey admin and exported to `limesurvey/survey/hotel-guest-survey.lss`.
3. Static checks added to `scripts/validate.sh`.

No custom tables, no backend code, no room tokens.

## Technical Context

**Language/Version**: Twig templates (LimeSurvey 6 sandboxed Twig), CSS3 (custom properties, logical properties, grid), vanilla JavaScript (ES2017, one small file), Bash for `validate.sh`.

**Primary Dependencies**: LimeSurvey CE 6.17.18 (`martialblog/limesurvey:6-apache`) and its stock `vanilla` theme (Bootstrap 5, pjax). Self-hosted fonts, all SIL OFL 1.1: Cormorant Garamond, Inter, and proposed Noto Naskh Arabic and Vazirmatn (see research R-12).

**Storage**: MariaDB 11 via LimeSurvey's own tables, written only by LimeSurvey (survey content through the admin, responses through the engine). No new tables.

**Testing**: `./scripts/validate.sh` (static checks, extended), plus the scripted manual walkthroughs in `quickstart.md` with device emulation at 320/360/390px and desktop. No automated E2E suite this milestone (research R-18).

**Target Platform**: Mobile browsers (iOS Safari, Android Chrome) and desktop browsers. Local stack at `http://hotelsurvey.localhost`.

**Project Type**: Configuration and theming of an existing web application (LimeSurvey child theme plus survey definition).

**Performance Goals**: Each screen usable within 3 s on simulated 4G (SC-008). Fonts are WOFF2 with `font-display: swap`. No third-party requests.

**Constraints**: No LimeSurvey core file or core-table edits. Tokens are the only colour, type and spacing source. Touch targets ≥ 48px. No horizontal scroll from 320px. WCAG 2.1 AA contrast. Minimal JavaScript (FR-034). Anonymous by default. Comment text never logged.

**Scale/Scope**: One survey, 2 languages, 11 page types (welcome, 9 questions, thank-you), about 10 Twig overrides, 3 CSS files, 1 JS file, 4 font families.

No NEEDS CLARIFICATION items remain for planning. Open operator items are listed under Risks and Open Items. They have reversible defaults and do not block design.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles). The project's binding rules are in `AGENTS.md` and `docs/decisions.md` §1, so this gate checks those instead.

| Gate (source) | Pre-design | Post-design | Evidence |
|---|---|---|---|
| LimeSurvey is the engine. Do not rebuild survey functions (AGENTS.md) | Pass | Pass | Validation, navigation, progress, storage and language all use engine features. The theme only presents them |
| Customisation lives outside core: theme, `db/init/`, `scripts/` (AGENTS.md) | Pass | Pass, with one note | Theme and `scripts/validate.sh`. **Note**: a new `limesurvey/survey/` folder holds the `.lss` export. It is survey content, not code (research R-17) |
| Never modify core files or core tables (AGENTS.md, FR-035) | Pass | Pass | Core views are overridden from the theme path, not edited. Content and options change only through the admin UI |
| Custom data in separate tables (AGENTS.md) | N/A | N/A | No custom data |
| No microservices or unnecessary backend code (AGENTS.md) | Pass | Pass | No PHP plugin. Browser detection is client-side (research R-06) |
| Room-token rules (AGENTS.md) | N/A | N/A | No tokens in M2 (FR-036) |
| No account, anonymous, no names/emails (AGENTS.md) | Pass | Pass | `data-model.md` §1 settings |
| **Languages: Persian and English (AGENTS.md)** | Pass | Pass | Updated by the operator to Persian and English (Risk R1 resolved) |
| Required Q1–7, optional Q8–9 (AGENTS.md) | Pass | Pass | `data-model.md` §3 |
| Mobile-first, ≥ 48px, no horizontal scroll, minimal JS (AGENTS.md) | Pass | Pass | Theme contract §4 and §6 |
| Tokens only, gold for accents only (AGENTS.md) | Pass | Pass | Theme contract §3 and §5, validate.sh check |
| Secrets and guest comments (AGENTS.md) | Pass | Pass | No responses exported. Script never touches comment text |
| Open decisions: ask first (AGENTS.md) | Pass | Pass | No `docs/decisions.md` §2 item is decided |

**Gate result**: Pass. The operator updated `hotelSurveyPRD.md` FR-03, `AGENTS.md` and `docs/brand.md` to Persian and English, so the requirements match this spec.

## Project Structure

### Documentation (this feature)

```text
specs/001-branded-bilingual-survey/
├── plan.md                      # This file
├── research.md                  # Phase 0: decisions R-01 … R-19
├── data-model.md                # Phase 1: survey, questions, response, strings, options, tokens
├── quickstart.md                # Phase 1: validation walkthroughs W1–W17
├── contracts/
│   ├── theme-contract.md        # Theme files, config.xml, tokens, per-screen rendering, script
│   └── survey-definition.md     # Survey settings, questions, per-language content, export rules
├── checklists/                  # From /speckit.specify
└── tasks.md                     # Phase 2 (/speckit.tasks), not created here
```

### Source Code (repository root)

```text
limesurvey/
├── themes/hotel-classic/
│   ├── config.xml                         # new: extends vanilla, files, options (placeholdernotice)
│   ├── README.md                          # updated
│   ├── css/
│   │   ├── tokens.css                     # updated: remove Google import, add Persian font tokens
│   │   ├── fonts.css                      # new: @font-face, self-hosted
│   │   └── hotel.css                      # new: all hotel styling, tokens only, logical properties
│   ├── fonts/
│   │   ├── cormorant-garamond/  (woff2 + OFL.txt)
│   │   ├── inter/               (woff2 + OFL.txt)
│   │   ├── noto-naskh-arabic/   (woff2 + OFL.txt)    # proposed, pending operator OK
│   │   └── vazirmatn/           (woff2 + OFL.txt)    # proposed, pending operator OK
│   ├── scripts/custom.js                  # new: browser-language redirect (+ submit guard if needed)
│   └── views/
│       ├── subviews/hotel/{i18n,brand}.twig
│       ├── subviews/header/{nav_bar,progress_bar}.twig
│       ├── subviews/navigation/{navigator,language_changer_first_page}.twig
│       ├── subviews/content/submit.twig
│       ├── subviews/survey/question_subviews/question_text_content.twig
│       └── survey/questions/question_help/mandatory_tip.twig
└── survey/
    └── hotel-guest-survey.lss             # new: admin export (structure only, no responses)

scripts/validate.sh                        # updated: theme files exist, no hex outside tokens.css,
                                           # no Google Fonts URLs, config.xml well-formed
```

**Structure Decision**: Everything lives in the existing child-theme directory, which is already mounted read-only into the container, plus one export file and the validation script. `docker-compose.yml`, `db/init/` and LimeSurvey core are not touched. No new mounts are needed.

## Implementation Approach (phased, for /speckit.tasks)

1. **Foundation**: `config.xml` (extends vanilla), `tokens.css` update, self-hosted fonts and `fonts.css`, empty `hotel.css`. Install and reset the theme in the admin, select it for a draft survey. Extend `validate.sh`.
2. **Survey content (P1)**: Build the survey per `contracts/survey-definition.md` in both languages, with the settings from `data-model.md` §1. Confirms engine-native validation, progress values, `startlanguage` and anonymity (research R-02, R-10).
3. **Theme strings and brand (P1)**: `i18n.twig`, `brand.twig`, then the `nav_bar` (header + notice), `navigator`, `progress_bar`, `language_changer_first_page`, `submit`, optional-marker and `mandatory_tip` overrides.
4. **Language detection (P1)**: `custom.js` browser-language redirect (research R-06). Check pjax behaviour (R-19).
5. **Visual design (P2)**: `hotel.css`: tokens, typography per language, rating tiles and 0–10 grid, selected/focus states, RTL by logical properties, textarea bidi, notice styling, 680px column, error-page styling.
6. **Duplicate protection (P3)**: Verify engine behaviour. Add the submit guard only if needed (R-11).
7. **Validate and export**: Run `quickstart.md` W1–W17 and `validate.sh`, export the `.lss`, update the theme README, and report against PRD §8 Milestone 2.

## Risks, Assumptions and Open Items

| # | Item | Type | Impact | Handling |
|---|---|---|---|---|
| R1 | **Language-scope conflict**: `AGENTS.md`, `hotelSurveyPRD.md` FR-03 and `docs/brand.md` said German and English | Resolved (operator) | Those files would have described the wrong languages | The operator updated all three to Persian and English. Gate note above |
| R2 | Rating-scale direction on Persian screens (lowest on the right vs. Western left-to-right order) | Open (operator / Persian reviewer) | Visual only. Stored codes are unaffected | Default: follow reading direction (A-19). A one-rule CSS switch (research R-04) |
| R3 | Digit style on Persian screens (۰–۹ vs 0–9) | Open (Persian review) | Visual only | Default: Persian digits. One `persianDigits` constant plus `fa` answer labels (research R-05) |
| R4 | Persian copy not yet reviewed by a fluent speaker (spec strings plus the extra keys in `data-model.md` §5) | Open (operator) | Launch blocker, not an M2 build blocker | Ship as marked proposals. Review before launch |
| R5 | Persian typefaces and licence: Noto Naskh Arabic (headings) and Vazirmatn (body) proposed, both SIL OFL 1.1 | Open (operator confirms) | Changing fonts later is a `fonts/` + token change only | Include `OFL.txt` per family. Fallback stacks keep Persian readable (research R-12) |
| R6 | LimeSurvey has no browser-language detection for surveys. A client script provides it | Assumption | With JS off, Persian browsers see English first (the guest can still switch) | Fallback design: a small `beforeSurveyPage` plugin, only with operator approval (it is backend code) |
| R7 | `?lang=` URL parameter can switch language mid-survey | Known limitation | Only by deliberate URL editing. No control is offered (FR-006 is met) | Accept for M2. Revisit if a plugin is ever added |
| R8 | Overriding the core view `mandatory_tip.twig` and vanilla views couples the theme to 6.17 markup | Assumption | Upgrade may break styling or messages | Keep overrides minimal. Re-test the walkthroughs on every LimeSurvey upgrade |
| R9 | The engine's session-expired page (after a refresh or re-POST) uses LimeSurvey's core Persian and English wording | Assumption | Wording differs from the hotel voice. Still translated (FR-007) and styled | Accept for M2 |
| R10 | Theme options and survey content are stored by LimeSurvey in its own tables | Assumption | None. Written through the supported admin UI, not custom SQL | Within the AGENTS.md rule. `.lss` export keeps the content reproducible |
| R11 | Partial responses kept in the response table | Open (`docs/decisions.md` §2 item 4) | GDPR retention not decided | Not decided here (A-08) |
| R12 | New `limesurvey/survey/` path for the `.lss` export | Assumption | Small extension of "where customisation lives" | Survey content, not code. Operator may relocate it |
| R13 | Placeholder brand on guest pages and previews | Assumption (A-10) | Must not reach production | Notice on by default. README and `.lss` description say "development placeholder". Shared screenshots must show the notice |

## Complexity Tracking

No constitution violations requiring justification. The language-scope conflict (R1) is a requirements-source conflict owned by the operator, not a design complexity.
