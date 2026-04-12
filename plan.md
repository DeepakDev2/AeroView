# AeroView — Master Project Plan

> This file is the single source of truth for every phase, subtask, step, and test case.
> Update after every session. Mark steps [x] only after tests pass and user approves.

---

## PHASE 0 — Project Scaffold & Foundation

**Goal:** Bootstrap the Next.js project, install all approved libraries, create the entire folder structure, and initialise every doc file. Nothing gets built until this phase is 100% done.

---

### Phase 0 — Steps

#### 0.1 — Initialise Next.js
- [ ] Run `npx create-next-app@latest aeroview --typescript --tailwind --app --eslint`
- [ ] Confirm `src/` directory structure is used (not root-level pages/)
- [ ] Confirm `app/` router is active (not pages/ router)
- [ ] Delete boilerplate content from `app/page.tsx` and `app/globals.css`
- [ ] Verify `npx next dev` starts with zero errors on port 3000

#### 0.2 — Install approved dependencies
- [ ] Runtime: `npm install suncalc leaflet react-leaflet motion @anthropic-ai/sdk`
- [ ] Dev types: `npm install -D @types/leaflet @types/suncalc jest @types/jest ts-jest`
- [ ] Verify all packages appear in `package.json` with correct versions
- [ ] Confirm no peer-dependency warnings that would break the build

#### 0.3 — Environment setup
- [ ] Create `.env.local` with `ANTHROPIC_API_KEY=` (empty, user fills in)
- [ ] Create `.env.example` with `ANTHROPIC_API_KEY=your_key_here`
- [ ] Add `.env.local` to `.gitignore`
- [ ] Add `/tmp/` to `.gitignore`
- [ ] Add `*.log` to `.gitignore`
- [ ] Confirm `.env.local` is NOT tracked by git (`git status` check)

#### 0.4 — Create folder structure
- [ ] `src/lib/` — pure function modules
- [ ] `src/components/` — React components
- [ ] `src/data/` — static JSON databases
- [ ] `src/types/` — TypeScript type re-exports
- [ ] `src/app/api/narrative/` — LLM streaming route
- [ ] `__tests__/` — unit test files
- [ ] `docs/` — all documentation markdown files
- [ ] `taskInfo/` — per-task elaboration folders
- [ ] `tmp/` — gitignored scratch space

#### 0.5 — Create all doc files with headers
- [ ] `docs/task_plan.md` — this file, project-wide checklist
- [ ] `docs/findings.md` — research log (pre-populate with 8 known gotchas)
- [ ] `docs/progress.md` — session log + app flow diagram + libraries table
- [ ] `docs/error.md` — error + changes log (empty, headers only)
- [ ] `docs/schema.md` — all TypeScript interfaces (pre-populate with agreed shapes)
- [ ] `docs/testcases.md` — all test cases with checkboxes

#### 0.6 — Create CLAUDE.md at project root
- [ ] Project description (one line)
- [ ] Key commands: dev, build, typecheck, test, lint
- [ ] Critical rules summary (12 rules condensed)
- [ ] Docs reference section
- [ ] Layer map (Layer 1 → 5 with file paths)

#### 0.7 — Create constants file
- [ ] `src/lib/constants.ts` with:
  - `CRUISE_SPEED_KMH = 900`
  - `WAYPOINT_STEP_KM = 50`
  - `POI_RADIUS_KM = 250`
  - `TWILIGHT_ELEV_DEG = -6`
  - `WEATHER_CLEAR_FACTOR = 1.0`
  - `WEATHER_OVERCAST_FACTOR = 0.2`
  - `MAX_WEIGHT = 3`
  - `MIN_WEIGHT = -2`
  - `LOW_CONFIDENCE_THRESHOLD = 0.1`

#### 0.8 — Create airports.json and pois.json
- [ ] `src/data/airports.json` — array of ~3000 airports with `{ iata, name, city, country, lat, lon, timezone, utcOffsetMin }`
- [ ] `src/data/pois.json` — array of ~200 landmarks with `{ id, name, lat, lon, category, minVisibilityKm }`
- [ ] Confirm file sizes are reasonable (airports ~500KB, pois ~20KB)
- [ ] Confirm JSON is valid (parse it in a tmp/ test script)

#### 0.9 — Verify full scaffold
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Run `npx next build` — zero errors
- [ ] Run `find . -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path './tmp/*'` and confirm tree matches spec
- [ ] Present tree to user for approval

---

### Phase 0 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P0-T1 | Dev server starts | `npm run dev` | Server on port 3000, zero console errors | [ ] |
| P0-T2 | TypeScript compiles | `npx tsc --noEmit` | Exit code 0, zero errors | [ ] |
| P0-T3 | Production build | `npx next build` | Build completes, zero errors | [ ] |
| P0-T4 | .env.local is gitignored | `git status` after creating .env.local | File does NOT appear in git status | [ ] |
| P0-T5 | airports.json is valid | `JSON.parse(fs.readFileSync('src/data/airports.json'))` | Parses without error, array length > 2000 | [ ] |
| P0-T6 | pois.json is valid | `JSON.parse(fs.readFileSync('src/data/pois.json'))` | Parses without error, array length > 100 | [ ] |
| P0-T7 | Constants file imports | `import { CRUISE_SPEED_KMH } from '@/lib/constants'` | Value equals 900, no type errors | [ ] |
| P0-T8 | tmp/ is gitignored | Create a file in tmp/, run `git status` | File does NOT appear in git status | [ ] |

**Phase 0 complete when:** All 8 test cases pass AND user approves the directory tree.

---

---

## PHASE 1 — Layer 2A: Geodesic Engine

**File:** `src/lib/geodesic.ts`
**Goal:** Pure functions that generate a great-circle route between two airports, sampled every 50 km, with a bearing at each point. Zero external geodesy libraries. Zero React imports.

**Input received from:** Phase 4 (Layer 1 form) via `FlightInput.origin` and `FlightInput.destination`
**Output passed to:** Phase 2 (Layer 2B solar engine) as `WaypointData[]`

---

### Phase 1 — Steps

#### 1.1 — Present data shapes to user and get approval
- [ ] Show `AirportRecord` input interface
- [ ] Show `WaypointData` output interface (fields populated by this phase: index, lat, lon, bearingDeg, cumulativeKm — solar fields are null/0 at this stage)
- [ ] Show function signatures: `haversineKm`, `bearingDeg`, `intermediatePoint`, `greatCircleWaypoints`
- [ ] STOP — wait for user approval before writing any code

#### 1.2 — Implement `haversineKm(lat1, lon1, lat2, lon2): number`
- [ ] Convert degrees to radians for all inputs
- [ ] Apply haversine formula: `a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)`
- [ ] `c = 2·atan2(√a, √(1−a))`
- [ ] Return `EARTH_RADIUS_KM * c` where `EARTH_RADIUS_KM = 6371`
- [ ] Result must be in kilometres
- [ ] Function must be pure — no side effects, no imports except constants

#### 1.3 — Implement `bearingDeg(lat1, lon1, lat2, lon2): number`
- [ ] Formula: `θ = atan2(sin(Δlon)·cos(lat2), cos(lat1)·sin(lat2) − sin(lat1)·cos(lat2)·cos(Δlon))`
- [ ] Convert result to degrees
- [ ] Normalise to [0, 360) using `(bearing + 360) % 360`
- [ ] 0° = north, 90° = east, 180° = south, 270° = west

#### 1.4 — Implement `intermediatePoint(lat1, lon1, lat2, lon2, fraction): { lat, lon }`
- [ ] Use spherical linear interpolation (NOT simple linear interpolation — that gives a rhumb line, not great circle)
- [ ] Angular distance `d = 2·asin(√(haversine(Δlat) + cos(lat1)·cos(lat2)·haversine(Δlon)))`
- [ ] `a = sin((1−f)·d) / sin(d)`, `b = sin(f·d) / sin(d)`
- [ ] `x = a·cos(lat1)·cos(lon1) + b·cos(lat2)·cos(lon2)`
- [ ] `y = a·cos(lat1)·sin(lon1) + b·cos(lat2)·sin(lon2)`
- [ ] `z = a·sin(lat1) + b·sin(lat2)`
- [ ] `latMid = atan2(z, √(x²+y²))`, `lonMid = atan2(y, x)`
- [ ] Return both converted back to degrees

#### 1.5 — Implement `greatCircleWaypoints(origin, destination): WaypointData[]`
- [ ] Compute total distance using `haversineKm`
- [ ] Compute segment count: `Math.ceil(totalKm / WAYPOINT_STEP_KM)`
- [ ] Generate `segmentCount + 1` waypoints (includes both endpoints)
- [ ] For each waypoint at fraction `f = i / segmentCount`:
  - [ ] Call `intermediatePoint` to get lat/lon
  - [ ] Call `bearingDeg` between this point and the next (use destination bearing for last point)
  - [ ] Set `cumulativeKm = f * totalKm`
  - [ ] Set `utcTime` by adding `(cumulativeKm / CRUISE_SPEED_KMH) * 3600` seconds to `departureUTC`
  - [ ] Set solar fields to null/0 (populated by Phase 2)
- [ ] First waypoint: exactly origin lat/lon
- [ ] Last waypoint: exactly destination lat/lon
- [ ] Handle antimeridian: if `|lon − prevLon| > 180`, adjust lon by ±360

#### 1.6 — Write unit tests in `__tests__/geodesic.test.ts`
- [ ] Import only from `src/lib/geodesic.ts` and `src/lib/constants.ts`
- [ ] No network calls, no file I/O in tests
- [ ] Cover all 5 test cases below

---

### Phase 1 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P1-T1 | JFK to LHR distance | lat1=40.6413, lon1=-73.7781, lat2=51.4775, lon2=-0.4614 | 5539 km ± 50 km | [ ] |
| P1-T2 | Waypoint count | Same route, WAYPOINT_STEP_KM=50 | `Math.ceil(5539/50) + 1 = 112` waypoints | [ ] |
| P1-T3 | First and last waypoints | Any route | First = origin coords ± 0.0001°, Last = destination coords ± 0.0001° | [ ] |
| P1-T4 | All bearings in range | Any route | Every waypoint bearingDeg is in [0, 360) | [ ] |
| P1-T5 | Antimeridian LAX→NRT | lat1=33.9425, lon1=-118.4081, lat2=35.7653, lon2=140.3856 | No consecutive lon difference > 180°, total distance ≈ 8,815 km ± 100 km | [ ] |
| P1-T6 | Bearing north | lat1=0, lon1=0, lat2=10, lon2=0 | bearingDeg ≈ 0° ± 1° | [ ] |
| P1-T7 | Bearing east | lat1=0, lon1=0, lat2=0, lon2=10 | bearingDeg ≈ 90° ± 1° | [ ] |
| P1-T8 | Short route (<50km) | Two airports 30 km apart | Exactly 2 waypoints (origin + destination) | [ ] |
| P1-T9 | cumulativeKm progression | Any route | cumulativeKm[0]=0, increases monotonically, last ≈ totalKm ± 1 | [ ] |
| P1-T10 | utcTime progression | departureUTC = 2024-06-21T08:00:00Z, JFK→LHR | utcTime[0] = departure, utcTime increases by ~200s per waypoint, last ≈ departure + 6.15h | [ ] |

**Phase 1 complete when:** All 10 test cases pass AND user approves.

---

---

## PHASE 2 — Layer 2B: Astronomy Engine

**File:** `src/lib/solar.ts`
**Goal:** Wrap SunCalc.js to compute solar position at each waypoint, detect sunrise/sunset horizon events, scan nearby POIs, and enrich the `WaypointData[]` array. Zero React imports. Pure functions only.

**Input received from:** Phase 1 output `WaypointData[]` (partially populated)
**Output passed to:** Phase 3 (Layer 3 recommendation engine) as fully enriched `WaypointData[]`

---

### Phase 2 — Steps

#### 2.1 — Present data shapes to user and get approval
- [ ] Show `SolarPosition` interface
- [ ] Show `HorizonTimes` interface
- [ ] Show `POIResult` interface
- [ ] Show enriched `WaypointData` with solar fields filled
- [ ] Show function signatures
- [ ] STOP — wait for user approval

#### 2.2 — Implement SunCalc azimuth conversion (CRITICAL)
- [ ] Create helper `toNorthClockwiseDeg(sunCalcAzimuthRad: number): number`
- [ ] Formula: `(sunCalcAzimuthRad * 180 / Math.PI + 180) % 360`
- [ ] SunCalc measures from south going westward. +180 shifts origin to north. %360 wraps.
- [ ] Add a comment above this function explaining the convention difference
- [ ] This helper must be used every single place azimuth is read from SunCalc — never use raw value

#### 2.3 — Implement `getSolarPosition(date, lat, lon): SolarPosition`
- [ ] Call `SunCalc.getPosition(date, lat, lon)`
- [ ] Extract `azimuth` → apply `toNorthClockwiseDeg()` → `solarAzimuthDeg`
- [ ] Extract `altitude` → convert radians to degrees → `solarElevDeg`
- [ ] Return `{ solarAzimuthDeg, solarElevDeg }`

#### 2.4 — Implement `detectHorizonEvent(prevElevDeg, currElevDeg): 'sunrise' | 'sunset' | null`
- [ ] If `prevElevDeg < 0` AND `currElevDeg >= 0` → return `'sunrise'`
- [ ] If `prevElevDeg >= 0` AND `currElevDeg < 0` → return `'sunset'`
- [ ] Otherwise → return `null`
- [ ] Do not call SunCalc inside this function — it only compares two numbers

#### 2.5 — Implement `getElevationMultiplier(elevDeg: number): number`
- [ ] `elevDeg < TWILIGHT_ELEV_DEG` → return `0` (suppressed, sun below astronomical twilight)
- [ ] `elevDeg >= TWILIGHT_ELEV_DEG && elevDeg < 0` → return `0.5` (dim twilight)
- [ ] `elevDeg >= 0` → return `1.0` (full daylight)

#### 2.6 — Implement `scanNearbyPOIs(lat, lon, bearingDeg): POIResult[]`
- [ ] Load `src/data/pois.json` (import statically, not fs.readFile)
- [ ] For each POI: compute distance using `haversineKm`
- [ ] Filter to POIs within `POI_RADIUS_KM`
- [ ] For each qualifying POI: compute bearing from plane to POI using `bearingDeg` from geodesic.ts
- [ ] Return `POIResult[]` sorted by distance ascending
- [ ] Maximum 5 POIs per waypoint (top 5 closest)

#### 2.7 — Implement `getSubSolarPoint(date: Date): { lat: number, lon: number }`
- [ ] The sub-solar point is the lat/lon directly below the sun (sun is at zenith there)
- [ ] `sunLon = -((date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60 - 12) * 15`
- [ ] Normalise to [-180, 180]
- [ ] For `sunLat`: compute solar declination from day of year
- [ ] Return `{ lat: sunLat, lon: sunLon }`
- [ ] Used by MapView to place the animated sun marker

#### 2.8 — Implement `enrichWaypointsWithSolar(waypoints: WaypointData[], prefs: UserPreferences): WaypointData[]`
- [ ] Iterate waypoints
- [ ] For each: call `getSolarPosition` using waypoint's `utcTime`, `lat`, `lon`
- [ ] For each (index > 0): call `detectHorizonEvent(prev.solarElevDeg, curr.solarElevDeg)`
- [ ] For each: call `scanNearbyPOIs`
- [ ] Mutate and return the enriched array (or map to new objects — do not mutate originals)
- [ ] Handle SunCalc polar edge case: if getTimes returns `false` for sunrise/sunset, set `isHorizonEvent: null`

#### 2.9 — Write unit tests in `__tests__/solar.test.ts`
- [ ] Mock SunCalc where needed to test edge cases
- [ ] Cover all test cases below

---

### Phase 2 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P2-T1 | Azimuth conversion — south | SunCalc raw azimuth = 0 rad (south) | toNorthClockwiseDeg(0) = 180° | [ ] |
| P2-T2 | Azimuth conversion — north | SunCalc raw azimuth = Math.PI rad | toNorthClockwiseDeg(Math.PI) ≈ 0° or 360° | [ ] |
| P2-T3 | Azimuth conversion — west | SunCalc raw azimuth = Math.PI/2 | toNorthClockwiseDeg(Math.PI/2) = 270° | [ ] |
| P2-T4 | Solar noon London | date=2024-06-21T12:00:00Z, lat=51.5, lon=-0.1 | solarElevDeg ≈ 62° ± 2°, solarAzimuthDeg ≈ 180° ± 5° | [ ] |
| P2-T5 | Horizon event — sunrise detection | prevElevDeg=-1, currElevDeg=+1 | returns 'sunrise' | [ ] |
| P2-T6 | Horizon event — sunset detection | prevElevDeg=+1, currElevDeg=-1 | returns 'sunset' | [ ] |
| P2-T7 | No horizon event | prevElevDeg=5, currElevDeg=10 | returns null | [ ] |
| P2-T8 | Elevation multiplier — suppressed | elevDeg=-10 | returns 0 | [ ] |
| P2-T9 | Elevation multiplier — twilight | elevDeg=-3 | returns 0.5 | [ ] |
| P2-T10 | Elevation multiplier — daylight | elevDeg=30 | returns 1.0 | [ ] |
| P2-T11 | POI scan radius | Plane at (0,0), POI at distance 300 km | POI NOT in results (exceeds POI_RADIUS_KM=250) | [ ] |
| P2-T12 | POI scan returns max 5 | 10 POIs all within 250 km | Returns exactly 5 POIResults | [ ] |
| P2-T13 | Enriched waypoint has solar fields | Any valid waypoint after enrichment | solarAzimuthDeg in [0,360), solarElevDeg in [-90,90] | [ ] |
| P2-T14 | Polar night edge case | Location in Arctic in December (no sunrise) | isHorizonEvent = null for all waypoints, no crash | [ ] |

**Phase 2 complete when:** All 14 test cases pass AND user approves.

---

---

## PHASE 3 — Layer 3: Seat Recommendation Engine

**File:** `src/lib/recommend.ts`
**Goal:** Consume fully enriched `WaypointData[]` and return a `SeatVerdict` — which side wins, confidence level, and per-side event lists. Pure functions. Zero React imports.

**Input received from:** Phase 2 output (enriched `WaypointData[]`) + `UserPreferences`
**Output passed to:** Layer 4a (MapView), Layer 4b (LLM narrative), Layer 5 (ResultScreen)

---

### Phase 3 — Steps

#### 3.1 — Present data shapes to user and get approval
- [ ] Show `UserPreferences` input with weights
- [ ] Show `ScoredEvent` interface
- [ ] Show `SeatVerdict` output interface
- [ ] Show the scoring formula
- [ ] STOP — wait for user approval

#### 3.2 — Implement `getRelativeBearing(targetAzimuthDeg, planeHeadingDeg): number`
- [ ] Formula: `(targetAzimuthDeg - planeHeadingDeg + 360) % 360`
- [ ] Result is in [0, 360)
- [ ] 0° = directly ahead, 90° = directly right, 180° = directly behind, 270° = directly left

#### 3.3 — Implement `getSide(relativeBearing): 'left' | 'right'`
- [ ] [0, 180) = `'right'` (starboard, seats J/K/L)
- [ ] [180, 360) = `'left'` (port, seats A/B/C)
- [ ] Exactly 0° or 180° (ahead/behind): assign to right (arbitrary, document this)

#### 3.4 — Implement `getWeatherFactor(isOvercast: boolean): number`
- [ ] `isOvercast = true` → return `WEATHER_OVERCAST_FACTOR` (0.2)
- [ ] `isOvercast = false` → return `WEATHER_CLEAR_FACTOR` (1.0)

#### 3.5 — Implement `scoreSolarEvent(waypoint, prefs, side): ScoredEvent | null`
- [ ] Only score if `waypoint.isHorizonEvent` is not null
- [ ] Get `relativeBearing` of sun to plane
- [ ] Get `side` of sun
- [ ] Get `elevMult = getElevationMultiplier(waypoint.solarElevDeg)` — import from solar.ts
- [ ] Get `weatherFactor = getWeatherFactor(prefs.isOvercast)`
- [ ] Get `weight = prefs.weights[waypoint.isHorizonEvent]` (sunrise or sunset weight)
- [ ] `score = weight * elevMult * weatherFactor`
- [ ] If `score = 0` → return `null` (no contribution)
- [ ] Return `ScoredEvent { type, name, side, timeMinFromDeparture, solarElevDeg, score }`

#### 3.6 — Implement `scorePOIEvent(poi, waypoint, prefs): ScoredEvent | null`
- [ ] Get `relativeBearing` of POI from plane
- [ ] Get `side`
- [ ] `score = prefs.weights.landscape * getWeatherFactor(prefs.isOvercast)`
- [ ] If `score = 0` → return `null`
- [ ] Return `ScoredEvent`

#### 3.7 — Implement `computeVerdict(waypoints, prefs): SeatVerdict`
- [ ] Initialise `leftScore = 0`, `rightScore = 0`, `leftEvents = []`, `rightEvents = []`
- [ ] Iterate all waypoints:
  - [ ] Score solar event at this waypoint (if any) via `scoreSolarEvent`
  - [ ] Score all POIs at this waypoint via `scorePOIEvent`
  - [ ] Accumulate score to correct side
  - [ ] Push event to correct side array
- [ ] Handle `avoidSun` weight: when sun is visible on a side, apply `prefs.weights.avoidSun` (negative) to reduce that side's score
- [ ] Compute `confidence = Math.abs(leftScore - rightScore) / (leftScore + rightScore + 0.001)` (add 0.001 to avoid division by zero)
- [ ] Clamp confidence to [0, 1]
- [ ] If `confidence < LOW_CONFIDENCE_THRESHOLD` → `winner = 'either'`
- [ ] Else: `winner = leftScore > rightScore ? 'left' : 'right'`
- [ ] Sort each side's events by `timeMinFromDeparture` ascending
- [ ] Return full `SeatVerdict`

#### 3.8 — Write unit tests in `__tests__/recommend.test.ts`
- [ ] Use hardcoded mock WaypointData arrays — no real geodesic or solar calls
- [ ] Cover all test cases below

---

### Phase 3 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P3-T1 | Relative bearing — right | targetAzimuth=90°, planeHeading=0° | relativeBearing=90°, side='right' | [ ] |
| P3-T2 | Relative bearing — left | targetAzimuth=270°, planeHeading=0° | relativeBearing=270°, side='left' | [ ] |
| P3-T3 | Relative bearing — behind | targetAzimuth=180°, planeHeading=0° | relativeBearing=180°, side='left' | [ ] |
| P3-T4 | Sun on right, right score wins | Mock 10 waypoints with sun consistently at relBearing=45° | winner='right', confidence > 0.5 | [ ] |
| P3-T5 | Overcast reduces score 80% | Same route, weather toggled overcast | rightScore = 0.2 × clear_rightScore ± 1% | [ ] |
| P3-T6 | Negative avoidSun flips result | Sun always on right, avoidSun weight=-2 | winner='left' (avoiding sun side wins) | [ ] |
| P3-T7 | Low confidence → 'either' | Sun directly ahead (relBearing≈0°) and behind alternating | confidence < 0.1, winner='either' | [ ] |
| P3-T8 | Suppressed elevation scores zero | Horizon event with elevDeg=-15 | score=0, event NOT in either side array | [ ] |
| P3-T9 | Events sorted by time | Sunset at t=120min, Sunrise at t=45min on same side | leftEvents[0].timeMinFromDeparture=45, [1]=120 | [ ] |
| P3-T10 | Zero scores — edge case | prefs.weights all 0, no overcast | leftScore=0, rightScore=0, winner='either', no crash | [ ] |
| P3-T11 | flightDurationMin accuracy | 112 waypoints, 50km step, 900 km/h cruise | flightDurationMin ≈ 369 min ± 5 min | [ ] |
| P3-T12 | POI on left side scored correctly | POI bearing 240° relative to plane heading | POI appears in leftEvents, score > 0 | [ ] |

**Phase 3 complete when:** All 12 test cases pass AND user approves.

---

---

## PHASE 4 — Layer 1: UI / Input Form

**File:** `src/components/InputForm.tsx`
**Goal:** Collect origin airport, destination airport, departure datetime, and user preferences. Produce a validated `FlightInput` object and call `onSubmit`. No math or business logic inside this component.

**Input received from:** User interaction (browser)
**Output passed to:** Parent `page.tsx` via `onSubmit(flightInput: FlightInput)` callback

---

### Phase 4 — Steps

#### 4.1 — Present FlightInput contract to user and get approval
- [ ] Show `FlightInput` interface
- [ ] Show `AirportRecord` interface
- [ ] Show `UserPreferences` interface with weight ranges
- [ ] Show component props interface: `{ onSubmit: (input: FlightInput) => void }`
- [ ] STOP — wait for user approval

#### 4.2 — Airport autocomplete component
- [ ] Import `airports.json` statically (not via fetch)
- [ ] On 3+ characters typed: filter airports by IATA code, name, or city (case-insensitive)
- [ ] Show dropdown with max 8 results: `{IATA} — {Airport Name}, {City}`
- [ ] On selection: store full `AirportRecord` in component state
- [ ] On clear/backspace below 3 chars: reset selected airport to null
- [ ] Keyboard navigable: arrow keys move through dropdown, Enter selects, Escape closes
- [ ] ARIA: `role="combobox"`, `aria-expanded`, `aria-activedescendant`
- [ ] Render two instances: one for origin, one for destination

#### 4.3 — Departure datetime picker
- [ ] HTML `<input type="datetime-local">` — no custom date library
- [ ] Label: "Departure (local time at {origin.city})"
- [ ] On change: convert local time + `origin.utcOffsetMin` to UTC ISO 8601 string
  - [ ] `departureUTC = new Date(localTimeMs - utcOffsetMin * 60000).toISOString()`
- [ ] Store `departureUTC` in state

#### 4.4 — Preferences panel
- [ ] Sunrise toggle (checkbox) + weight slider (range: -2 to 3, step 0.5)
- [ ] Sunset toggle (checkbox) + weight slider
- [ ] Landscape/POI toggle (checkbox) + weight slider
- [ ] Avoid sun toggle (checkbox) — when checked, sets `avoidSun` weight to -2
- [ ] Weather toggle: two buttons "Clear" / "Overcast" — sets `isOvercast` boolean
- [ ] Default state: all toggles on, all weights at 2, weather Clear

#### 4.5 — Validation (client-side, no network)
- [ ] Both airports must be selected from the dropdown (not free text)
- [ ] Origin ≠ destination (compare IATA codes)
- [ ] Departure datetime must be set
- [ ] Departure must be at least 1 hour in the future from `Date.now()`
- [ ] At least one preference toggle must be enabled
- [ ] Show inline error messages per field (not a global alert)
- [ ] Disable submit button until all validations pass

#### 4.6 — Submit handler
- [ ] Assemble `FlightInput` object from all state
- [ ] Call `props.onSubmit(flightInput)`
- [ ] Show loading spinner after submit (disable form while computing)

#### 4.7 — Present styled UI to user before finalising
- [ ] Show a screenshot description or rendered Tailwind layout
- [ ] Wait for user to approve the visual design before marking done

---

### Phase 4 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P4-T1 | Autocomplete filters correctly | Type "JFK" | Dropdown shows John F. Kennedy International as first result | [ ] |
| P4-T2 | Autocomplete — city search | Type "London" | Shows Heathrow and Gatwick in dropdown | [ ] |
| P4-T3 | Autocomplete — min chars | Type "JF" (2 chars) | Dropdown does NOT appear | [ ] |
| P4-T4 | UTC conversion | Origin UTC offset = -300 min (EST), local time 08:00 | departureUTC = "...T13:00:00Z" | [ ] |
| P4-T5 | Same airport validation | Select JFK for both origin and destination | Inline error: "Origin and destination must be different" | [ ] |
| P4-T6 | Past departure validation | Set departure to yesterday | Inline error: "Departure must be at least 1 hour from now" | [ ] |
| P4-T7 | Submit disabled without airport | Open form, do not select airports | Submit button is disabled | [ ] |
| P4-T8 | Valid form produces correct FlightInput | Fill all fields correctly, submit | onSubmit called with FlightInput matching all field values | [ ] |
| P4-T9 | Overcast toggle changes isOvercast | Click "Overcast" button | FlightInput.preferences.isOvercast = true | [ ] |
| P4-T10 | Weight slider value in FlightInput | Set sunrise slider to 3 | FlightInput.preferences.weights.sunrise = 3 | [ ] |

**Phase 4 complete when:** All 10 test cases pass AND user approves the visual UI.

---

---

## PHASE 5 — Layer 4A: Map Visualization

**File:** `src/components/MapView.tsx`
**Goal:** Interactive Leaflet map rendering the great-circle route, day/night terminator, animated plane icon, moving sun marker, horizon event markers, and a time slider. Always dynamically imported with `ssr: false`.

**Input received from:** Parent via props: `waypoints: WaypointData[]`, `verdict: SeatVerdict`, `currentTime: number`
**Output passed to:** Parent via callbacks: `onEventClick(event: ScoredEvent)`, `onTimeChange(minutes: number)`

---

### Phase 5 — Steps

#### 5.1 — Present component props interface to user and get approval
- [ ] Show `MapViewProps` interface
- [ ] Show `TimeSliderProps` sub-component interface
- [ ] Confirm dynamic import pattern in parent
- [ ] STOP — wait for user approval

#### 5.2 — Set up Leaflet in Next.js correctly
- [ ] `'use client'` directive at top of file
- [ ] Import `leaflet/dist/leaflet.css` inside the component file
- [ ] Fix broken default icon on webpack build:
  ```typescript
  import L from 'leaflet';
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({ iconUrl: '...cdn...', iconRetinaUrl: '...cdn...', shadowUrl: '...cdn...' });
  ```
- [ ] In parent: `const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })`
- [ ] Test: `npx next build` produces zero SSR errors

#### 5.3 — Render base map
- [ ] `MapContainer` with center at route midpoint, zoom 3
- [ ] `TileLayer` with OpenStreetMap URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- [ ] Attribution string for OSM

#### 5.4 — Render great-circle polyline
- [ ] Extract `[lat, lon]` pairs from `waypoints`
- [ ] Render as `Polyline` component
- [ ] Color: winner side segments in accent color, other segments in muted color
- [ ] Handle antimeridian: split polyline at ±180° if a lon jump > 180° is detected

#### 5.5 — Render day/night terminator
- [ ] Compute terminator polygon at `currentTime` minutes from departure
- [ ] Use `SunCalc.getTimes()` sampled at 1° longitude intervals to find the terminator latitude
- [ ] Render as Leaflet `Polygon` with semi-transparent dark fill (rgba(0,0,0,0.35))
- [ ] Throttle recomputation to max once per second (use `useMemo` or debounce)

#### 5.6 — Render animated sun marker
- [ ] Compute sub-solar point at `currentTime` using `getSubSolarPoint(utcTimeAtCurrentSlider)`
- [ ] Render as `Marker` with custom SVG sun icon (yellow circle, 24px)
- [ ] Update position reactively when `currentTime` changes

#### 5.7 — Render horizon event markers
- [ ] Filter `waypoints` for those with `isHorizonEvent !== null`
- [ ] Render each as `CircleMarker`:
  - Sunrise: yellow fill, 8px radius
  - Sunset: orange fill, 8px radius
- [ ] Add `Tooltip` showing event name and time
- [ ] On click: call `onEventClick(event)` callback

#### 5.8 — Render animated plane icon
- [ ] Find current waypoint index by: `Math.floor(currentTime / (flightDurationMin / totalWaypoints))`
- [ ] Interpolate position between current and next waypoint
- [ ] Render as `Marker` with a custom plane SVG icon
- [ ] Rotate icon to current `bearingDeg` using CSS transform on the icon element

#### 5.9 — Time slider sub-component
- [ ] `<input type="range" min={0} max={flightDurationMin} step={1} value={currentTime} />`
- [ ] Display current time as `HH:MM` from departure
- [ ] Play button: use `setInterval` at 100ms, increment `currentTime` by 1 each tick
- [ ] Pause button: clear the interval
- [ ] Stop/reset button: set `currentTime = 0`
- [ ] When slider reaches `flightDurationMin`, auto-pause

#### 5.10 — Test with fixture data
- [ ] Create `tmp/map-fixture.json` with hardcoded JFK→LHR route (10 waypoints, mock solar data)
- [ ] Render `MapView` with fixture data
- [ ] Visually confirm: route line visible, plane icon present, sun marker visible, slider works

---

### Phase 5 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P5-T1 | No SSR error | `npx next build` | Zero errors related to Leaflet or window | [ ] |
| P5-T2 | Map renders on client | Navigate to page with MapView | Map tiles load, no console errors | [ ] |
| P5-T3 | Waypoint count on polyline | 112 waypoints array | Polyline has 112 coordinate pairs | [ ] |
| P5-T4 | Plane moves with slider | Drag slider from 0 to max | Plane icon moves along route from origin to destination | [ ] |
| P5-T5 | Plane icon rotates | Slider at waypoint where bearing=90° | Plane icon points east | [ ] |
| P5-T6 | Sunrise marker appears | Waypoints with 1 sunrise event | One yellow CircleMarker on map at sunrise waypoint lat/lon | [ ] |
| P5-T7 | Terminator updates | Move slider by 60 minutes | Terminator polygon visibly shifts | [ ] |
| P5-T8 | Sun marker moves | Move slider by 60 minutes | Sun marker position changes | [ ] |
| P5-T9 | Play button animates | Click Play | Slider auto-advances, plane moves | [ ] |
| P5-T10 | Antimeridian route renders | LAX→NRT fixture | Polyline does not draw a horizontal line across entire map | [ ] |

**Phase 5 complete when:** All 10 test cases pass AND user approves the visual map.

---

---

## PHASE 6 — Layer 4B: LLM Narrative

**Files:** `src/app/api/narrative/route.ts` + `src/components/NarrativeCard.tsx`
**Goal:** Server-side streaming endpoint receives `SeatVerdict`, calls Anthropic API, streams a friendly paragraph back. Client component renders it token by token.

**Input received from:** Client `NarrativeCard` → POST to `/api/narrative` with `SeatVerdict`
**Output passed to:** `NarrativeCard` renders streaming text into `ResultScreen`

---

### Phase 6 — Steps

#### 6.1 — Present request/response contract to user and get approval
- [ ] Show request body shape: `{ verdict: SeatVerdict }`
- [ ] Show response: `ReadableStream<string>` (plain text, streamed)
- [ ] Show `NarrativeCardProps`: `{ verdict: SeatVerdict }`
- [ ] STOP — wait for user approval

#### 6.2 — Test Anthropic API connection in isolation
- [ ] Create `tmp/test-anthropic-connection.ts`
- [ ] Import `@anthropic-ai/sdk`, read `ANTHROPIC_API_KEY` from env
- [ ] Make a minimal `messages.create` call with model `claude-sonnet-4-20250514`, max_tokens 100
- [ ] Print the response text to console
- [ ] Run: `npx ts-node tmp/test-anthropic-connection.ts`
- [ ] Confirm: response prints, no auth error, no network error
- [ ] Log result in `docs/findings.md`
- [ ] Only proceed to 6.3 after this passes

#### 6.3 — Implement `POST /api/narrative/route.ts`
- [ ] Parse request body: `const { verdict } = await req.json()`
- [ ] Validate: `verdict` must be a valid `SeatVerdict` object (check required fields)
- [ ] Return 400 if invalid
- [ ] Build system prompt:
  ```
  You are a friendly and concise flight experience guide. Given structured data about
  which side of the plane has the best views, write exactly one paragraph (max 80 words)
  in a warm, helpful tone. Mention the winning seat side, specific seat letters,
  key events by name and time from departure, and one specific landmark if present.
  Do not mention scores or confidence numbers.
  ```
- [ ] Build user message: serialise `SeatVerdict` into readable prose summary (not raw JSON)
  - Example: "Flight analysis: Right side wins (J/K/L seats). Events: Sunrise at 45 minutes, Alps visible at 90 minutes."
- [ ] Call `anthropic.messages.stream({ model: 'claude-sonnet-4-20250514', max_tokens: 200, messages: [...] })`
- [ ] Wrap stream in `ReadableStream`:
  ```typescript
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    }
  });
  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  ```
- [ ] Handle error: if Anthropic call fails, return 500 with error message

#### 6.4 — Implement `NarrativeCard.tsx`
- [ ] `'use client'` directive
- [ ] Props: `{ verdict: SeatVerdict }`
- [ ] On mount: `fetch('/api/narrative', { method: 'POST', body: JSON.stringify({ verdict }) })`
- [ ] Read response body as `ReadableStream` using `response.body.getReader()`
- [ ] On each chunk: decode with `TextDecoder`, append to `text` state
- [ ] Show skeleton (3 pulsing gray bars, staggered widths) while loading
- [ ] Fade skeleton out, fade text in using Framer Motion when first chunk arrives
- [ ] Fallback: if fetch fails, show template string:
  - `"Based on your flight, the [winner] side offers the best views. Look for [topEvent] around [time] minutes after departure."`
- [ ] Add retry button on error

---

### Phase 6 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P6-T1 | API key works | Run tmp/test-anthropic-connection.ts | Response text prints, exit code 0 | [ ] |
| P6-T2 | Route returns 200 | POST /api/narrative with valid SeatVerdict | HTTP 200, Content-Type: text/plain | [ ] |
| P6-T3 | Route returns 400 on bad input | POST /api/narrative with `{}` body | HTTP 400, error message in body | [ ] |
| P6-T4 | Streaming works | POST valid SeatVerdict, read stream | Tokens arrive incrementally (not all at once) | [ ] |
| P6-T5 | NarrativeCard shows skeleton | Render NarrativeCard before fetch resolves | Skeleton bars visible during loading | [ ] |
| P6-T6 | NarrativeCard shows text | Render NarrativeCard after fetch resolves | Streaming text appears, skeleton gone | [ ] |
| P6-T7 | Fallback on error | Mock fetch to fail, render NarrativeCard | Fallback template text shown, retry button visible | [ ] |
| P6-T8 | ANTHROPIC_API_KEY not in client bundle | `npx next build`, inspect client JS | String "ANTHROPIC_API_KEY" does NOT appear in any client chunk | [ ] |

**Phase 6 complete when:** All 8 test cases pass AND user approves the streaming behavior.

---

---

## PHASE 7 — Layer 5: Result UI

**Files:** `src/components/ResultScreen.tsx`, `SeatBadge.tsx`, `EventList.tsx`, `WindowMockup.tsx`
**Goal:** Assemble the final result page. Pure presentation — no math, no API calls, no business logic. All data arrives via props from `SeatVerdict`.

**Input received from:** Parent `page.tsx` passing `SeatVerdict` after computation
**Output:** Final rendered result visible to the user

---

### Phase 7 — Steps

#### 7.1 — Present component hierarchy and layout to user and get approval
- [ ] Describe layout: top → SeatBadge, then Dual EventLists side by side, then WindowMockup, then NarrativeCard, then MapView
- [ ] Show `ResultScreenProps`: `{ verdict: SeatVerdict, waypoints: WaypointData[], flightInput: FlightInput }`
- [ ] STOP — wait for user approval

#### 7.2 — Implement `SeatBadge.tsx`
- [ ] Display winner side: "RIGHT SIDE" or "LEFT SIDE" or "EITHER SIDE" in large bold text
- [ ] Display seat letters below: "Seats J / K / L" or "Seats A / B / C"
- [ ] Confidence bar: horizontal bar, width = `confidence * 100%`, color coded (green ≥ 0.7, amber 0.4–0.7, gray < 0.4)
- [ ] Confidence label: "Strong recommendation" / "Moderate" / "Either side similar"
- [ ] Framer Motion entrance: `initial={{ scale: 0.8, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}`

#### 7.3 — Implement overhead cabin SVG diagram
- [ ] Simple overhead view of plane fuselage (rectangle with nose cone)
- [ ] Left side seats: A/B/C labeled, highlighted if `winner === 'left'`
- [ ] Right side seats: J/K/L labeled, highlighted if `winner === 'right'`
- [ ] Neutral color for losing side, accent color for winning side
- [ ] Middle seats (D/E/F/G) shown but not highlighted
- [ ] Inline SVG — no external image

#### 7.4 — Implement `EventList.tsx` (used twice — once per side)
- [ ] Props: `{ events: ScoredEvent[], side: 'left' | 'right' }`
- [ ] Panel header: "Left Side (A/B/C)" or "Right Side (J/K/L)"
- [ ] For each event, render a card with:
  - Event type icon (sunrise ☀️, sunset 🌅, landmark ⛰️, city 🌆)
  - Event name
  - Time: "T+ {timeMinFromDeparture} min" formatted as "T+1h 30m"
  - Score bar: visual width proportional to event.score
- [ ] Events sorted by `timeMinFromDeparture` ascending
- [ ] If no events on a side: show "No notable events on this side"
- [ ] Framer Motion staggered children: each card enters with 80ms delay between them

#### 7.5 — Implement `WindowMockup.tsx`
- [ ] Props: `{ event: ScoredEvent }`
- [ ] Render a CSS-only "window frame" (rounded rectangle with inner frame lines)
- [ ] Sky gradient keyed to event type:
  - `sunrise`: linear-gradient from deep blue-purple (top) to amber-orange (bottom)
  - `sunset`: linear-gradient from coral-red to purple-indigo
  - `landmark`: linear-gradient from sky blue to lighter blue
  - `city` (night): radial gradient of dark blue with warm dots simulating lights
- [ ] Horizon line: thin white/cream horizontal line at 30% from bottom
- [ ] For `landmark` events: render a simple SVG mountain silhouette above horizon
- [ ] Caption below window: event name + time
- [ ] Show mockup for the highest-scoring event on the winning side

#### 7.6 — Assemble `ResultScreen.tsx`
- [ ] Import and arrange all sub-components
- [ ] Layout order (top to bottom):
  1. Flight recap bar: "JFK → LHR · 6h 12m · Jun 21 2024 08:00 UTC"
  2. `SeatBadge`
  3. Cabin SVG diagram
  4. Two-column `EventList` (left panel + right panel)
  5. `WindowMockup` (top event)
  6. `NarrativeCard`
  7. `MapView` (dynamic import)
- [ ] Framer Motion: `staggerChildren` on the container so each section enters with delay
- [ ] Responsive: stack to single column on mobile (< 768px)

#### 7.7 — Present full styled result to user
- [ ] Show the rendered ResultScreen (or detailed description of layout)
- [ ] Wait for explicit user sign-off before marking done

---

### Phase 7 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P7-T1 | SeatBadge renders winner | verdict.winner='right' | "RIGHT SIDE · Seats J / K / L" visible | [ ] |
| P7-T2 | SeatBadge renders 'either' | verdict.winner='either' | "EITHER SIDE" visible, no seat letters highlighted | [ ] |
| P7-T3 | Confidence bar width | verdict.confidence=0.75 | Bar visually at 75% width | [ ] |
| P7-T4 | EventList sorts by time | Events at t=120, t=45, t=80 | Rendered order: 45, 80, 120 | [ ] |
| P7-T5 | EventList empty state | verdict.leftEvents=[] | "No notable events on this side" shown in left panel | [ ] |
| P7-T6 | WindowMockup sunrise gradient | event.type='sunrise' | Amber/orange gradient visible in window | [ ] |
| P7-T7 | WindowMockup landmark silhouette | event.type='landmark' | Mountain SVG silhouette visible | [ ] |
| P7-T8 | Stagger animation | Render ResultScreen | Sections enter sequentially with visible delay between each | [ ] |
| P7-T9 | Mobile responsive | Viewport 375px wide | Layout stacks to single column, no horizontal overflow | [ ] |
| P7-T10 | Full page renders without errors | Valid SeatVerdict + waypoints passed | Zero console errors, all sections visible | [ ] |
| P7-T11 | MapView loads dynamically | Navigate to result page | Map renders (no SSR error), tiles visible | [ ] |
| P7-T12 | Flight recap shows correct data | JFK→LHR, 6h 12m | Recap bar shows "JFK → LHR · 6h 12m" | [ ] |

**Phase 7 complete when:** All 12 test cases pass AND user approves the visual result screen.

---

---

## PHASE 8 — Integration & End-to-End

**Goal:** Wire all layers together in `app/page.tsx`. Full round-trip from form submit → geodesic → solar → recommendation → display. Verify the complete flow works with real data.

---

### Phase 8 — Steps

#### 8.1 — Wire layers in `app/page.tsx`
- [ ] State: `flightInput`, `waypoints`, `verdict`, `isLoading`, `error`
- [ ] On `InputForm` submit:
  1. Set `isLoading = true`
  2. Call `greatCircleWaypoints(flightInput)` → raw waypoints
  3. Call `enrichWaypointsWithSolar(rawWaypoints, flightInput.preferences)` → enriched
  4. Call `computeVerdict(enriched, flightInput.preferences)` → verdict
  5. Set all state, `isLoading = false`
- [ ] Show `InputForm` when no verdict
- [ ] Show loading skeleton when `isLoading = true`
- [ ] Show `ResultScreen` when verdict is ready
- [ ] Show error state if any step throws

#### 8.2 — End-to-end test with real airports
- [ ] Test route 1: JFK → LHR, departure 2024-06-21 08:00 UTC (morning westbound, sunrise expected on right)
- [ ] Test route 2: LHR → JFK, departure 2024-06-21 12:00 UTC (afternoon eastbound)
- [ ] Test route 3: SYD → LAX, departure 2024-12-21 22:00 UTC (transpacific, antimeridian crossing)
- [ ] Test route 4: DEL → DXB, departure 2024-06-21 06:00 UTC (short route, single horizon event possible)
- [ ] Confirm each produces a plausible winner and no console errors

#### 8.3 — Performance check
- [ ] Measure time from form submit to result display for a 6h flight (≈120 waypoints)
- [ ] Target: < 500ms total computation (geodesic + solar + recommend combined)
- [ ] If > 500ms: profile and identify bottleneck — ask user before optimising

#### 8.4 — Final checks
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx next build` — zero errors, zero warnings
- [ ] `npx jest` — all tests pass
- [ ] `.env.local` not in git (`git status` clean)
- [ ] `ANTHROPIC_API_KEY` not in any client JS bundle
- [ ] `docs/schema.md` matches all runtime types exactly

---

### Phase 8 — Test Cases

| ID | Description | Input | Expected Result | Pass |
|----|-------------|-------|-----------------|------|
| P8-T1 | JFK→LHR produces verdict | Valid form submit | SeatVerdict with winner, events, confidence | [ ] |
| P8-T2 | Result renders from real data | JFK→LHR verdict | ResultScreen visible with no errors | [ ] |
| P8-T3 | Streaming narrative loads | JFK→LHR result | NarrativeCard shows text after ~2s | [ ] |
| P8-T4 | Transpacific route works | SYD→LAX | No map rendering bug, verdict produced | [ ] |
| P8-T5 | Computation time | JFK→LHR (~112 waypoints) | Total compute < 500ms (measured in console) | [ ] |
| P8-T6 | Type safety end to end | `npx tsc --noEmit` | Zero errors | [ ] |
| P8-T7 | Production build | `npx next build` | Zero errors, no missing env warnings | [ ] |
| P8-T8 | All unit tests pass | `npx jest` | All test suites pass, zero failures | [ ] |

**Phase 8 complete when:** All 8 test cases pass AND user gives final visual sign-off.

---

---

## GLOBAL COMPLETION CHECKLIST

- [ ] Phase 0 — Scaffold complete and user-approved
- [ ] Phase 1 — Geodesic engine complete, 10/10 tests pass
- [ ] Phase 2 — Astronomy engine complete, 14/14 tests pass
- [ ] Phase 3 — Recommendation logic complete, 12/12 tests pass
- [ ] Phase 4 — Input form complete, 10/10 tests pass
- [ ] Phase 5 — Map visualization complete, 10/10 tests pass
- [ ] Phase 6 — LLM narrative complete, 8/8 tests pass
- [ ] Phase 7 — Result UI complete, 12/12 tests pass
- [ ] Phase 8 — Integration complete, 8/8 tests pass
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx next build` — zero errors
- [ ] `npx jest` — all 84 test cases passing
- [ ] `.env.local` confirmed not in git
- [ ] `ANTHROPIC_API_KEY` confirmed absent from client bundle
- [ ] `docs/schema.md` confirmed up to date
- [ ] User has given final sign-off on visual output

**Total test cases: 84**
**Total phases: 8**

---

*Last updated: initialised. Update after every session.*
