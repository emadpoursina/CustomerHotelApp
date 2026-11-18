# Feature Specification: Department Feedback Inbox and Guest Stories

**Feature Branch**: `department-feedback-inbox`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Guests tag which hotel department they are rating, managers get a Bale ping and an in-app inbox with approve/keep-private, and guests see a social wall of admin-approved comments."

**Sources**: Operator request for this iteration (department tag, Bale ping, inbox, guest wall); `hotelSurveyDemoPRD.md` (source of truth for the prior demo; do not rebuild survey functionality); `specs/002-hotel-demo-app/spec.md` (app shell, Rate, Dashboard aggregates, mock Services tab and bell); `specs/001-branded-bilingual-survey/spec.md` (nine questions and rules); `AGENTS.md` (LimeSurvey as engine, customisation boundaries, comments are sensitive).

## Scope

**In scope**:

- Department as a **tag only** (approach A): the guest picks one of four departments, then answers the **same** nine existing questions. No branching and no four separate surveys.
- Store the chosen department on the completed response so dashboard aggregates can be filtered by department.
- Manager notification **inbox** behind the app-bar bell (today a mock “Coming soon”): full-screen list with filters, unread, relative time, department and scores; row detail with comments and actions **انتشار** / **خصوصی بماند**.
- A **Bale** message to managers on completed survey: department and scores only (no comment body).
- Admin **queue** with states pending / published / private, held in a **custom** table (not a LimeSurvey core table).
- Public **guest stories** wall of admin-approved, anonymous comments (praise and complaints).
- Demo: **no manager login**; inbox is reachable the same way today’s dashboard is (anyone who can open the app).
- English and Persian (RTL) on the new screens.

**Out of scope**:

- Telegram or any messenger other than Bale.
- Native iOS/Android push.
- Four different surveys or department-specific questions.
- Publishing comments to the guest wall without going through the queue.
- A guest consent checkbox or consent copy.
- Manager PIN, hidden manager URL, or other access control (later).
- LimeSurvey core file or core table edits.
- QR codes, rooms, tokens, exports, production hardening (still deferred by the demo PRD).
- Rebuilding survey engine behaviour (welcome, required Q1–Q7, optional Q8–Q9, thank-you).

## Clarifications

### Session 2026-11-17

- Q: Where should guests open the stories wall from (tab, Home, drawer)? → A: All three: the fifth tab replaces Services; Home shows a teaser; the drawer has a stories item. All open the same screen.
- Q: Without manager login, how should inbox unread and the bell badge work? → A: Per-browser only: read/unread and the badge are local to that device/browser.
- Q: After Publish or Keep private, what further queue changes are allowed? → A: Unpublish only: from pending, Publish or Keep private once; published → private is allowed; private cannot be published again.
- Q: If a published response has both praise and a complaint, how many wall cards? → A: One card per published response (both excerpts if both exist).
- Q: What does the Home stories teaser show? → A: Static teaser only (no guest comment text on Home).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tag a department then rate the stay (Priority: P1)

A guest starts Rate from Home, the Rate tab, or the drawer. Before the existing survey, they see four large department cards: Restaurant (رستوران), Reception (پذیرش), Facilities (تاسیسات), Housekeeping (خانه‌داری). They tap one. The same nine-question stay survey follows (overall, cleanliness, comfort, staff, breakfast, facilities, NPS, optional praise, optional improvement). Completing the survey records which department they tagged.

**Why this priority**: Without a department on the response, inbox, Bale, dashboard filters and the wall have nothing to hang off. This is the smallest slice that still delivers tagged feedback.

**Independent Test**: Start Rate, pick Housekeeping, complete Q1–Q7 (leave comments empty), confirm thank-you; start again, pick Restaurant, complete with comments. Dashboard All vs Restaurant vs Housekeeping counts differ; a response without a department never appears under a department filter.

**Acceptance Scenarios**:

1. **Given** no in-progress survey, **When** the guest starts Rate, **Then** they first see four department cards (Restaurant, Reception, Facilities, Housekeeping) in English or Persian matching the app language, each a touch target of at least 48px, with no survey question yet.
2. **Given** the department screen, **When** the guest has not chosen a department, **Then** they cannot proceed to Q1.
3. **Given** a department chosen, **When** the guest continues, **Then** the existing nine questions appear with the same scales, required/optional rules, validation, progress, Back/Continue and thank-you as today.
4. **Given** a completed survey, **When** a manager views that response’s department (inbox or dashboard filter), **Then** it is the department the guest selected, not inferred from scores.
5. **Given** an in-progress session after a department was chosen, **When** the guest leaves and later taps Rate, **Then** the session resumes as today (same language lock); they are not asked to pick a department again for that session.
6. **Given** Persian, **When** the department screen is shown, **Then** layout is RTL and department names are the Persian labels above.

---

### User Story 2 - Manager is pinged in Bale without seeing comments (Priority: P1)

When a guest submits a completed survey, a manager who has Bale receives a short message: new feedback, the tagged department, overall stay score and NPS, the hotel name, and a relative or “now” time. The optional praise and complaint text never appear in that message.

**Why this priority**: Operators asked for an immediate heads-up that is safe to send over a messenger. Privacy of guest comments is a hard product rule.

**Independent Test**: Submit one survey with filled comments and one with empty comments; inspect the Bale delivery content (or a captured payload in a test harness). Both include department and scores; neither includes comment text.

**Acceptance Scenarios**:

1. **Given** Bale delivery is configured, **When** a guest completes a survey, **Then** one manager message is sent in the shape «بازخورد جدید · {dept}» plus overall score, NPS, hotel name, and relative/now time.
2. **Given** the guest wrote praise and/or a complaint, **When** the Bale message is sent, **Then** those comment bodies are absent from the message text and from any diagnostic log of that send.
3. **Given** Bale is not configured or the send fails, **When** a survey completes, **Then** the response and queue item are still stored; the guest still sees thank-you; the inbox still lists the item. Delivery failure does not block submit.
4. **Given** Telegram or device push, **When** a survey completes, **Then** nothing is sent on those channels.

---

### User Story 3 - Inbox: review scores, read comments, publish or keep private (Priority: P1)

A manager (anyone in this demo) taps the app-bar bell. A full-screen inbox opens instead of “Coming soon”. Rows show a colour stripe for the department, department name, overall and NPS scores, relative time, and unread state — not the comment text. Opening a row shows comments (if any). Pending items offer **انتشار** (publish to the guest wall) and **خصوصی بماند** (keep private). Published items can be unpublished with **خصوصی بماند**; private items cannot be published. Filters cover department and queue/read state. Empty and unread states are obvious. Unread is per-browser.

**Why this priority**: This is the operator’s working surface for triaging feedback and the only path comments may take onto the public wall.

**Independent Test**: Complete a survey with comments; open the bell; confirm the new row is unread with scores only; open it, read comments, tap Keep private; complete another, tap Publish; confirm list filters and empty state when no items match.

**Acceptance Scenarios**:

1. **Given** Home, Nearby, Dashboard or a survey screen, **When** the manager taps the bell, **Then** a full-screen inbox opens (not a toast) and the previous “Coming soon” behaviour for the bell is gone.
2. **Given** at least one queued item, **When** the inbox list is shown, **Then** each row shows department (stripe + label), overall score, NPS, relative time, and unread if not yet opened; comment bodies are not on the row.
3. **Given** a pending row, **When** the manager opens it, **Then** they see department, scores, submission time, optional praise (Q8) and optional complaint (Q9), and the actions انتشار and خصوصی بماند; the item becomes read in this browser.
4. **Given** a pending item, **When** the manager taps انتشار, **Then** its queue state becomes published and it is eligible for the guest wall (if it has comment text). **When** they tap خصوصی بماند, **Then** its state becomes private and it never appears on the wall. From pending, that choice happens once (the item leaves pending).
5. **Given** a published item, **When** the manager taps خصوصی بماند, **Then** its state becomes private, it is removed from the guest wall if it was listed, and انتشار is no longer available for that item.
6. **Given** a private item, **When** the manager opens detail, **Then** انتشار is not offered; private MUST NOT return to published or pending.
7. **Given** filters (all / unread / pending / published / private, and by department), **When** the manager applies them, **Then** the list shows only matching items, with a dedicated empty state when none match.
8. **Given** no queued items at all, **When** the inbox opens, **Then** an empty state explains that new completed surveys will appear here.
9. **Given** unread items in this browser, **When** the manager is on any shell screen, **Then** the bell indicates unread (existing badge/dot). **Given** none unread in this browser, **Then** the unread indicator is off. Unread on another device is independent.
10. **Given** Persian, **When** the inbox and detail are shown, **Then** all chrome, filters, empty states, relative times and action labels are Persian and RTL (action labels remain انتشار / خصوصی بماند as specified).
11. **Given** this demo, **When** anyone opens the app URL, **Then** they can open the inbox without a PIN, hidden URL, or login (same openness as today’s dashboard).

---

### User Story 4 - Guest stories wall of approved anonymous comments (Priority: P2)

Guests browse a stories screen of comments that a manager has published. Each story is anonymous (no name, email, room or response id). Both praise and complaints can appear. Unpublished, private, and pending comments never appear. Empty wall has a calm empty state.

**Why this priority**: Public social proof and transparency, gated by the queue so raw comments are never live by default.

**Independent Test**: With nothing published, open stories and see empty. Publish one response that has both praise and a complaint; confirm a single anonymous card shows both excerpts. Keep another private; confirm it does not appear. Confirm Home teaser has no comment text.

**Acceptance Scenarios**:

1. **Given** the Services tab (currently a mock), **When** the guest taps it, **Then** the guest stories screen opens (Services is no longer a “Coming soon” toast).
2. **Given** Home, **When** the guest sees the stories teaser block, **Then** the teaser is static copy with no guest comment text, and tapping it opens the same stories screen. **Given** the drawer, **When** they tap the stories item, **Then** the same screen opens.
3. **Given** published items that include comment text, **When** the wall loads, **Then** each published response is one anonymous card (department visible, no guest identity). If both praise and complaint exist, both excerpts appear on that one card; unpublished, private, and pending items are absent.
4. **Given** pending or private items, or published items with no comment text, **When** the wall loads, **Then** they are absent.
5. **Given** no published comments, **When** the wall loads, **Then** an empty state is shown (not an error).
6. **Given** Persian, **When** the wall and Home teaser are shown, **Then** copy and layout are Persian RTL.

---

### User Story 5 - Dashboard filtered by department (Priority: P2)

A manager on the existing aggregates dashboard can filter the same KPIs and category bars by department (plus All). Comment text still never appears on the dashboard. The dashboard remains aggregates-only; individual comments live only in inbox detail and on the published wall.

**Why this priority**: Department tagging is only useful for operators if they can see which unit is driving the scores.

**Independent Test**: After mixed-department submissions, switch All / Restaurant / Housekeeping and confirm totals and averages match a manual count of completed responses in that department and date range.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** it loads, **Then** department chips (All plus the four departments) sit with the existing date chips; All is the default.
2. **Given** a department chip, **When** selected together with a date range, **Then** every figure (counts, Q1 average, NPS, Q1–Q6 bars, language split, low-sample note) is computed only from completed responses tagged with that department in that range.
3. **Given** All, **When** selected, **Then** figures include every completed response in the date range, including any legacy rows with no department.
4. **Given** the dashboard data, **When** inspected, **Then** it still contains no comment text and no per-response comment records.

---

### Edge Cases

- Guest uses Back from the first survey question: they return to the department picker; changing department before Start/Q1 updates the tag for that session.
- Guest submits with empty Q8 and Q9: Bale and inbox still fire; detail shows empty comment fields; Publish does not create a wall card; Keep private still marks the queue private.
- Manager unpublishes a wall item (published → private): the card disappears from the stories list; that item cannot be published again.
- Manager tries to publish a private item: no Publish action; the wall stays unchanged.
- Duplicate submit / refresh on thank-you: at most one queue item and at most one Bale message per completed response.
- Bale credentials missing: complete survey succeeds; inbox still fills; no comment text is written to logs while reporting the skip/failure.
- Very long comments: inbox detail shows full text with vertical scroll; no horizontal scroll at 320px+; wall truncates with expand if needed so the list stays scannable.
- Rapid successive submissions: each completed response gets its own inbox row; unread count increases accordingly.
- Existing completed responses from before this feature: no department tag; they appear under dashboard All only; they are not backfilled into the inbox unless newly completed.
- Language switch on inbox/stories/department picker: same persistence as the rest of the app; survey language still locks after Start.
- Reduced motion: inbox and stories use the same reduced-motion behaviour as the rest of the shell.
- Someone opens inbox on a phone in a public lobby (demo has no login): comments are visible to whoever has the URL — accepted for demo; PIN/hidden URL remains later work.

## Requirements *(mandatory)*

### Functional Requirements

**Department tag (approach A)**

- **FR-001**: Starting Rate MUST begin with a required choice of exactly one department from: Restaurant / رستوران, Reception / پذیرش, Facilities / تاسیسات, Housekeeping / خانه‌داری. The same nine existing questions MUST follow that choice.
- **FR-002**: The survey MUST NOT branch, swap questions, or use a different survey per department.
- **FR-003**: The chosen department MUST be stored with the completed response so later inbox, Bale, dashboard filter and wall can all read the same tag.
- **FR-004**: Questions, scales, required/optional rules, validation, progress, language lock, resume and thank-you MUST remain as in the branded bilingual survey spec (Q1–Q6 1–5, Q7 0–10, Q8 praise and Q9 improvement optional).

**Bale manager ping**

- **FR-005**: On each newly completed survey, the system MUST send one Bale message to the configured manager destination, when credentials are present.
- **FR-006**: The message MUST include «بازخورد جدید · {dept}», overall stay score, NPS, hotel name, and relative or now time. It MUST NOT include Q8/Q9 comment bodies or any other free text from the guest.
- **FR-007**: Comment text MUST NOT appear in Bale payloads, application logs, validation output, or operator-facing diagnostics.
- **FR-008**: Failed or skipped Bale delivery MUST NOT prevent survey completion or queue creation. Telegram and native push MUST NOT be used.

**Notification inbox**

- **FR-009**: The app-bar bell MUST open a full-screen inbox on every shell surface (static app and survey theme). It MUST NOT show “Coming soon”.
- **FR-010**: Each inbox row MUST show a department colour stripe (from the shared design tokens, not ad-hoc colours), department label, overall score, NPS, relative time, and unread vs read. Rows MUST NOT show comment bodies.
- **FR-011**: Row detail MUST show comments (praise and complaint, or empty). Pending detail MUST offer انتشار and خصوصی بماند. Published detail MUST offer خصوصی بماند (unpublish) and MUST NOT offer انتشار. Private detail MUST NOT offer انتشار.
- **FR-012**: The inbox MUST support filters for department and for all / unread / pending / published / private, plus empty and “no matches” states.
- **FR-013**: Opening a row MUST mark it read in that browser only. The bell unread indicator MUST reflect whether unread items remain in this browser. Read/unread MUST NOT be shared across devices or browsers.
- **FR-014**: Demo MUST NOT add manager login, PIN, or a hidden manager URL; the inbox is as reachable as the dashboard.

**Queue and privacy**

- **FR-015**: Every completed survey MUST create a queue item in state **pending**. Allowed states are only **pending**, **published**, and **private**. From pending, the manager MUST be able to choose انتشار or خصوصی بماند once. From published, خصوصی بماند (unpublish) MUST be allowed and MUST set the item to private. Private MUST NOT be published again and MUST NOT return to pending.
- **FR-016**: Queue state MUST live in a custom table, not in LimeSurvey core tables. LimeSurvey core files MUST NOT be modified.
- **FR-017**: The guest wall MUST list only **published** items that have comment text, shown anonymously (no name, email, room, or response identifier). Pending and private items MUST NOT appear. The wall MUST show **one card per published response**; if both Q8 and Q9 have text, both excerpts appear on that card (not two cards).
- **FR-018**: Comments MUST NOT be published automatically on submit. There is no guest consent checkbox in this iteration.
- **FR-019**: The aggregates dashboard MUST remain comment-free. Only inbox detail and the published wall may show comment text, and only after the queue rules above.

**Guest stories placement**

- **FR-020**: Guest stories MUST replace the mock Services tab (the tab becomes a real destination). Home MUST also show a stories teaser block, and the drawer MUST include a stories item, both opening the same screen. The Home teaser MUST be static promotional copy and MUST NOT include guest comment text.

**Dashboard filter**

- **FR-021**: The dashboard MUST offer an All filter plus one filter per department. Combined with existing date ranges, every displayed aggregate MUST respect both filters. Untagged (legacy) responses count only under All.

**Languages, design, demo constraints**

- **FR-022**: Every new string (department picker, inbox, filters, empty states, relative time, stories, Home teaser, drawer item) MUST exist in English and Persian with no silent fallback. Persian MUST be RTL including stripe side and list direction. Persian numerals apply to scores and relative-time figures on Persian screens.
- **FR-023**: New screens MUST use the existing app shell (app bar, drawer, tab bar, phone column, ≥48px targets, no horizontal scroll at 320px+). Colour MUST come from the shared tokens file only.
- **FR-024**: Customisation MUST stay in the hotel child theme, the static app, database init for custom tables, scripts, and the existing pattern of a small server-side helper when a secret must not reach the browser (Bale credentials live only in environment config, never in the browser, never committed).
- **FR-025**: The project validation script MUST pass. It SHOULD gain checks that comment identifiers/bodies are not shipped in Bale send paths or logs.

### Key Entities

- **Department tag**: one of four labels on a stay rating (restaurant, reception, facilities, housekeeping). A tag, not a separate questionnaire.
- **Survey response (existing)**: completed stay rating with Q1–Q7 scores, optional Q8 praise, optional Q9 complaint, language, submission time, plus the new department tag.
- **Queue item**: one per completed response; state pending | published | private (pending → published or private once; published → private allowed; private is not republishable); read/unread for the inbox is per-browser; links to the response without copying comment text into messenger payloads.
- **Bale notice**: a manager-facing alert containing department, overall score, NPS, hotel name, and time — never comment bodies.
- **Guest story**: an anonymous public card derived only from a **published** queue item that has comment text; one card per response, showing department and whichever of praise/complaint exist, not identity.
- **Dashboard snapshot**: existing aggregates, additionally sliced by department (and All). Still no comments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of new Rate sessions show the four department cards before Q1; 0 sessions reach Q1 without a department.
- **SC-002**: After mixed submissions, dashboard figures for each department + date range match a manual count of completed tagged responses exactly (same rolling windows as today’s dashboard).
- **SC-003**: In 10 of 10 completed surveys with comments filled, the manager Bale text (or captured send body) contains department and scores and contains 0 characters of the comment bodies.
- **SC-004**: A manager can open the bell, recognise a new unread row, open it, and choose Publish or Keep private in under 30 seconds without training.
- **SC-005**: The guest stories list contains 100% of published responses with comment text (one card each, including both excerpts when both exist) and 0% of pending, private, or empty-comment items, verified after a mixed queue. Unpublishing a published item removes it from the list.
- **SC-006**: Comment text appears in 0 Bale payloads and 0 log lines produced by complete-survey and Bale-send paths in a seeded run that uses synthetic comments.
- **SC-007**: On 320–430px, in English and Persian, department picker, inbox (list, detail, empty), and stories (list, empty) show 0 horizontal overflow, all new controls ≥48px, and 0 untranslated chrome strings.
- **SC-008**: Queue states exist only in hotel-owned records, not in the survey engine's built-in records. The project's usual validation checks pass after the change.
- **SC-009**: Bale or native-push alternatives are unused: 0 Telegram sends; 0 device-push registrations.
- **SC-010**: A demo walk (pick department → submit with comments → Bale-safe ping → inbox publish → stories shows the comment → dashboard department filter updates) completes on the first attempt.

## Assumptions

- **A-01 Guest stories placement**: **All three** (confirmed 2026-11-17): Services tab becomes Guest stories; Home gains a **static** teaser block with no comment text; the drawer gains a stories item. All three open the same wall.
- **A-02 Department English names**: Restaurant, Reception, Facilities, Housekeeping map to رستوران، پذیرش، تاسیسات، خانه‌داری.
- **A-03 Same questions**: Approach A means Q1–Q9 stay globally about the stay; the department is context for operators, not a rewrite of question wording per unit.
- **A-04 One department per response**: Guests cannot multi-select. Changing department is allowed only before the survey session is underway (US1 + edge case Back to picker).
- **A-05 Q8/Q9 mapping**: Q8 remains optional praise (“liked”); Q9 remains optional improvement/complaint. The wall shows **one card per published response**, with both excerpts if both exist (confirmed 2026-11-17).
- **A-06 Unread**: Unread means the inbox row has never been opened **in this browser**. Read/unread and the bell badge are **per-browser only** (confirmed 2026-11-17). Opening a row on one device does not clear the badge on another.
- **A-07 Inbox filters**: Department chips plus status chips: All, Unread, Pending, Published, Private. Combinations are AND.
- **A-08 Relative time**: Same buckets in both languages (just now / minutes / hours / days). Persian uses Persian digits.
- **A-09 Stripe colours**: Four token-derived colours, one per department, used only as the row stripe (gold remains accent for selected/active chrome, not a fifth department).
- **A-10 Bale configuration**: Bot token and chat destination live only in `.env`. If unset, sends are skipped with a non-comment log line. Message language is Persian as in the specified shape, even when the guest surveyed in English.
- **A-11 Overall and NPS in Bale/inbox**: Overall = Q1 (1–5); NPS = Q7 (0–10) shown as the raw score on the row/message (dashboard NPS index remains the aggregate promoter−detractor metric and is not required on the inbox row).
- **A-12 No consent**: Publishing is solely a manager action. Guests are not asked. Demo operators accept that anonymous snippets may go public.
- **A-13 Demo openness**: Like the dashboard, inbox and stories are unauthenticated. Comment visibility in the inbox is a known demo risk; manager PIN is explicitly later.
- **A-14 Legacy responses**: Pre-feature completed rows have no department and no queue row. They are not migrated. Seed jobs created after this feature MUST pick a department so demo filters have data.
- **A-15 Engine boundary**: Department capture may use a survey-adjacent custom field or a custom table keyed by response id; it MUST NOT alter LimeSurvey core tables or core files. Existing customisation folders remain the only code places.
- **A-16 Server-side secrets**: Bale send follows the places-proxy idea: secret stays on the server. Guests never receive bot credentials.
- **A-17 Dashboard job**: Aggregates stay read-only over survey responses; department filter extends that snapshot. The job still must not read comment columns into the aggregates file.
- **A-18 Thank-you unchanged**: After submit, thank-you still offers Back to home and Explore nearby. Stories is not added as a third thank-you button in this iteration.
- **A-19 Tab label**: The fifth tab label becomes Guest stories / داستان‌ها (or equivalent short Persian). “Services” is retired as a destination name.
- **A-20 Prior demo PRD**: `hotelSurveyDemoPRD.md` still governs Home, Nearby, Rate-inside-shell, and aggregates dashboard except where this spec explicitly changes the bell, Services tab, Rate start, and dashboard filters.
- **A-21 Open decisions file**: This spec does not resolve `docs/decisions.md` §2 items (domain, admin IPs, remaining brand assets, GDPR retention, LAN phone testing, Neshan quota).
- **A-22 Constitution**: Project constitution file is still a placeholder; `AGENTS.md` and the demo PRD are the effective governance for this feature.
- **A-23 Queue lifecycle**: From pending, Publish or Keep private once. Published may be unpublished to private. Private is terminal for publication (cannot be published again). Confirmed 2026-11-17.
