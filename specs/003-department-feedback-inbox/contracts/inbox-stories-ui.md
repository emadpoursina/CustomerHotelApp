# Contract: Inbox, stories, shell entry points

Extends spec 002 `app-shell.md` / `app-screens.md`. New routes: `inbox`, `stories`. Tokens and ≥48px / no horizontal scroll at 320px+ still apply.

## 1. Shell changes (Twig + `app.js`, keep DOM in sync)

| Control | Was | Becomes |
|---|---|---|
| App-bar bell | `<button data-soon>` | `<a href="/app/inbox.html">` (survey: also `data-pjax="false"`). `aria-label` = notifications. Child `.hs-dot` visible iff unread count > 0 |
| Fifth tab | Services `data-soon` | `<a href="/app/stories.html">` label Guest stories / داستان‌ها (`tab.stories`, retire `tab.services` as the destination name) |
| Drawer | no stories item | `<a href="/app/stories.html">` after Dashboard, before the mock block |
| Home | mock services grid (`data-soon`) | Static teaser card/block: title + promotional copy only; `href="/app/stories.html"`. **No** fetch of stories API on Home |

Bell on survey pages uses the same href. `HotelApp.renderShell` gains routes `inbox` and `stories` for `aria-current` and titles.

Badge: on shell render, `GET /app/api/inbox.php?view=meta`, compare `ids` to `localStorage['hotel.inbox.read']`. Failure → hide the dot (do not toast “Coming soon”).

## 2. Inbox (`app/inbox.html`)

Full-screen inside the shell (`<main id="hs-main">`).

**List** (no `id` query):

- Filters (AND): department chips (All + four codes); status chips All / Unread / Pending / Published / Private.
- Row: colour stripe (`--dept-*`, inline-start), department label, overall, NPS raw, relative time, unread marker. **No comment text.**
- Empty: no rows in the table vs no rows matching filters — two different strings.
- Tap row → `inbox.html?id={queueId}` (or `#id=`); mark that id read in `localStorage` on detail load.

**Detail**:

- Department, overall, NPS, submitted time, praise (Q8), complaint (Q9) or empty states.
- Long comments: vertical scroll; no horizontal overflow at 320px.
- pending: buttons انتشار (en: Publish) and خصوصی بماند (en: Keep private).
- published: only Keep private / خصوصی بماند.
- private: neither publish button.
- After action: update local view from the JSON `state`; if unpublished, stories will omit it on next load.

Relative time buckets: just now; N minutes; N hours; N days. `fa` uses Persian digits.

## 3. Stories (`app/stories.html`)

- Load `GET /app/api/stories.php`.
- Empty: calm empty state (not an error).
- Card: anonymous; department visible; praise and/or complaint excerpts; if both exist, **one** card. Truncate with an expand control when taller than ~6 lines so the list stays scannable.
- Error/HTTP failure: error state + retry (not the empty state).

## 4. Reduced motion

Inbox/stories animations follow existing `prefers-reduced-motion` rules in `shell.css` / `app.css` (≤200ms or none).

## 5. Thank-you

Unchanged buttons (Home, Nearby). Additionally a non-blocking `POST {op:sync}`. No third button to stories (A-18).
