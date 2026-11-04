# Feature Specification: Hotel Guest App Demo (app shell, Nearby, Dashboard)

**Feature Branch**: `hotel-demo-app`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "path: feature keep-local. Build the demo app described in hotelSurveyDemoPRD.md (D-01 to D-07, build order in §7, acceptance criteria in §6). Use prototype/index.html as the visual and interaction reference; match it closely. Static app goes in app/ (mounted into the LimeSurvey container at /var/www/html/app); the existing survey gets the same shell through the hotel-classic theme; the dashboard reads LimeSurvey responses read-only via a host-side script with --watch and publishes aggregates only. Follow AGENTS.md. Do not build anything the demo PRD defers (QR codes, rooms, exports, production)."

**Sources**: `hotelSurveyDemoPRD.md` (source of truth for this iteration: D-01 to D-07, §3 design, §4 approach, §5 deferred, §6 acceptance, §7 build order, §8 demo-day checklist); `prototype/index.html` (visual and interaction reference, strings and mock places); `AGENTS.md` (architecture, product and data rules); `docs/decisions.md` §1 item 12 (demo scope) and §2 (open, not resolved here); `specs/001-branded-bilingual-survey/spec.md` (existing survey behaviour that must not change); `hotelSurveyPRD.md` (full MVP, overridden by the demo PRD where they differ).

## Scope

**In scope (demo iteration)**: an app-style shell (top app bar, hamburger drawer, bottom tab bar, toast, phone-width column) on every screen including the existing survey; a Home screen; a Nearby places screen with mock data, search, filters, sort, detail sheet and empty state; a re-skinned survey with two new thank-you buttons; a simple aggregates-only Dashboard fed by a host-side refresh job that reads survey responses read-only; English and Persian (RTL) across all of it; a seed job that submits about 40 fake responses through the public survey; mock places data.

**Out of scope (deferred, not dropped)**:

- QR codes, room registry, room tokens, token validation, room filter (Milestone 3). The existing `hotel_rooms` table stays as-is and unused.
- Exports and full reporting (Milestone 4). LimeSurvey's own admin statistics remain available.
- Production deployment, HTTPS, admin IP restriction, backup-restore test, GDPR policy, real branding (Milestone 5; `docs/decisions.md` §2 items 1–5). This spec resolves none of them.
- Real maps, real place data, photos, booking, third-party APIs, and any working Services feature (all are mock buttons).
- Dashboard authentication.
- Any change to survey questions, answer options, validation rules or LimeSurvey core files and core tables.

## Clarifications

### Session 2026-11-04

- Q: When the guest starts the survey from the app, what should happen to the survey welcome screen's own Persian/English selector from spec 001? → A: Hide the welcome selector inside the shell. The survey opens in the app's stored language. On the welcome screen the drawer language switch stays enabled and reloads the welcome in the other language. It locks after Start.
- Q: Seeded responses submitted through the public survey all get today's date, so the 7-day, 30-day and All chips show the same numbers. How should that be handled? → A: Accept it. Seed only through the public survey. Seeded responses share the seed date, and no backdating method is used.
- Q: When a guest taps Rate (tab, drawer or Home card) after leaving a survey part-way, should the survey start fresh or resume? → A: Resume the in-progress session if LimeSurvey still has one, keeping its original language even when it differs from the app's current language. With no session, start fresh in the app's current language. Partial answers are never counted.
- Q: How should "Last 7 days" and "Last 30 days" be defined for the dashboard and the manual SQL check? → A: A rolling window from the snapshot's generation time on the database server clock: submission time ≥ NOW() − 7 days (or 30 days). "All" has no lower bound.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App shell and Home (Priority: P1)

A guest opens the hotel app on a phone. Every screen has a top app bar (hamburger, title, hotel mark), a fixed bottom tab bar with five tabs (Home, Nearby, a raised centre Rate tab, Dashboard, Services) and a hamburger drawer with the hotel name, real menu items, mock items, a language switch and a "Demo" label. Home greets the guest, shows the welcome card, a prominent "Rate your stay, 2 minutes" card, a grid of mock hotel services and a strip of three nearby highlights. Anything not built shows a short "Coming soon" toast instead of navigating anywhere.

**Why this priority**: The shell is the "app, not website" impression the demo exists for, and every other story renders inside it (build order step 1–2).

**Independent Test**: Open the Home page at 390px width, open and close the drawer, tap every tab and every mock control; switch language in the drawer.

**Acceptance Scenarios**:

1. **Given** a 360–430px viewport on Home, **When** the page loads, **Then** the app bar and bottom tab bar are visible and the Home tab is shown as active (gold).
2. **Given** the drawer is closed, **When** the guest taps the hamburger, **Then** the drawer slides in from the start edge with a dimmed backdrop; **When** the guest taps the backdrop or presses Esc, **Then** it closes.
3. **Given** any screen, **When** the guest taps Home, Nearby, Rate or Dashboard in the tab bar or drawer, **Then** that screen opens; **When** the guest taps Services, **Then** a "Coming soon" toast appears and the screen does not change.
4. **Given** Home, **When** the guest taps any quick action (Room service, Housekeeping, Wi-Fi, Late checkout, Concierge, Spa), any drawer mock item (My stay, Room service, Wi-Fi, Settings) or the notifications bell, **Then** a "Coming soon" toast appears above the tab bar and hides after about 2 seconds.
5. **Given** Home, **When** the guest taps a nearby highlight or "See all", **Then** Nearby opens (a highlight opens that place's detail).
6. **Given** a desktop-width browser, **When** any screen loads, **Then** the app is presented in a centred phone-width column (max 430px).

---

### User Story 2 - Rate the stay inside the app (Priority: P1)

From Home (or the Rate tab), the guest starts the existing nine-question survey. The survey looks like the rest of the app (same app bar, drawer and tab bar; questions as cards), keeps its existing rules and finishes on a thank-you screen with "Back to home" and "Explore nearby".

**Why this priority**: Collecting feedback is the product's core purpose; the demo script hinges on submitting a survey and seeing the dashboard move.

**Independent Test**: From Home tap "Rate your stay", try to skip a required question, complete all nine, land on thank-you, tap "Back to home".

**Acceptance Scenarios**:

1. **Given** Home and no in-progress survey session, **When** the guest taps the Rate card or the Rate tab, **Then** the survey's welcome screen opens inside the app shell in the app's current language, with no language selector on the welcome screen itself.
2. **Given** a question screen for Q1–Q7, **When** the guest taps Continue without answering, **Then** the existing translated validation message shows and the guest stays on that question.
3. **Given** Q8 or Q9, **When** the guest leaves the text empty and continues or submits, **Then** the survey proceeds.
4. **Given** the survey has started, **When** the guest opens the drawer, **Then** the language switch is disabled with a note that the language is locked while the survey is open.
5. **Given** the last question, **When** the guest submits, **Then** the thank-you screen shows "Back to home" and "Explore nearby", which open Home and Nearby respectively.
6. **Given** the survey shell, **When** the guest taps a tab or drawer item mid-survey, **Then** the guest leaves the survey for that screen (no broken page). Partial answers are never saved as a completed response and never count on the dashboard.
7. **Given** the survey welcome screen (before Start), **When** the guest switches language in the drawer, **Then** the welcome screen reloads in the other language, with the matching direction, and no response is started.
8. **Given** an in-progress survey session that the guest left part-way and LimeSurvey still holds, **When** the guest taps Rate (tab, drawer or Home card), **Then** the survey resumes at the guest's place in the session's original language, even if the app's current language is different, and the language switch stays locked. **Given** the session has ended or expired, **When** the guest taps Rate, **Then** a fresh survey starts in the app's current language.

---

### User Story 3 - Browse nearby places (Priority: P2)

The guest browses 18–24 mock restaurants, cafés and points of interest, searches as they type, filters by category and "Open now", sorts by distance or rating, opens a detail bottom sheet with mock Directions/Call/Save buttons, and sees an empty state with "Clear filters" when nothing matches.

**Why this priority**: Adds visible guest value and a strong demo moment, but the survey and dashboard stand without it.

**Independent Test**: Open Nearby, type "cafe", toggle Open now, change category and sort, open a place, then search for nonsense to reach the empty state and clear it.

**Acceptance Scenarios**:

1. **Given** Nearby with no filters, **When** it loads, **Then** all mock places are listed sorted by distance, each row showing icon, name in the current language, rating, distance, price level and an Open/Closed label, with a visible "Demo data" marker and a result count.
2. **Given** Nearby, **When** the guest types in search, **Then** the list narrows on every keystroke to places whose name or tags match, in either the current language's or the other language's text.
3. **Given** a category chip, the Open now toggle and a sort choice, **When** they are used alone or combined with search, **Then** the list shows only places satisfying all active conditions in the chosen order.
4. **Given** a place row, **When** tapped, **Then** a bottom sheet opens with category, name, rating, walking time, price, open status, description, hours, tags and mock Directions/Call/Save buttons; tapping the backdrop or Esc closes it; tapping a mock button shows the toast.
5. **Given** filters that match nothing, **When** the list updates, **Then** "No places match" shows with a "Clear filters" button that resets search, category and Open now.

---

### User Story 4 - Manager dashboard with live numbers (Priority: P2)

A manager (in the demo, anyone on the local URL) opens Dashboard and sees total completed responses, average overall stay (Q1), NPS (Q7), average for each of Q1–Q6 with its response count, the English/Persian split, a date range filter (Last 7 days / Last 30 days / All), a low-sample warning when fewer than 10 responses are in range, and a "Last updated" time. While the refresh job runs in watch mode, a newly submitted survey appears within about 15 seconds. Only aggregates are shown.

**Why this priority**: Closes the demo loop ("count goes up"), but depends on the survey and refresh job being in place.

**Independent Test**: Start the refresh job in watch mode, note the total, submit one survey, wait 15 seconds and reload or wait for refresh; compare numbers with a manual count against the response data.

**Acceptance Scenarios**:

1. **Given** completed responses exist, **When** Dashboard loads, **Then** it shows total, average overall stay (to one decimal, out of 5), NPS (signed integer), six category bars with averages and counts, the language split and the last-updated time.
2. **Given** the date chips, **When** the guest selects 7 days, 30 days or All, **Then** every number recalculates for that range. The ranges are rolling windows (submission time ≥ snapshot generation time − 7 or 30 days, on the database server clock), and All has no lower bound. On seed day, when every response falls in all three ranges, the three chips may show identical numbers. This is expected (A-02).
3. **Given** fewer than 10 responses in the selected range, **When** the range is shown, **Then** a "Low sample, treat with care" note is visible; with zero responses a "No responses in this period" state shows instead of numbers.
4. **Given** the refresh job running in watch mode, **When** a survey is submitted, **Then** the dashboard reflects it within about 15 seconds without restarting anything.
5. **Given** any range, **When** the numbers are compared to a manual query of completed responses, **Then** they match.
6. **Given** the published dashboard data, **When** inspected, **Then** it contains no comment text, no individual responses and no per-response records.

---

### User Story 5 - Bilingual and RTL everywhere (Priority: P2)

The guest switches between English and فارسی in the drawer. Every screen (shell, Home, Nearby, Dashboard, survey) switches language; Persian is right-to-left including the drawer side and the direction of bars. The choice persists across tabs and page loads, and the survey opens in that language.

**Why this priority**: A hard product rule (AGENTS.md: every string translated), but it layers onto the screens above.

**Independent Test**: Switch to Persian on Home, visit every tab and complete a survey; reload; switch back.

**Acceptance Scenarios**:

1. **Given** English, **When** the guest picks فارسی in the drawer, **Then** the whole app re-renders in Persian with RTL layout, the drawer opening from the right.
2. **Given** Persian was chosen, **When** the guest moves to another screen or reloads, **Then** Persian remains selected.
3. **Given** Persian was chosen in the app, **When** the guest starts a new survey from the app (no in-progress session), **Then** the survey runs in Persian and the response is recorded as Persian. A resumed session keeps the language it started in (User Story 2, scenario 8).
4. **Given** any screen in either language, **When** inspected, **Then** no untranslated string from the other language or system defaults appears (brand names, which are bilingual by design, excepted).

---

### User Story 6 - Demo data ready (Priority: P3)

Before a demo, an operator runs a seed job that submits about 40 realistic, varied fake responses in both languages through the public survey, so the dashboard has meaningful numbers.

**Why this priority**: Makes the demo presentable but is not guest-facing.

**Independent Test**: On an empty survey, run the seed job, then run the refresh job once and confirm about 40 responses with both languages and varied scores on Dashboard.

**Acceptance Scenarios**:

1. **Given** the stack is running, **When** the operator runs the seed job, **Then** about 40 completed responses are added via the public survey with no direct writes to survey-engine tables.
2. **Given** seeded data, **When** Dashboard shows All, **Then** both languages appear and category averages differ from each other (not all identical).

---

### Edge Cases

- No responses at all, or none in the selected range: dashboard shows the "no responses in this period" state, never errors, NaN or division by zero.
- Dashboard data file missing, stale or unreadable (refresh job never run): dashboard shows a clear, translated "data not available yet" state and the last-updated time if known.
- Refresh job loses database access while in watch mode: it keeps the last good published data and retries on the next cycle rather than publishing empty or partial numbers.
- A question answered by fewer respondents than the total (e.g. incomplete or legacy rows): each category bar shows its own count.
- NPS with all passives, or all detractors: shows 0 or −100 correctly with sign.
- Places that open past midnight (e.g. until 01:00) or 24 hours: Open now and hours display are correct.
- Search with leading/trailing spaces, mixed case, or Persian text: matches correctly; empty search shows everything.
- Very narrow screen (320px) with long Persian strings: no horizontal scrolling; chips and segmented controls wrap or scroll within their own row.
- Guest switches language on Home while a survey is part-way in another tab: the survey keeps its started language (language locked once started).
- Guest leaves a survey part-way, switches the app language, then taps Rate: the survey resumes in its original session language, not the new app language. The survey shell shows the session language while the survey is open, and the language switch stays locked. The app must not force the app language onto a resumed session. Once the session ends or expires, Rate starts fresh in the app's current language.
- Guest leaves a survey part-way and never returns: the partial response is not counted on the dashboard (FR-030).
- Seed day: all seeded responses share the seed date, so 7 days, 30 days and All may show the same figures. This is expected, not a defect.
- Response submitted exactly at the window boundary: it is included when its submission time is ≥ generation time − 7 or 30 days on the database server clock.
- Bare directory URL (e.g. `/app/`): links in the app always name the file so the survey engine's URL rewriting never intercepts them.
- `prefers-reduced-motion`: drawer, sheet and toast appear without animation.
- Guest double-taps a mock button: one toast, timer restarts; no navigation.

## Requirements *(mandatory)*

### Functional Requirements

**App shell (D-01)**

- **FR-001**: Every screen, including all survey screens, MUST show a top app bar with a hamburger button at the start side, the screen title and a hotel wordmark or icon (prototype also shows a mock notifications bell).
- **FR-002**: The hamburger MUST open a drawer from the start edge (right in RTL) over a dimmed backdrop, containing: hotel name (both scripts), tagline, menu items Home, Rate your stay, Nearby, Dashboard; mock items My stay, Room service, Wi-Fi, Settings (each marked "Soon"); a language switch (English / فارسی); and a "Demo build · placeholder brand" label. It MUST close on backdrop tap, Esc, or navigation.
- **FR-003**: Every screen MUST show a fixed, safe-area-aware bottom tab bar with five tabs in this order: Home, Nearby, Rate (centre, raised and accented), Dashboard, Services. The current tab MUST be marked active in gold.
- **FR-004**: Every mock control (Services tab, quick actions, drawer mock items, bell, place-sheet Directions/Call/Save) MUST show a translated "Coming soon" toast above the tab bar that auto-hides after about 2 seconds, and MUST NOT navigate.
- **FR-005**: On the survey welcome screen (before Start), the drawer language switch MUST stay enabled and switching MUST reload the welcome screen in the chosen language without starting a response. The switch MUST be disabled, with a translated explanation, while a survey is in progress: after Start and before the thank-you screen, including when a session is resumed.
- **FR-006**: At widths above 430px the app MUST render in a centred column no wider than 430px.
- **FR-007**: The static app and the survey MUST share one source of design tokens and fonts; no colour values may be defined outside the tokens file, and no third-party fonts or assets may be loaded.

**Home (D-02)**

- **FR-008**: Home MUST show a welcome card with a time-of-day greeting, the hotel name and tagline.
- **FR-009**: Home MUST show a primary "Rate your stay" card ("two minutes, anonymous") that starts the survey.
- **FR-010**: Home MUST show a mock quick-action grid of six items: Room service, Housekeeping, Wi-Fi, Late checkout, Concierge, Spa.
- **FR-011**: Home MUST show a "Nearby highlights" strip of exactly three places drawn from the Nearby data, plus a "See all" link to Nearby; tapping a highlight opens that place.

**Survey (D-03)**

- **FR-012**: The survey's questions, answer scales, required/optional rules, validation messages, progress bar, Back/Continue behaviour and response storage MUST remain as specified in `specs/001-branded-bilingual-survey/spec.md` (Q1–Q6 rated 1–5, Q7 0–10, Q8–Q9 optional text). Only presentation changes.
- **FR-013**: Survey screens MUST carry the same app bar, drawer and tab bar as the static app, with tab and drawer destinations working from inside the survey, and question content restyled as app cards matching the prototype.
- **FR-014**: The thank-you screen MUST offer "Back to home" (opens Home) and "Explore nearby" (opens Nearby).
- **FR-015**: Starting the survey from the app (Rate tab, drawer item or Home card) with no in-progress session MUST open the welcome screen in the app's current language. Inside the shell, the welcome screen MUST NOT show its own language selector (the drawer switch replaces it, per FR-005). If LimeSurvey still holds an in-progress session for the guest, Rate MUST resume it at the guest's place in the session's original language, even when that differs from the app's current language. While the survey is open, the survey shell MUST render in the session language. Partial answers MUST never count as a completed response. No room token or QR parameter is used or required.

**Nearby (D-04)**

- **FR-016**: Nearby MUST list 18–24 mock places, each with: name (en, fa), category (Restaurant, Café, Point of interest), distance in metres and derived walking time, rating 1–5, price level 1–3, opening hours and a computed open-now status, short description (en, fa) and tags (en, fa). The data MUST be visibly labelled as demo data in the UI and in the data file itself.
- **FR-017**: Search MUST filter as the guest types, case-insensitively, over place names and tags.
- **FR-018**: Category chips (All / Restaurants / Cafés / Places of interest), an Open now toggle, and a sort control (Distance / Rating) MUST work alone and in any combination with search, and show a result count.
- **FR-019**: Tapping a place MUST open a bottom sheet with full details and mock Directions, Call and Save buttons; the sheet MUST close on backdrop tap or Esc.
- **FR-020**: When nothing matches, Nearby MUST show "No places match" with a "Clear filters" action that resets search, category and Open now.
- **FR-021**: Nearby MUST NOT use maps, photos or any third-party service; category icons are inline vector icons.

**Dashboard (D-05)**

- **FR-022**: The dashboard MUST show KPI tiles: total completed responses, average Q1 (overall stay, 1–5), and NPS from Q7 (percentage of 9–10 minus percentage of 0–6, rounded to a whole number, signed).
- **FR-023**: The dashboard MUST show six category bars for Q1–Q6 (Overall stay, Cleanliness, Comfort, Staff, Breakfast, Facilities), each with its average on a 1–5 scale and its own response count.
- **FR-024**: The dashboard MUST show the share of responses completed in English versus Persian.
- **FR-025**: The dashboard MUST offer date chips Last 7 days / Last 30 days / All that recalculate every figure, based on each response's completion time. Last 7 days and Last 30 days are rolling windows measured from the snapshot's generation time on the database server clock (submission time ≥ NOW() − INTERVAL 7 DAY or 30 DAY). All has no lower bound. The manual SQL check uses the same definition.
- **FR-026**: When the selected range has fewer than 10 responses, the dashboard MUST show a translated low-sample note; with none, a translated empty state.
- **FR-027**: The dashboard MUST show when its data was last refreshed, and a note that only aggregates are shown.
- **FR-028**: A host-side refresh job MUST read completed survey responses strictly read-only and publish an aggregates-only data file served with the app. A one-shot mode refreshes once; a watch mode refreshes every 10 seconds until stopped.
- **FR-029**: The published dashboard data MUST contain only aggregate figures (counts, averages, distributions, language shares) per date range, and MUST NOT contain comment text (Q8, Q9), individual response records, response IDs, IP addresses or any other per-guest data. The refresh job MUST NOT log comment text.
- **FR-030**: Only completed (submitted) responses count; partial/incomplete responses are excluded.
- **FR-031**: The dashboard is open to anyone who can reach the local URL; no login is added in this iteration.

**Languages (D-06)**

- **FR-032**: Every guest-visible string on every screen (shell, Home, Nearby, Dashboard, survey shell additions, toasts, empty states, ARIA labels) MUST exist in English and Persian, with no fallback to the other language.
- **FR-033**: Persian MUST render right-to-left across the whole app, including drawer side, chevrons, progress and bar fill direction; Persian numerals are used for figures in Persian.
- **FR-034**: The chosen language MUST persist across screens and reloads in the guest's browser, and MUST be shared by the static app and the survey shell.

**Demo data (D-07)**

- **FR-035**: A seed job MUST submit about 40 realistic, varied fake responses through the public survey (the same path a guest uses), using both languages, with no direct writes to survey-engine tables. Fake comment text, if any, MUST be clearly synthetic.
- **FR-036**: Seeded responses are recorded at their real submission time. The seed job MUST NOT backdate responses by any means (no RemoteControl API, no clock faking, no table writes). All seeded responses therefore share the seed date (A-02).

**Cross-cutting**

- **FR-037**: All interactive targets MUST be at least 48×48px; chips have a 36px visual height inside a 48px target.
- **FR-038**: No screen may scroll horizontally at 320px width or wider, in either language.
- **FR-039**: Motion is limited to drawer, sheet and toast transitions of 200ms or less, and is disabled under reduced-motion preferences.
- **FR-040**: All in-app links MUST name the target file explicitly (e.g. `/app/index.html`), never a bare directory.
- **FR-041**: No LimeSurvey core file or core table is modified; customisation is limited to the hotel-classic theme, the static app folder, scripts, and container mount configuration needed to serve the app.
- **FR-042**: The project validation script MUST pass after the change, and SHOULD be extended to cover the new app files and the no-hex rule for them.
- **FR-043**: The visual design and interactions MUST closely match `prototype/index.html` (layout, components, strings, icons, states) within the rules above.

### Key Entities *(include if feature involves data)*

- **Place (mock)**: a nearby venue for demo purposes. Attributes: id, name (en/fa), category (restaurant | cafe | poi), distance (m), rating (1–5, one decimal), price level (1–3), opening hours (open/close, may cross midnight or be 24h), description (en/fa), tags (en/fa). Stored as a static data file marked as demo data.
- **Dashboard snapshot**: the published aggregate data. Attributes: generated-at time; for each range (7 days, 30 days, all): total completed, Q1 average, NPS with promoter/passive/detractor counts, per-category (Q1–Q6) average and count, language counts (en, fa). No per-response content.
- **Survey response (existing, read-only)**: a completed LimeSurvey response with submission time, language, Q1–Q7 scores and Q8–Q9 text. Only scores, language and submission time are read for aggregates; Q8–Q9 are never read into the published data.
- **Language preference**: the guest's current language (en | fa), stored in the browser and shared by app and survey shell.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On 320, 360, 390 and 430px viewports, in both languages, 100% of screens (Home, Nearby, Dashboard, survey welcome, each question, thank-you) show the app bar and tab bar, and none scrolls horizontally.
- **SC-002**: 100% of mock controls show the "Coming soon" toast and 0 lead to a broken or error page.
- **SC-003**: A guest can go from Home to a submitted survey and back to Home in under 3 minutes without help.
- **SC-004**: Nearby list updates feel instant (visible within a fraction of a second) on each keystroke and filter change; all filter/sort/search combinations tested return the correct subset.
- **SC-005**: Dashboard figures match a manual count of completed responses exactly for each of the three ranges, using the rolling-window definition in FR-025.
- **SC-006**: With watch mode running, a newly submitted survey is reflected on the dashboard within 15 seconds in at least 9 of 10 trials.
- **SC-007**: The published dashboard data contains zero comment strings and zero per-response records (verified by inspection after seeding with synthetic comment text).
- **SC-008**: 0 untranslated strings found in a full walkthrough in each language; Persian walkthrough shows RTL on every screen including drawer side.
- **SC-009**: The demo-day script (Home → Nearby search "cafe" + Open now → Rate submit → Dashboard count increases) completes end-to-end on the first attempt.
- **SC-010**: The project validation script passes, and every interactive element measured is at least 48px in both dimensions.

## Assumptions

- **A-01 Language handover** (clarified 2026-11-04): The app's stored language is passed to a new survey when it starts, so the guest does not pick again. Inside the shell, the welcome screen's own selector from spec 001 is hidden, and the drawer switch takes its place until Start. Language remains fixed once the survey starts, including on a resumed session (see A-09).
- **A-02 Seed dates** (clarified 2026-11-04): Submitting through the public survey records the real submission time, and LimeSurvey's public path offers no way to backdate. All seeded responses share the seed day, so the 7-day, 30-day and All chips show the same numbers on seed day. This is accepted for the demo. The chips can be shown working by explaining them or by submitting live; a response submitted on a later day separates them.
- **A-03 Seed comments**: Seeded Q8/Q9 text is either empty or obviously synthetic so no realistic "guest comment" exists; it is never published.
- **A-04 Dashboard refresh in the browser**: The dashboard reloads its data file periodically (about every 10 seconds) while open, so a new submission appears without a manual page reload; the 15-second target covers job interval plus browser poll.
- **A-05 Snapshot holds all ranges**: The refresh job precomputes all three date ranges in one snapshot, so date chips switch instantly without per-response data in the browser.
- **A-06 Completed only**: "Completed response" means a response with a submission time; incomplete rows are excluded from all figures.
- **A-07 Mock places**: The 21 places in the prototype are reused as the demo data set (within the 18–24 range). Open-now is computed from the device's local time.
- **A-08 Home highlights**: The three highlights are a fixed curated pick (prototype uses one café, one restaurant, one point of interest).
- **A-09 Navigating away mid-survey** (clarified 2026-11-04): Leaving the survey via tab or drawer does not submit, and no warning dialog is added. If LimeSurvey still holds the session, tapping Rate resumes it in its original language. Once the session has ended or expired, Rate starts fresh in the app's current language. Partial answers never count.
- **A-10 Notifications bell**: The prototype's bell icon is kept as a mock control (toast), even though the demo PRD does not list it.
- **A-11 Placeholder brand**: The placeholder brand (Paradise Garden Hotel / باغ پردیس) from `docs/brand.md` is used; the "Demo · placeholder brand" label satisfies the demo label requirement. Real branding stays open (`docs/decisions.md` §2 item 3).
- **A-12 Shell duplication**: The shell markup exists twice (app pages and survey theme templates) by design (demo PRD §4); keeping them visually identical is part of acceptance.
- **A-13 Serving**: The static app is served by the existing survey web server via a read-only mount; no new container, backend or proxy change is introduced (demo PRD §4).
- **A-14 Tooling**: Host-side refresh and seed jobs use only standard tooling available on the host and query the database through the existing container; this follows `docs/decisions.md` §1 item 4.
- **A-15 Testing**: Phone testing uses browser device emulation; real-phone LAN testing remains open (`docs/decisions.md` §2 item 5).
- **A-16 Open decisions untouched**: None of `docs/decisions.md` §2 items (domain, admin IPs, branding, GDPR, LAN) is resolved by this feature.
