# Contract: Department question (`QDEPT`)

Survey `420001` remains a single questionnaire. This file is the interface between LimeSurvey, the theme, seed, dashboard job, and PHP sync.

## 1. Question definition

| Property | Value |
|---|---|
| `title` | `QDEPT` |
| `type` | `L` (list radio) |
| `question_theme_name` | `listradio` |
| `mandatory` | `Y` |
| `other` | `N` |
| Group | existing gid 1 |
| Position | First question after welcome (`question_order` 0; Q1–Q9 orders shifted by +1) |
| Suggested `qid` in LSS | `10` (do not reuse 1–9) |

Question text (survey content, both languages in `.lss`):

- en: `Which department is this feedback about?`
- fa: `این بازخورد مربوط به کدام بخش است؟`

## 2. Answers

| `code` | en | fa |
|---|---|---|
| `restaurant` | Restaurant | رستوران |
| `reception` | Reception | پذیرش |
| `facilities` | Facilities | تاسیسات |
| `housekeeping` | Housekeeping | خانه‌داری |

Sort order: restaurant, reception, facilities, housekeeping. Codes are the only values written to the response column and the queue `department` field.

## 3. Theme behaviour

- Welcome, Q1–Q9, thank-you: existing contracts in spec 002 (`survey-theme.md`) unless this file overrides.
- `QDEPT` page: four large cards (≥48px), RTL in `fa`, no progress bar, Continue disabled until a card is selected (LimeSurvey mandatory + theme). Back is absent (first question).
- Q1 Back returns to `QDEPT`. Changing the selection updates the stored tag.
- Progress on Q1–Q9: `Question N of 9` (department does not count). **Verify** `aSurveyInfo.progress.currentstep` after the extra question.
- Rate URLs stay `/index.php/420001` with **no** `lang` parameter.

## 4. Storage

LimeSurvey writes the answer into `lime_survey_420001` as `{sid}X{gid}X{qid}`. Jobs and PHP resolve the column from `lime_questions` (`title = 'QDEPT'`), same allow-list pattern as Q1–Q7 (`^[0-9]+X[0-9]+X[0-9]+$`).

Implementers do not hand-write `ALTER TABLE lime_survey_420001`.

## 5. Seed

`scripts/seed-demo.py` posts `QDEPT` after welcome and before Q1, using the field name found in the form (never a hard-coded SGQA). Distribution: round-robin or seeded mix so all four codes appear. Host guard unchanged.
