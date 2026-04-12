# Task 01 — Geodesic Engine

## Goal
Pure TypeScript functions that generate a great-circle route between two airports, sampled every 50 km, with bearing and timing at each waypoint. Zero external geodesy libraries. Zero React imports.

## File
`src/lib/geodesic.ts`

## Input / Output Contract
- **Input:** Two `AirportRecord` objects (origin + destination) + `departureUTC: string`
- **Output:** `WaypointData[]` — array of sampled points along the great-circle route

## Implementation Steps
- [ ] 1.1 Present data shapes, get user approval
- [ ] 1.2 Implement `haversineKm`
- [ ] 1.3 Implement `bearingDeg`
- [ ] 1.4 Implement `intermediatePoint`
- [ ] 1.5 Implement `greatCircleWaypoints`
- [ ] 1.6 Write unit tests `__tests__/geodesic.test.ts`

## Known Risks
- Antimeridian crossing: lon jumps > 180° must be corrected
- SLERP (not lerp) required for true great-circle intermediate points
- Last waypoint must be exactly destination coords

## Definition of Done
All 10 test cases in testcases.md (P1-T1 through P1-T10) pass + user approves
