# Contract: Bale manager ping

## Configuration (`.env` + compose `limesurvey.environment`)

| Variable | Required | Notes |
|---|---|---|
| `BALE_BOT_TOKEN` | for live send | Never passed to the browser. Empty = skip |
| `BALE_CHAT_ID` | for live send | Manager chat or group id. Empty = skip |
| `BALE_API_BASE` | no | Default `https://tapi.bale.ai` (no trailing slash) |

Do not add Telegram hosts. `validate.sh` fails if `app/` or `scripts/` contain `api.telegram.org`.

## HTTP

`POST {BALE_API_BASE}/bot{BALE_BOT_TOKEN}/sendMessage`

Body (application/json or form): `chat_id`, `text` only. No `parse_mode` that would embed guest text. Timeout ≤ 5s.

## `text` builder (unit-tested)

Inputs (all required; **no comment parameter exists**):

| Input | Source |
|---|---|
| `dept_fa` | Map from department code → Persian label (data-model §1) |
| `overall` | integer 1–5 |
| `nps` | integer 0–10 |
| `hotel_fa` | `مجتمع کوثر ملکشهر` |
| `when_fa` | `اکنون` at send time (relative “now”) |

Exact lines (newline-separated, no trailing guest text):

```text
بازخورد جدید · {dept_fa}
امتیاز کلی: {overall}/5
NPS: {nps}
{hotel_fa}
{when_fa}
```

ASCII digits in the Bale body (messenger-side). Do not interpolate Q8/Q9.

## Outcomes

| Condition | Queue | Guest thank-you | Log |
|---|---|---|---|
| Token/chat missing | Inserted | Shown | `bale: skipped` |
| HTTP success | Inserted | Shown | `bale: sent` |
| HTTP/network error | Inserted | Shown | `bale: failed status=N` (no body) |

At most one send per queue row (send only when `INSERT` created the row).
