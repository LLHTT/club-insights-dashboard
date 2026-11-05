# Club Insights

A dashboard showing a club host how their club is doing: active players, sessions held, and
no-shows for a chosen date range, each compared against the equal-length period before it,
plus a weekly breakdown and drill-down lists behind each number.

Built for the "Fullstack Test Project: Club Insights" take-home assignment.

## Running it

Requires Node 20.9+ (pinned to 20.19.0 via `.nvmrc`).

```bash
npm install
npm run dev
```

This seeds a local SQLite database from the CSVs in `data/` before starting the dev server,
so there's no separate setup step. Open http://localhost:3000, it redirects to club-001
(the club with data; club-002 is intentionally empty, to exercise the empty state).

Other commands:

```bash
npm run test           # 19 unit tests - mostly the no-show/week-bucketing logic
npm run lint
npm run format
npm run build && npm start   # also reseeds first
```

The dataset is static, and "now" is pinned to Mon 5 Oct 2026, 09:00 ICT
(`src/lib/metrics/time.ts`) per the brief, not the system clock.

## How this is organized

- `docs/SYSTEM_DESIGN.md` - the design doc written before implementation: requirements,
  architecture, data model, API contract, and the reasoning behind each decision. Start there
  for the "why" behind what's below.
- `src/lib/metrics/` - the service layer. `definitions.ts` and `time.ts` are pure functions
  with no database access, directly unit-tested. `repository.ts` is the only module that
  queries SQLite. `index.ts` combines the two into exactly what the API returns.
- `src/app/api/` - route handlers. Thin on purpose: validate input with zod, call one
  function in `src/lib/metrics`, return JSON. They never compute anything themselves.
- `src/components/` - the frontend. Presentational pieces (`kpi-card.tsx`) are kept separate
  from containers that fetch and own loading/error state (`club-summary.tsx`,
  `weekly-chart.tsx`, `drilldown-sheet.tsx`).
- `scripts/seed.ts` - rebuilds the SQLite database from `data/*.csv` on every
  `predev`/`prestart`.

## Decisions worth knowing about

- **No-shows and active players degrade honestly, not to zero.** The brief says no-shows are
  unknown, not zero, when attendance wasn't tracked for a session - the no-shows card shows
  its tracked/total session count alongside the number, so a small count isn't mistaken for a
  complete one. The same logic extends to active players: benefit of the doubt when
  attendance wasn't recorded.
- **Weeks are bucketed by the club's local calendar day, not UTC.** There's a real row in the
  data (session `s0001`) that falls on a different calendar day in UTC than in
  `Asia/Ho_Chi_Minh`. That row is the basis for the week-bucketing test in
  `src/lib/metrics/definitions.test.ts`.
- **The web app is a client of its own JSON API**, not a server component querying the
  database directly, because the brief says a mobile app will show the same dashboard from
  the same API.
- **Club id, date range, and chart metric all live in the URL**, not component state, so the
  view is bookmarkable and survives a refresh or back/forward navigation.
- **The theme is green on a white background**, pulled from reclub's own site rather than
  left as the grayscale shadcn default.

Full reasoning for all of this, including the rendering/state/caching strategy, the
component layering, and the full API contract, is in `docs/SYSTEM_DESIGN.md`.

## What's not built

- Auth - the brief says no login.
- Editing data - the brief is read-only throughout.
- Pagination on drill-down lists - the dataset tops out around 195 sessions / 260 players, so
  a full list is fine here; would need to change at real scale.
- Live updates - "now" is a fixed instant over a static dataset.
- Multi-timezone handling beyond what's needed - both clubs in the dataset are
  `Asia/Ho_Chi_Minh`. The code reads each club's own `time_zone` column rather than
  hardcoding it, so it isn't locked to one zone, but it's only ever tested against this one.
