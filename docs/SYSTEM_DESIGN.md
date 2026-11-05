# Club Insights - System Design

Notes written before implementation, structured as Requirements → Architecture → Data model →
Interface → Optimizations (RADIO - the standard shape for a frontend system design pass).

Source brief: `TP - Fullstack Prototype - Club Insights.pdf`. "Now" is fixed at `Mon 5 Oct 2026,
09:00 ICT` for the whole exercise, not the system clock.

---

## 1. Requirements

### 1.1 Functional requirements

Taken directly from the brief's "What to build" and "Rules" sections:

- **FR1** - Switch between the two clubs.
- **FR2** - For a host-chosen date range: active players, sessions held, no-shows, each compared
  against the equal-length period immediately before it.
- **FR3** - One of those three numbers, broken down by week (Mon–Sun, club-local time), as a chart.
- **FR4** - Click a number to see the sessions or players behind it.
- **FR5** - Each number's definition is shown next to it, on screen.
- **FR6** - The club with no data (club-002) gets a real page, not a broken one.

Read-only throughout - nothing in the brief creates, edits, or deletes data.

### 1.2 Assumptions

The brief leaves some things unspecified and there's no stakeholder to ask, so these are calls I'm
making and flagging rather than requirements anyone confirmed:

- **No-shows and active players must say when data is partial**, not just report a number. This
  follows directly from the brief's own rule ("no-shows are unknown, not zero") - I'm extending the
  same logic to active players (below).
- **The three numbers, the chart, and the drill-down lists must agree with each other.** If the
  dashboard can show two different counts for the same thing depending on which screen you're on,
  the "trust" the brief asks for is gone. I'm treating this as a constraint on the architecture
  (§2.2), not just something to be careful about.
- **API errors shouldn't crash the page or show a stack trace.** Not stated in the brief, just
  normal practice for anything that fetches over a network.
- Target browsers: current Chrome/Firefox/Safari. No stated requirement, no reason to assume
  otherwise for an internal tool.

### 1.3 Out of scope

- **Auth** - brief says no login. The API still takes `clubId` as an explicit parameter on every
  query (§2.7), so adding auth later is one check, not a redesign.
- **Editing data** - the brief is read-only throughout.
- **Pagination on drill-downs** - the dataset tops out around 195 sessions / 260 players; a full
  list is fine. Would need to change at real scale (§2.8).
- **Live updates** - "now" is a fixed instant over a static dataset.
- **Multi-timezone handling beyond what's needed** - both clubs are `Asia/Ho_Chi_Minh`. The code
  reads each club's own `time_zone` column rather than hardcoding ICT, so it isn't locked to one
  zone, but it's only ever tested against this one.

---

## 2. Architecture

### 2.1 Shape

```
Web dashboard (Next.js)  ──JSON/HTTP──▶  API (Next.js route handlers, stateless)
Mobile app (not built)   ──JSON/HTTP──▶       │
                                               ▼
                                     Service layer (metrics definitions)
                                               │
                                               ▼
                                     SQLite (seeded from CSVs)
```

The brief states this directly: "The screens talk to the database through a JSON API, because our
mobile app will show this dashboard from the same API." That rules out the usual Next.js shortcut -
a Server Component querying the database directly because it's all one process anyway. The web app
is one client of the API, not a privileged one with a back door.

### 2.2 Service layer

Route handlers are a thin JSON-shaping layer. The definitions themselves - what counts as a held
session, an active player, a no-show, how weeks are bucketed - live in one module (`lib/metrics/`),
and every route handler that needs them imports from there. The weekly chart and the headline total
are sums over the same query, not two separate re-derivations of "active players" that could drift.

### 2.3 Rendering

| Option                                             | Rejected because                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Fully client-rendered SPA                          | Blank page, then JS boot, then fetch, then paint - slower first paint for no real benefit here. |
| Fully server-rendered, full reload per interaction | Changing the date range would mean a page navigation.                                           |

Chosen: server-rendered shell for fast first paint, with the date range, chart toggle, and
drill-down as client components that fetch from the JSON API and own their loading/error state.
This also matches the brief's constraint directly - those client components _are_ the API's client.

### 2.4 Component layering

1. **Route layer** (`app/club/[clubId]/page.tsx`) - owns the URL. Club id, date range, and chart
   metric live in `searchParams`, not component state, so the view is bookmarkable and survives
   refresh/back-button.
2. **Container layer** - fetches via a small typed API client, owns loading/empty/error state.
3. **Presentational layer** - KPI card, chart, drill-down table. Props in, JSX out, no fetching.
4. **Shared layer** - date/timezone utilities, formatting, the API client, zod schemas shared
   between request validation and the frontend's types.

### 2.5 State

| State                                           | Lives in                                                    | Why                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Club id, date range, chart metric               | URL (`searchParams`)                                        | Defines the view; needs to survive refresh and be shareable.                                                                            |
| Fetched summary/weekly/drill-down data          | TanStack Query cache, keyed by `[clubId, from, to, metric]` | Server state, not app state - get dedupe, cancellation on rapid date changes, and loading/error states without hand-rolled `useEffect`. |
| Drill-down panel open, date-picker popover open | Local `useState`                                            | Ephemeral, doesn't need to survive navigation.                                                                                          |

No global store (Redux/Zustand) - nothing here is state that isn't either URL-derived or a cache of
server data.

### 2.6 Data fetching and caching

- Summary and weekly series depend only on `(clubId, from, to)`, not on each other - fetched in
  parallel, not sequentially.
- Drill-down lists are fetched lazily, only when a KPI is opened, not pre-fetched for all three on
  page load.
- A week that's already ended won't change - the no-show count for a week in January is a fixed
  fact. Only the current, in-progress week can still change as bookings and attendance come in. So
  closed weeks can be cached indefinitely and only the current week needs to revalidate. With "now"
  pinned and the dataset static, there's nothing in this exercise that actually exercises that path,
  but it's the one caching decision worth making deliberately rather than by default TTL.

### 2.7 Security

No login means the API is the whole perimeter:

- Every endpoint is GET, read-only.
- Inputs (dates, club id, metric name) validated at the boundary with zod - malformed input returns
  a 400, not a 500 or a query that silently does the wrong thing.
- SQL is parameterized (`better-sqlite3` prepared statements), no string concatenation.
- Error responses are a fixed shape, never the raw exception or stack trace.
- Every query takes `clubId` as an explicit parameter already, so real auth later is "does this
  caller have access to this clubId" added at the top of each handler, not a rewrite.
- Not handled here, and worth naming as a gap rather than ignoring: CORS for a real mobile client on
  a different origin, and rate limiting. No meaningful answer to either in a local take-home.

### 2.8 Scalability

Current data (~195 sessions, ~1,900 bookings) doesn't need any of this. What would actually break,
and the fix, without building it now:

| Dimension            | Breaks at                         | Fix                                                                                                                                                                 |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rows per club        | Millions of bookings              | Index on `(club_id, starts_at)`; pre-aggregated weekly rollups instead of scanning raw bookings per request.                                                        |
| Number of clubs      | Hundreds                          | Club switcher becomes a searchable list; club scoping becomes a real auth boundary.                                                                                 |
| Drill-down list size | Thousands of rows in range        | Pagination/virtualization - currently a full render since the real list tops out around 195.                                                                        |
| Concurrent writers   | Many hosts booking simultaneously | SQLite is a brief constraint here; production would move to Postgres. The service-layer boundary (§2.2) means that's a swap in one module, not every route handler. |
| Request volume       | Many concurrent hosts             | Route handlers are already stateless, scale horizontally. SQLite (single writer) is the actual bottleneck - same Postgres point above.                              |

---

## 3. Data model

### 3.1 Storage (mirrors the CSVs)

```
clubs      (club_id PK, name, time_zone, created_at)
players    (player_id PK, club_id FK, name, joined_club_at)
sessions   (session_id PK, club_id FK, title, starts_at UTC, duration_minutes,
            places, status: scheduled|cancelled, attendance_recorded: bool)
bookings   (booking_id PK, session_id FK, player_id FK, booked_at, status: booked|cancelled,
            cancelled_at, attended: true|false|null)
```

Checked directly in the data: `attended` is null on every booking belonging to a session with
`attendance_recorded = false`, no exceptions. The rule in the brief holds mechanically in the data,
not just as an instruction to follow.

One concrete case worth knowing about: session `s0001` has `starts_at = 2026-01-04T22:30:00Z`. In
UTC that's a Sunday. In club-local time (`Asia/Ho_Chi_Minh`, UTC+7) it's Monday 5 Jan, 05:30 - a
different calendar week. Bucketing by the UTC date instead of the local date puts this session in
the wrong week. This is what brief rule #2 is about, and it's a real row in the dataset, not a
hypothetical - it's the basis for the test in §5.

### 3.2 Derived definitions

Computed server-side, in one place (§2.2):

- **Sessions held** = `status != 'cancelled'` AND `starts_at <= now`, in range. (Held means it
  happened - a future scheduled session hasn't happened yet.)
- **Active players** = distinct players with a non-cancelled booking on a held session in range,
  where `attended = true`, or attendance wasn't recorded at all. Same logic as the brief's own
  no-show rule, applied the other direction: if we won't assume an unrecorded no-show is zero, we
  also won't assume an unrecorded player didn't show up.
- **No-shows** = bookings with `status = 'booked'` and `attended = false`, counted only over sessions
  where `attendance_recorded = true`. Always shown with its denominator - how many sessions in range
  were actually tracked - so a small count isn't mistaken for a complete one.

### 3.3 API shape vs. storage shape

The API response (`PeriodSummary`, `WeeklyPoint[]`, `SessionRow[]`, etc.) is a different shape from
the storage tables on purpose. The storage schema mirrors the CSVs; the API shape is what a
dashboard or mobile client actually wants, and it hides storage detail like how `attended` encodes
"unknown" behind a definition instead.

---

## 4. Interface

All endpoints `GET`, JSON, `from`/`to` as `YYYY-MM-DD` interpreted in the club's local calendar.

```
GET /api/clubs
→ [{ clubId, name, timeZone, hasData }]

GET /api/clubs/:clubId/summary?from=2026-09-07&to=2026-10-04
→ {
    range: { from, to },
    previousRange: { from, to },
    metrics: {
      activePlayers: { value, previousValue, delta, deltaPct, definition },
      sessionsHeld:  { value, previousValue, delta, deltaPct, definition },
      noShows:       { value, previousValue, delta, deltaPct, definition,
                        trackedSessions, totalSessions }
    }
  }

GET /api/clubs/:clubId/weekly?metric=activePlayers&from=&to=
→ { metric: "activePlayers", points: [{ weekStart: "2026-09-07", value: 41 }, ...] }

GET /api/clubs/:clubId/sessions?from=&to=    // drill-down: sessions held
GET /api/clubs/:clubId/players?from=&to=     // drill-down: active players
GET /api/clubs/:clubId/no-shows?from=&to=    // drill-down: no-shows
```

Error shape, every endpoint:

```
400 { "error": { "code": "invalid_date_range", "message": "..." } }
404 { "error": { "code": "club_not_found", "message": "..." } }
500 { "error": { "code": "internal_error", "message": "Something went wrong" } }
```

Club switching (FR1) is just a navigation to a new `/club/[clubId]` URL with its own server-rendered
shell, so there's no moment where the header says one club while a KPI card still shows the other's
number from a previous fetch.

---

## 5. Testing and what's not built

**Test target**: no-show calculation crossed with week bucketing. This is what the brief explicitly
flags as a trap (unknown ≠ zero) and where the data has a provable edge case (`s0001`, §3.1). A
pure-function unit test against hand-built fixtures, no database: a session without attendance
tracking excluded from both the count and its denominator; a cancelled booking never counted as a
no-show; a session whose UTC date and club-local date fall on different calendar days bucketed into
the correct week.

**Performance**: no caching layer or rollup table being built. ~2,000 rows total across all four
tables, a parameterized SQLite query is sub-millisecond. §2.6 and §2.8 cover what would be added at
real scale.

**Not built, already covered above**: auth (§1.3, §2.7), pagination (§1.3, §2.8), live updates
(§1.3, §2.6), CORS/rate limiting for a real mobile deployment (§2.7).
