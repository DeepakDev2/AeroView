# Progress Log — AeroView

> Running session log. Updated after each task.

---

## Application Flow

```
User fills InputForm
      │
      ▼
FlightInput { origin, destination, departureUTC, preferences }
      │
      ▼
Layer 2A — geodesic.ts
greatCircleWaypoints() → WaypointData[] (lat/lon/bearing/time only)
      │
      ▼
Layer 2B — solar.ts
enrichWaypointsWithSolar() → WaypointData[] (+ solarAzimuth, solarElev, horizonEvents, POIs)
      │
      ▼
Layer 3 — recommend.ts
computeVerdict() → SeatVerdict { winner, confidence, leftEvents, rightEvents }
      │
      ├──→ Layer 4A — MapView.tsx (route + sun + events on Leaflet map)
      ├──→ Layer 4B — /api/narrative → Anthropic streaming → NarrativeCard.tsx
      └──→ Layer 5  — ResultScreen.tsx (SeatBadge + EventLists + WindowMockup)
```

---

## Libraries Used

| Library            | Version  | Purpose                                  |
|--------------------|----------|------------------------------------------|
| next               | ^15      | App framework (App Router)               |
| react              | ^19      | UI rendering                             |
| react-dom          | ^19      | DOM rendering                            |
| suncalc            | latest   | Solar position & horizon times           |
| leaflet            | latest   | Interactive map                          |
| react-leaflet      | latest   | React bindings for Leaflet               |
| motion             | latest   | Animation (Framer Motion v11+ package)   |
| @anthropic-ai/sdk  | latest   | Anthropic API / Claude streaming         |
| typescript         | latest   | Type safety                              |
| tailwindcss        | latest   | Utility CSS                              |
| jest               | latest   | Unit testing                             |
| ts-jest            | latest   | TypeScript Jest transformer              |
| @types/leaflet     | latest   | Leaflet type definitions                 |
| @types/suncalc     | latest   | SunCalc type definitions                 |

---

## Rules We Made

1. **create-next-app workaround:** Directory name AeroView (capitals) fails npm naming rules. All future projects: use lowercase directory names OR initialize manually.
2. **utcOffsetMin is standard offset:** Does NOT account for DST. Components using departure local time must handle DST separately.
3. **motion package:** Import from `motion/react`, not `framer-motion`.
4. **SunCalc azimuth MUST be converted:** Every read of SunCalc azimuth goes through `toNorthClockwiseDeg()` — no exceptions.

---

## Session Log

### 2026-04-12 — Phase 0 Execution
**What was built:**
- Next.js 15 manually scaffolded (create-next-app failed due to capital-letter directory name)
- All approved packages installed: suncalc, leaflet, react-leaflet, motion, @anthropic-ai/sdk + all devDeps
- Config files created: tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, jest.config.ts, .eslintrc.json
- App boilerplate: src/app/layout.tsx, src/app/page.tsx, src/app/globals.css (cleaned)
- Folder structure confirmed: all required directories exist
- All 6 docs/ files written with full Phase 0 content and pre-populated schemas/findings
- CLAUDE.md updated with key commands and layer map
- src/lib/constants.ts created with all 9 constants
- airports.json and pois.json generated via tmp/ scripts
- Phase 0 test cases P0-T1 through P0-T8 validated

**Decisions made:**
- Manual Next.js setup instead of create-next-app (documented in findings.md and error.md)
- postcss.config uses @tailwindcss/postcss plugin (Tailwind v4 pattern)

**What's next:**
- Phase 1 — Present WaypointData interfaces and get user approval before coding

### 2026-04-12 — Phase 1 Execution
**What was built:**
- `src/lib/geodesic.ts` — 4 pure functions: haversineKm, bearingDeg, intermediatePoint, greatCircleWaypoints
- `__tests__/geodesic.test.ts` — 10 test cases P1-T1 through P1-T10, all passing
- `tsconfig.jest.json` — separate Jest TS config (rootDir=., commonjs module, ignoreDeprecations 6.0)
- `jest.config.ts` updated to use tsconfig.jest.json

**Key implementation details:**
- intermediatePoint uses SLERP (not lerp) for true great-circle path
- Antimeridian fix: lon adjusted ±360° when consecutive diff > 180°
- Exact origin/destination coords assigned to first/last waypoints to prevent float drift
- Solar fields initialized to 0/null/[] — Phase 2 fills them

**Test results:** `npx jest __tests__/geodesic.test.ts` — 10 passed, 0 failed (1.462s)

**What's next:**
- Phase 2 — Present astronomy engine interfaces (solar.ts) and get user approval before coding

### 2026-04-12 — Phase 2 Execution
**What was built:**
- `src/lib/solar.ts` — 6 pure functions: toNorthClockwiseDeg, getSolarPosition, detectHorizonEvent, elevationMultiplier, scanNearbyPOIs, enrichWaypointsWithSolar
- `__tests__/solar.test.ts` — 14 test cases TC-P2-T1 through TC-P2-T14, all passing

**Key implementation details:**
- toNorthClockwiseDeg: `((rawAzimuthRad + π) * 180/π) % 360` — rotates SunCalc's south-origin to north-origin
- enrichWaypointsWithSolar uses a `for` loop (not `.map()`) so each iteration reads `prevElevDeg` from the already-enriched result array, not the original unenriched input
- Bug found and fixed during testing: `.map()` approach read original solarElevDeg=0 for prev waypoint, falsely triggering "sunset" in polar night test

**Test results:** `npx jest __tests__/solar.test.ts` — 14 passed, 0 failed (0.753s)

**What's next:**
- Phase 3 — Present recommendation engine interfaces (recommend.ts) and get user approval before coding

### 2026-04-12 — Phase 3 Execution
**What was built:**
- `src/lib/recommend.ts` — 4 pure functions: sideOfPlane, scoreSolarEvent, scoreLandmark, computeVerdict
- `__tests__/recommend.test.ts` — 12 test cases TC-P3-T1 through TC-P3-T12, all passing

**Key implementation details:**
- sideOfPlane: relativeBearing = (objectAzimuth - planeBearing + 360) % 360; [0,180) → right, [180,360) → left
- avoidSun penalises the side the sun is on (not a bonus to the opposite side)
- winner='either' when |left−right| < LOW_CONFIDENCE_THRESHOLD × total, or when total=0
- confidence = |leftScore−rightScore| / (|leftScore|+|rightScore|), 0 when no events

**Test results:** `npx jest __tests__/recommend.test.ts` — 12 passed, 0 failed (0.785s)

**What's next:**
- Phase 4 — Present InputForm component interface and get user approval before coding

### 2026-04-12 — Phase 4 Execution
**What was built:**
- `src/components/InputForm.tsx` — airport autocomplete (3-char min, 8 results max), departure date+time UTC, 4 weight sliders, overcast toggle, disabled submit until all fields filled
- `__tests__/InputForm.test.tsx` — 6 lean component tests using @testing-library/react
- `jest.setup.ts` — imports @testing-library/jest-dom matchers
- Config fixes: `setupFilesAfterEnv` (not `setupFilesAfterFramework`), `jsx: react-jsx` in tsconfig.jest.json

**Packages added:** @testing-library/react, @testing-library/jest-dom, jest-environment-jsdom

**Key implementation details:**
- Layer 1 purity maintained — zero domain math in component, only Array.filter + String methods
- jsdom env scoped per-file via `@jest-environment jsdom` docblock, global env stays node
- useMemo for autocomplete filtering to avoid recomputing on every keystroke

**Test results:** `npx jest __tests__/InputForm.test.tsx` — 6 passed, 0 failed (2.0s)

**What's next:**
- Phase 5 — Present MapView component interface and get user approval before coding

### 2026-04-12 — Phase 5 Execution
**What was built:**
- `src/components/MapView.tsx` — Leaflet map with coloured route polyline, origin/dest markers, sunrise/sunset markers, POI markers, verdict badge overlay
- `__tests__/MapView.test.tsx` — 5 tests with react-leaflet and leaflet fully mocked

**Key implementation details:**
- Must be imported via `next/dynamic(() => import('@/components/MapView'), { ssr: false })` — Leaflet requires browser DOM
- buildSegments() groups consecutive same-colour waypoints into minimal Polyline elements
- collectUniquePOIs() deduplicates POIs by poi.id across all waypoints
- FitBounds child component uses useMap() + useEffect to auto-zoom to route bounds
- Leaflet default icon fix: delete _getIconUrl + mergeOptions with require() paths
- divIcons with emoji avoid webpack asset URL issues entirely for custom markers

**Test results:** `npx jest __tests__/MapView.test.tsx` — 5 passed, 0 failed (2.065s)

**What's next:**
- Phase 6 — Present LLM Narrative API route and NarrativeCard interfaces, get user approval before coding

### 2026-04-12 — Phase 6 Execution
**What was built:**
- `src/app/api/narrative/route.ts` — POST handler streaming Gemini response as text/plain ReadableStream
- `src/components/NarrativeCard.tsx` — streaming fetch client, 4 UI states (loading/streaming/done/error)
- `__tests__/narrative.test.ts` — 5 route handler tests, @google/generative-ai fully mocked

**Key decisions:**
- Migrated from Anthropic to Gemini — Anthropic credits unavailable, Gemini AI Studio key works
- Model: gemini-2.5-flash (2.0 models deprecated for new users on AI Studio keys)
- Rule 4 complied: tmp/test-gemini.ts confirmed connection before integration
- NarrativeCard cleanup: cancelled flag prevents setState after unmount

**Test results:** `npx jest __tests__/narrative.test.ts` — 5 passed, 0 failed (1.345s)

**What's next:**
- Phase 7 — Present ResultScreen, SeatBadge, EventList, WindowMockup interfaces and get user approval

### 2026-04-12 — Phase 7 Execution
**What was built:**
- `src/components/SeatBadge.tsx` — winner badge with confidence % and score comparison bar
- `src/components/EventList.tsx` — per-side events with icon/timing/score bar, empty state
- `src/components/WindowMockup.tsx` — CSS oval window shape, highlighted for winner side
- `src/components/ResultScreen.tsx` — Layer 5 assembly: badge + windows + event lists + dynamic MapView + NarrativeCard
- `__tests__/ResultScreen.test.tsx` — 6 tests, MapView and NarrativeCard mocked

**Key implementation details:**
- ResultScreen uses `next/dynamic(() => import('./MapView'), { ssr: false })` — Leaflet requires browser DOM
- topEvent() helper in ResultScreen picks highest-scoring event for WindowMockup (pure UI, not domain logic)
- WindowMockup uses CSS border-radius trick for oval airplane window shape

**Test results:** `npx jest __tests__/ResultScreen.test.tsx` — 6 passed, 0 failed (2.109s)

**What's next:**
- Phase 8 — Integration & End-to-End: wire page.tsx, run full test suite, typecheck, build
