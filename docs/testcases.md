# Test Cases — AeroView

> All test cases grouped by phase. Minimum 5 per layer.
> Mark [x] only after the test actually passes.

---

## Phase 0 — Scaffold & Foundation

### TC-P0-T1: Dev server starts
- **Input:** `npm run dev`
- **Expected:** Server running on port 3000, zero console errors
- **Status:** [x] passing — HTTP 200 on port 3000 (2026-04-12)

### TC-P0-T2: TypeScript compiles
- **Input:** `npx tsc --noEmit`
- **Expected:** Exit code 0, zero errors
- **Status:** [x] passing — zero errors after adding src/types/globals.d.ts CSS declaration (2026-04-12)

### TC-P0-T3: Production build
- **Input:** `npm run build`
- **Expected:** Build completes, zero errors
- **Status:** [x] passing — ✓ Compiled successfully, 4 static pages generated. ESLint circular-ref warning logged in error.md (non-fatal) (2026-04-12)

### TC-P0-T4: .env.local is gitignored
- **Input:** `git status` after creating .env.local
- **Expected:** File does NOT appear in git status
- **Status:** [x] passing — .env.local and *.log confirmed in .gitignore (2026-04-12)

### TC-P0-T5: airports.json is valid
- **Input:** `JSON.parse(fs.readFileSync('src/data/airports.json'))`
- **Expected:** Parses without error, array length > 1000
- **Status:** [x] passing — 1150 entries, all required fields present (2026-04-12)

### TC-P0-T6: pois.json is valid
- **Input:** `JSON.parse(fs.readFileSync('src/data/pois.json'))`
- **Expected:** Parses without error, array length > 100
- **Status:** [x] passing — 156 entries, all required fields present (2026-04-12)

### TC-P0-T7: Constants file imports correctly
- **Input:** `import { CRUISE_SPEED_KMH } from '@/lib/constants'`
- **Expected:** Value equals 900, no type errors
- **Status:** [x] passing — all 9 constants present, tsc --noEmit zero errors (2026-04-12)

### TC-P0-T8: tmp/ is gitignored
- **Input:** Create a file in tmp/, run `git status`
- **Expected:** File does NOT appear in git status
- **Status:** [x] passing — /tmp/ confirmed in .gitignore (2026-04-12)

---

## Phase 1 — Geodesic Engine

### TC-P1-T1: JFK to LHR distance
- **Input:** lat1=40.6413, lon1=-73.7781, lat2=51.4775, lon2=-0.4614
- **Expected:** 5539 km ± 50 km
- **Status:** [x] passing — haversineKm returns 5539 km (2026-04-12)

### TC-P1-T2: Waypoint count
- **Input:** JFK→LHR, WAYPOINT_STEP_KM=50
- **Expected:** ceil(5539/50) + 1 = 112 waypoints
- **Status:** [x] passing — greatCircleWaypoints returns correct count (2026-04-12)

### TC-P1-T3: First and last waypoints
- **Input:** Any route
- **Expected:** First = origin coords ±0.0001°, Last = destination coords ±0.0001°
- **Status:** [x] passing — exact endpoints assigned, no floating-point drift (2026-04-12)

### TC-P1-T4: All bearings in range
- **Input:** Any route
- **Expected:** Every waypoint bearingDeg in [0, 360)
- **Status:** [x] passing — bearingDeg normalized with (deg+360)%360 (2026-04-12)

### TC-P1-T5: Antimeridian LAX→NRT
- **Input:** lat1=33.9425, lon1=-118.4081, lat2=35.7653, lon2=140.3856
- **Expected:** No consecutive lon diff > 180°, total ≈ 8815 km ± 100 km
- **Status:** [x] passing — antimeridian correction applied, no lon jump > 180° (2026-04-12)

### TC-P1-T6: Bearing north
- **Input:** lat1=0, lon1=0, lat2=10, lon2=0
- **Expected:** bearingDeg ≈ 0° ± 1°
- **Status:** [x] passing (2026-04-12)

### TC-P1-T7: Bearing east
- **Input:** lat1=0, lon1=0, lat2=0, lon2=10
- **Expected:** bearingDeg ≈ 90° ± 1°
- **Status:** [x] passing (2026-04-12)

### TC-P1-T8: Short route (<50km)
- **Input:** Two airports 30 km apart
- **Expected:** Exactly 2 waypoints
- **Status:** [x] passing — ceil(dist/50)=1 segment → 2 waypoints (2026-04-12)

### TC-P1-T9: cumulativeKm progression
- **Input:** Any route
- **Expected:** cumulativeKm[0]=0, increases monotonically, last ≈ totalKm ± 1
- **Status:** [x] passing (2026-04-12)

### TC-P1-T10: utcTime progression
- **Input:** departureUTC = 2024-06-21T08:00:00Z, JFK→LHR
- **Expected:** utcTime[0] = departure, increases ~200s per waypoint, last ≈ departure+6.15h
- **Status:** [x] passing — elapsed ≈ 6.15h confirmed (2026-04-12)

---

## Phase 2 — Astronomy Engine

### TC-P2-T1: Azimuth conversion — south
- **Input:** SunCalc raw azimuth = 0 rad
- **Expected:** toNorthClockwiseDeg(0) = 180°
- **Status:** [x] passing (2026-04-12)

### TC-P2-T2: Azimuth conversion — north
- **Input:** SunCalc raw azimuth = Math.PI rad
- **Expected:** toNorthClockwiseDeg(Math.PI) ≈ 0° or 360°
- **Status:** [x] passing (2026-04-12)

### TC-P2-T3: Azimuth conversion — west
- **Input:** SunCalc raw azimuth = Math.PI/2
- **Expected:** toNorthClockwiseDeg(Math.PI/2) = 270°
- **Status:** [x] passing (2026-04-12)

### TC-P2-T4: Solar noon London
- **Input:** date=2024-06-21T12:00:00Z, lat=51.5, lon=-0.1
- **Expected:** solarElevDeg ≈ 62° ± 2°, solarAzimuthDeg ≈ 180° ± 5°
- **Status:** [x] passing (2026-04-12)

### TC-P2-T5: Horizon event — sunrise detection
- **Input:** prevElevDeg=-1, currElevDeg=+1
- **Expected:** returns 'sunrise'
- **Status:** [x] passing (2026-04-12)

### TC-P2-T6: Horizon event — sunset detection
- **Input:** prevElevDeg=+1, currElevDeg=-1
- **Expected:** returns 'sunset'
- **Status:** [x] passing (2026-04-12)

### TC-P2-T7: No horizon event
- **Input:** prevElevDeg=5, currElevDeg=10
- **Expected:** returns null
- **Status:** [x] passing (2026-04-12)

### TC-P2-T8: Elevation multiplier — suppressed
- **Input:** elevDeg=-10
- **Expected:** returns 0
- **Status:** [x] passing (2026-04-12)

### TC-P2-T9: Elevation multiplier — twilight
- **Input:** elevDeg=-3
- **Expected:** returns 0.5
- **Status:** [x] passing (2026-04-12)

### TC-P2-T10: Elevation multiplier — daylight
- **Input:** elevDeg=30
- **Expected:** returns 1.0
- **Status:** [x] passing (2026-04-12)

### TC-P2-T11: POI scan radius
- **Input:** Plane at (0,0), POI at distance 300 km
- **Expected:** POI NOT in results (exceeds POI_RADIUS_KM=250)
- **Status:** [x] passing (2026-04-12)

### TC-P2-T12: POI scan returns max 5
- **Input:** 10 POIs all within 250 km
- **Expected:** Returns exactly 5 POIResults
- **Status:** [x] passing (2026-04-12)

### TC-P2-T13: Enriched waypoint has solar fields
- **Input:** Any valid waypoint after enrichment
- **Expected:** solarAzimuthDeg in [0,360), solarElevDeg in [-90,90]
- **Status:** [x] passing (2026-04-12)

### TC-P2-T14: Polar night edge case
- **Input:** Location in Arctic in December
- **Expected:** isHorizonEvent = null for all waypoints, no crash
- **Status:** [x] passing — bug fixed: enrichment reads prevElevDeg from enriched array, not original (2026-04-12)

---

## Phase 3 — Recommendation Engine

### TC-P3-T1: sideOfPlane — right
- **Input:** planeBearing=0, objectAzimuth=90 → relativeBearing=90
- **Expected:** 'right'
- **Status:** [x] passing (2026-04-12)

### TC-P3-T2: sideOfPlane — left
- **Input:** planeBearing=0, objectAzimuth=270 → relativeBearing=270
- **Expected:** 'left'
- **Status:** [x] passing (2026-04-12)

### TC-P3-T3: sideOfPlane — dead ahead boundary
- **Input:** planeBearing=90, objectAzimuth=90 → relativeBearing=0
- **Expected:** 'right' (0 is in [0, 180))
- **Status:** [x] passing (2026-04-12)

### TC-P3-T4: scoreSolarEvent — normal sunrise
- **Input:** type='sunrise', elev=5°, clear sky, weight=2
- **Expected:** score = 2.0
- **Status:** [x] passing (2026-04-12)

### TC-P3-T5: scoreSolarEvent — below twilight
- **Input:** type='sunrise', elev=-10° (below TWILIGHT_ELEV_DEG)
- **Expected:** score = 0
- **Status:** [x] passing (2026-04-12)

### TC-P3-T6: scoreSolarEvent — overcast penalty
- **Input:** same as T4 but isOvercast=true
- **Expected:** score = WEATHER_OVERCAST_FACTOR × clear score
- **Status:** [x] passing (2026-04-12)

### TC-P3-T7: scoreLandmark — closer scores higher
- **Input:** distanceKm=50 vs distanceKm=200
- **Expected:** score(50) > score(200)
- **Status:** [x] passing (2026-04-12)

### TC-P3-T8: scoreLandmark — zero landscape weight
- **Input:** preferences.weights.landscape=0
- **Expected:** score = 0
- **Status:** [x] passing (2026-04-12)

### TC-P3-T9: computeVerdict — all events on left
- **Input:** single waypoint, sunrise on left side
- **Expected:** winner='left', leftScore > rightScore
- **Status:** [x] passing (2026-04-12)

### TC-P3-T10: computeVerdict — balanced → either
- **Input:** one sunrise on left, one on right, equal weights
- **Expected:** winner='either', confidence < LOW_CONFIDENCE_THRESHOLD
- **Status:** [x] passing (2026-04-12)

### TC-P3-T11: computeVerdict — avoidSun penalises sun side
- **Input:** avoidSun=3, sun on left, no other events
- **Expected:** winner='right' (left penalised)
- **Status:** [x] passing (2026-04-12)

### TC-P3-T12: computeVerdict — flightDurationMin
- **Input:** first utcTime=08:00Z, last utcTime=09:30Z
- **Expected:** flightDurationMin = 90
- **Status:** [x] passing (2026-04-12)

---

## Phase 4 — Input Form

### TC-P4-T1: Renders without crash
- **Input:** `<InputForm airports={AIRPORTS} onSubmit={noop} />`
- **Expected:** Origin, Destination, Departure date inputs present in DOM
- **Status:** [x] passing (2026-04-12)

### TC-P4-T2: Autocomplete hidden below min chars
- **Input:** Type 2 chars in origin input
- **Expected:** No listbox rendered
- **Status:** [x] passing (2026-04-12)

### TC-P4-T3: Autocomplete shows matches at 3+ chars
- **Input:** Type "Lon" in origin input
- **Expected:** Listbox visible, LHR entry present
- **Status:** [x] passing (2026-04-12)

### TC-P4-T4: Selecting airport closes dropdown
- **Input:** Type "Lon", click LHR option
- **Expected:** Listbox no longer in DOM
- **Status:** [x] passing (2026-04-12)

### TC-P4-T5: Submit disabled until all required fields set
- **Input:** Fill origin only, then destination, then date
- **Expected:** Button disabled until all three are filled
- **Status:** [x] passing (2026-04-12)

### TC-P4-T6: onSubmit receives correct FlightInput shape
- **Input:** Fill JFK→LHR, date=2024-06-21, submit
- **Expected:** onSubmit called once with origin.iata=JFK, destination.iata=LHR, departureUTC=2024-06-21T00:00:00Z
- **Status:** [x] passing (2026-04-12)

---

## Phase 5 — Map Visualization

### TC-P5-T1: Renders map container without crash
- **Input:** 2 waypoints, JFK→LHR, left verdict
- **Expected:** map-container div in DOM
- **Status:** [x] passing (2026-04-12)

### TC-P5-T2: Origin and destination labels rendered
- **Input:** origin=JFK, destination=LHR
- **Expected:** "JFK" and "LHR" text present in popups
- **Status:** [x] passing (2026-04-12)

### TC-P5-T3: Horizon event markers rendered
- **Input:** waypoints with isHorizonEvent='sunrise' and 'sunset'
- **Expected:** "Sunrise" and "Sunset" tooltip labels in DOM
- **Status:** [x] passing (2026-04-12)

### TC-P5-T4: Verdict badge shows correct winner
- **Input:** verdict.winner='left' / 'either'
- **Expected:** Badge text contains "left" / "either" respectively
- **Status:** [x] passing (2026-04-12)

---

## Phase 6 — LLM Narrative

### TC-P6-T1: 400 for missing required fields
- **Input:** POST body missing verdict, destination, departureUTC
- **Expected:** status 400
- **Status:** [x] passing (2026-04-12)

### TC-P6-T2: 400 for invalid JSON
- **Input:** POST body = "not-json"
- **Expected:** status 400
- **Status:** [x] passing (2026-04-12)

### TC-P6-T3: Calls generateContentStream and streams response
- **Input:** Valid NarrativeRequest body, mocked Gemini yields two chunks
- **Expected:** status 200, Content-Type text/plain, body = concatenated chunks
- **Status:** [x] passing (2026-04-12)

### TC-P6-T4: 500 when GEMINI_API_KEY not set
- **Input:** process.env.GEMINI_API_KEY deleted
- **Expected:** status 500
- **Status:** [x] passing (2026-04-12)

### TC-P6-T5: 500 on Gemini SDK error
- **Input:** generateContentStream throws "Quota exceeded"
- **Expected:** status 500, body contains error message
- **Status:** [x] passing (2026-04-12)

---

## Phase 7 — Result UI

### TC-P7-T1: SeatBadge renders LEFT
- **Input:** winner='left', confidence=0.8
- **Expected:** badge text contains "LEFT"
- **Status:** [x] passing (2026-04-12)

### TC-P7-T2: SeatBadge renders EITHER
- **Input:** winner='either', confidence=0
- **Expected:** badge text contains "EITHER"
- **Status:** [x] passing (2026-04-12)

### TC-P7-T3: EventList renders correct count
- **Input:** 2 events
- **Expected:** 2 event-item elements in DOM
- **Status:** [x] passing (2026-04-12)

### TC-P7-T4: EventList empty state
- **Input:** events=[]
- **Expected:** event-list-empty shown, no event-item elements
- **Status:** [x] passing (2026-04-12)

### TC-P7-T5: ResultScreen renders badge and both lists
- **Input:** LEFT verdict with 1 event per side
- **Expected:** seat-badge present, 2 event-item elements, JFK→LHR header
- **Status:** [x] passing (2026-04-12)

### TC-P7-T6: ResultScreen onReset called on click
- **Input:** click reset button
- **Expected:** onReset called exactly once
- **Status:** [x] passing (2026-04-12)

---

## Phase 8 — Integration
### TC-P8-T1 through TC-P8-T8
*(pending — to be detailed at Phase 8 start)*
- **Status:** [ ] pending

---

## Summary Table

| Phase | Total | Passing | Failing | Pending |
|-------|-------|---------|---------|---------|
| P0    | 8     | 8       | 0       | 0       |
| P1    | 10    | 10      | 0       | 0       |
| P2    | 14    | 14      | 0       | 0       |
| P3    | 12    | 12      | 0       | 0       |
| P4    | 6     | 6       | 0       | 0       |
| P5    | 5     | 5       | 0       | 0       |
| P6    | 5     | 5       | 0       | 0       |
| P7    | 6     | 6       | 0       | 0       |
| P8    | 8     | 0       | 0       | 8       |
| **Total** | **74** | **58** | **0** | **16** |
