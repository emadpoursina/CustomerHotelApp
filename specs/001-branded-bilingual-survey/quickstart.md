# Quickstart: validate Milestone 2

Run-and-check guide. It proves the feature end to end against the spec's success criteria. Design details are in `contracts/` and `data-model.md`.

## Prerequisites

- `.env` present. Stack up: `docker compose up -d`. `docker compose ps` shows `db` healthy and `limesurvey` up.
- Admin reachable at `http://hotelsurvey.localhost/index.php/admin`.
- Chrome (or another Chromium) with DevTools device emulation.
- The operator has resolved the language-scope conflict (plan, Risks R1) before the build starts.

## 1. Static checks

```bash
./scripts/validate.sh
```

Expected: `validate: ok`. The extended script also fails if a hex colour appears in the theme outside `css/tokens.css`, or if any Google Fonts URL appears (SC-006, SC-008).

## 2. Theme install

1. Admin → *Configuration → Themes*: `hotel-classic` is listed and extends `vanilla`. Install it if needed.
2. After any `config.xml` change: *Themes → hotel-classic → Reset* (LimeSurvey caches the manifest).
3. *Theme options*: `placeholdernotice = on`.

## 3. Survey setup

Either import `limesurvey/survey/hotel-guest-survey.lss` (*Surveys → Import*), or build it per `contracts/survey-definition.md` and then export it to that path. Check the settings against `data-model.md` §1, then activate.

Note the survey ID. The guest URL is `http://hotelsurvey.localhost/index.php/<sid>`.

## 4. Walkthroughs

Use a fresh incognito window for each run. Viewports: 320, 360 and 390px wide (phone emulation), and a desktop width.

| # | Scenario | Expected | Covers |
|---|---|---|---|
| W1 | Browser language English, open the guest URL | Welcome in English, LTR, all FR-001 elements, notice shown | US1-AS1/2, SC-012 |
| W2 | DevTools → Sensors → locale `fa-IR` (or browser languages `fa, en`), new window | Welcome reloads once into Persian, `<html lang="fa" dir="rtl">` | SC-012 |
| W3 | Browser language `de` | English welcome | SC-012 |
| W4 | On welcome, switch English ↔ فارسی | Text and direction change. No response created | Edge case |
| W5 | Start in English, answer Q1–Q7, leave Q8–Q9 empty, Submit | Bar + "Question N of 9" on each screen. No Back on Q1. Back keeps answers. Thank-you screen with icon, heading, message, both names | US1, SC-001, SC-009 |
| W6 | Same in Persian | All strings Persian. RTL on every screen. Bar fills from the right. Rating order per R-04 | US1-AS4, SC-002, SC-010 |
| W7 | On each of Q1–Q7, press Continue with no answer (both languages) | Stays on the question. Hotel message next to it, error colour + icon | US2, SC-003 |
| W8 | Q8 and Q9 empty, then whitespace only | Moves on without a message | US2-AS3, edge case |
| W9 | Paste 1,200 characters, mixed Persian/English, into Q8 | Accepted, shown in natural direction, stored unchanged | Edge cases |
| W10 | Double-tap Submit. Then refresh the thank-you page. Then browser Back | Exactly one new completed response | US5, SC-005 |
| W11 | New incognito window, same URL | Fresh survey starts | US5-AS3 |
| W12 | At 320px: `document.documentElement.scrollWidth <= innerWidth` on every screen. Measure tiles and buttons ≥ 48px high | No horizontal scroll, touch rule met | SC-004 |
| W13 | 200% zoom at 360px, both languages | Reflows. No overlap, no horizontal scroll | Edge case |
| W14 | DevTools → Network: filter third-party domains, throttle to "Fast 4G" | No third-party requests. Each screen usable in ≤ 3 s | SC-008 |
| W15 | Block the `fonts/` requests | Fallback fonts. Persian still readable | Edge case |
| W16 | Run an AA contrast check (DevTools or axe) on each screen type, both languages | No failures except the decorative wordmark | SC-007 |
| W17 | Set `placeholdernotice = off`, repeat a short walkthrough | Notice absent on all pages, no gap | SC-011 |

## 5. Response check

Admin → *Responses* for the survey:

- One completed row per completed walkthrough, `submitdate` set, `startlanguage` = `en` or `fa`.
- No IP address or referrer columns with data. No token column.
- Do not copy comment text out of the admin into notes, tickets or chat.

## 6. Done

Milestone 2 is done when W1–W17 pass, `./scripts/validate.sh` passes, and the `.lss` export matches the database. Report results per PRD §8 Milestone 2 tasks, listing anything still open (plan, Risks).
