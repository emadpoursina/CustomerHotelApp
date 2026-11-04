# Contract: Survey definition (LimeSurvey content)

The survey is created in the LimeSurvey admin (`http://hotelsurvey.localhost/index.php/admin`) and exported to `limesurvey/survey/hotel-guest-survey.lss`. The export is the reproducible record. Recreating the survey means importing this file through *Surveys → Import*. No SQL against LimeSurvey tables.

## Settings

Exactly the values in `data-model.md` §1. Any change to anonymity (`anonymized`, `ipaddr`, `refurl`), `datestamp`, `usecookie` or the language set is a requirements change and must go back to the spec.

## Questions

Exactly the nine questions in `data-model.md` §3, in that order, with the English text from spec FR-009 and the Persian text from the spec string table. Each question has text and help text in both languages. No question, hidden field or equation beyond these nine (FR-036: no room field in Milestone 2).

## Per-language content

| Content | en | fa |
|---|---|---|
| Survey title | Required | Required |
| Welcome text | Tagline heading, FR-002 message, intro, "About 2 minutes" | Same, from the string table |
| End text | "Thank you" heading, FR-020 message | Same, from the string table |
| Question text + help text | All nine | All nine |
| Answer labels | `1`–`5`, `0`–`10` | Digits per the Persian review (default Persian digits) |

The Persian content is marked as a proposal until a fluent Persian speaker has reviewed it (spec A-05).

## Export rules

- Export structure only. Never export or commit responses (guest comments are sensitive).
- Re-export after every admin change to content or settings, so the file and the database stay in step.
- The `.lss` file contains no secrets, but it does name the placeholder brand. Its survey description field says "Development placeholder brand".

## Activation

The survey is activated in the admin once both languages are complete. Activation creates LimeSurvey's own response table through LimeSurvey. That is engine behaviour, not a custom table change. Before activation, structural edits are free. After activation, changing question types or codes requires deactivation, which archives responses, so settle codes first.
