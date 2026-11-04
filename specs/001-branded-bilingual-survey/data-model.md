# Data Model: Branded Bilingual Guest Survey (Milestone 2)

No custom database tables are added in this milestone. Every entity below is either LimeSurvey survey content (created in the admin and stored by LimeSurvey in its own tables through its own UI) or a file in the child theme. Nothing is written to LimeSurvey core tables by custom SQL.

## 1. Survey (LimeSurvey survey, admin-managed)

| Field | Value | Requirement |
|---|---|---|
| Base language | `en` | FR-004, A-01 |
| Additional languages | `fa` | FR-004 |
| Theme | `hotel-classic` | FR-035 |
| Format | Question by question (`S`) | FR-010 |
| Welcome screen | On | FR-001 |
| Show "There are X questions" | Off (time is stated in the welcome text) | FR-003 |
| Group name / description | Hidden | FR-010 |
| Question number / code | Hidden | FR-010 |
| Progress bar | On (theme renders bar + step text) | FR-016 |
| Allow backward navigation | On (theme hides Back on Q1) | FR-010, FR-017 |
| Question index | Off | Scope |
| Save and resume later | Off | A-08 |
| Anonymized responses | Yes | FR-024 |
| Save IP address | No | FR-024 |
| Save referrer URL | No | FR-024 |
| Date stamp | Yes (needed for a real submit date when anonymized) | FR-018 |
| Save timings | No | Data minimisation |
| Participant table | None (open access) | FR-023, FR-036 |
| Cookie to prevent repeat participation | No | A-07 |
| Privacy policy notice | Not shown (open GDPR item) | A-09 |
| Title (per language) | "Paradise Garden Hotel – Guest survey" / «نظرسنجی مهمانان – باغ پردیس» (proposed) | FR-007 (page titles) |
| Welcome text (per language) | Tagline heading, welcome message (FR-002), short intro, "About 2 minutes" | FR-001–FR-003 |
| End text (per language) | Thank-you heading and appreciation message (FR-020) | FR-019, FR-020 |

## 2. Question group

One group, `G1` "Guest survey" (name hidden from guests), containing the nine questions in order.

## 3. Question (9, fixed order)

| Order | Code | Type | Mandatory | Answer codes | Help text (en) |
|---|---|---|---|---|---|
| 1 | `Q1OVERALL` | List (radio) `L` | Y | `1`–`5` | 1 = Very poor, 5 = Excellent |
| 2 | `Q2CLEAN` | `L` | Y | `1`–`5` | same |
| 3 | `Q3COMFORT` | `L` | Y | `1`–`5` | same |
| 4 | `Q4STAFF` | `L` | Y | `1`–`5` | same |
| 5 | `Q5BREAKFAST` | `L` | Y | `1`–`5` (no N/A) | same |
| 6 | `Q6FACILITIES` | `L` | Y | `1`–`5` | same |
| 7 | `Q7RECOMMEND` | `L` | Y | `0`–`10` | 0 = Not at all likely, 10 = Extremely likely |
| 8 | `Q8LIKED` | Long free text `T` | N | – | Optional |
| 9 | `Q9IMPROVE` | `T` | N | – | Optional |

Validation rules:

- Q1–Q7: an answer is required to move on (`mandatory = Y`). No "No answer" option is rendered because the question is mandatory.
- Q8–Q9: empty or whitespace-only text is accepted. No maximum length is set (storage limit is the `text` column, far above the 1,000-character minimum).
- Codes are stable across languages. Only labels and texts are translated. Question codes are proposals and must stay stable once responses exist, because Milestone 4 reporting reads them.
- Answer labels: `en` uses `1`…`5` / `0`…`10`. `fa` uses the digit style chosen in the Persian review (planned default ۱…۵ / ۰…۱۰, research R-05).

## 4. Response (LimeSurvey response row, engine-managed)

| Field | Source | Notes |
|---|---|---|
| `id` | Engine | Sequential, not linked to a person |
| `submitdate` | Engine (`datestamp = Y`) | Null while incomplete. Set on completion (FR-018) |
| `startlanguage` | Engine | `en` or `fa` (FR-008) |
| `lastpage` | Engine | – |
| Q1–Q7 answer columns | Guest | Codes as above |
| Q8–Q9 text columns | Guest | **Sensitive**. Never logged by custom code (FR-025) |
| IP, referrer, token | – | Not stored (FR-024, FR-036) |

State transitions: *not started* → *started* (row created when the guest leaves the welcome screen) → *completed* (`submitdate` set on Submit). An abandoned row stays *started* with no `submitdate` and is not counted as completed (A-08; retention is the open GDPR item).

## 5. Theme strings (file: `views/subviews/hotel/i18n.twig`)

A key → `{en, fa}` map. Keys and texts follow the spec string table. Additional proposed keys, also pending Persian review:

| Key | English | Persian (proposed) |
|---|---|---|
| `nav.back` / `nav.continue` / `nav.submit` | Back / Continue / Submit | قبلی / ادامه / ارسال |
| `nav.start` | Start survey | شروع نظرسنجی |
| `progress.step` | Question %1 of %2 | پرسش %1 از %2 |
| `question.optional` | Optional | اختیاری |
| `question.required_msg` | Please choose an answer to continue. | لطفاً برای ادامه یک گزینه را انتخاب کنید. |
| `notice.placeholder` | Development preview – placeholder brand | پیش‌نمایش توسعه – نام تجاری موقت |
| `lang.label` | Language | زبان |
| `done.icon_label` | Feedback received | نظر شما دریافت شد |
| `brand.name_en` / `brand.name_fa` | Paradise Garden Hotel / باغ پردیس | (same values, not translated) |
| `brand.tagline` | Your experience matters | تجربهٔ شما برای ما ارزشمند است |

Constant: `persianDigits` (bool, default `true`) used by the `digits()` macro (research R-05).

## 6. Theme options (file: `config.xml` `<options>`)

| Option | Values | Default | Purpose |
|---|---|---|---|
| `placeholdernotice` | `on` / `off` | `on` | FR-037 single switch |
| `showpopups` | `0` | `0` | Validation message on the page, next to the question (FR-014) |
| `showclearall` | `off` | `off` | No "Clear all" |
| `questionhelptextposition` | `top` | `top` | Scale explanation above the answers |
| `brandlogo` | `off` | `off` | Wordmark is text, no logo image (A-11) |

## 7. Design tokens (file: `css/tokens.css`)

Existing tokens are kept. Added: `--font-heading-fa`, `--font-body-fa`, and only those further tokens that `hotel.css` needs (for example `--size-body-sm`, `--progress-height`, `--border-width`). Contract: `contracts/theme-contract.md` §3.
