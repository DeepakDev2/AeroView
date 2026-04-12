# Task Plan — AeroView

> Master checklist of all project goals, sourced from plan.md.
> Mark [x] only after tests pass AND user approves. Never speculatively.

---

## Legend
- [ ] Not started
- [~] In progress
- [x] Complete (tests passing + user approved)

---

## PHASE 0 — Project Scaffold & Foundation

### 0.1 — Initialise Next.js
- [x] Manual Next.js 15 setup (create-next-app rejected "AeroView" due to capital letters — see error.md)
- [x] src/ directory structure confirmed
- [x] App Router active (src/app/)
- [x] Boilerplate cleared from app/page.tsx and app/globals.css
- [x] Verify `npm run dev` starts with zero errors on port 3000

### 0.2 — Install approved dependencies
- [x] Runtime: suncalc, leaflet, react-leaflet, motion, @anthropic-ai/sdk
- [x] Dev types: @types/leaflet, @types/suncalc, jest, @types/jest, ts-jest
- [x] All packages appear in package.json

### 0.3 — Environment setup
- [x] .env.local created with ANTHROPIC_API_KEY= (empty)
- [x] .env.example updated with ANTHROPIC_API_KEY=your_key_here
- [x] .env.local in .gitignore
- [x] /tmp/ in .gitignore
- [x] *.log added to .gitignore
- [x] Confirm .env.local NOT tracked by git (test P0-T4)

### 0.4 — Folder structure
- [x] src/lib/
- [x] src/components/
- [x] src/data/
- [x] src/types/
- [x] src/app/api/narrative/
- [x] __tests__/
- [x] docs/
- [x] taskInfo/
- [x] tmp/

### 0.5 — Doc files
- [x] docs/task_plan.md
- [x] docs/findings.md (pre-populated with 8 known gotchas)
- [x] docs/progress.md
- [x] docs/error.md
- [x] docs/schema.md (pre-populated with all agreed interfaces)
- [x] docs/testcases.md

### 0.6 — CLAUDE.md
- [x] Project description
- [x] Key commands
- [x] Critical rules summary
- [x] Docs reference
- [x] Layer map

### 0.7 — Constants file
- [x] src/lib/constants.ts with all 9 constants

### 0.8 — Data files
- [x] src/data/airports.json (>1000 airports) — 1150 generated
- [x] src/data/pois.json (>100 POIs) — 156 generated

### 0.9 — Verification
- [x] npx tsc --noEmit — zero errors
- [x] npx next build — zero errors (ESLint circular-ref warning, non-fatal)
- [x] Directory tree matches spec
- [ ] User approves tree

---

## PHASE 1 — Geodesic Engine
### Steps 1.1 – 1.6 (complete)
- [x] 1.1 Present data shapes and get approval
- [x] 1.2 haversineKm
- [x] 1.3 bearingDeg
- [x] 1.4 intermediatePoint
- [x] 1.5 greatCircleWaypoints
- [x] 1.6 Unit tests __tests__/geodesic.test.ts — 10/10 passing (2026-04-12)

## PHASE 2 — Astronomy Engine
### Steps 2.1 – 2.6 (complete)
- [x] 2.1 toNorthClockwiseDeg — SunCalc azimuth conversion
- [x] 2.2 getSolarPosition — SunCalc wrapper
- [x] 2.3 detectHorizonEvent — sunrise/sunset detection
- [x] 2.4 elevationMultiplier — quality multiplier
- [x] 2.5 scanNearbyPOIs — POI radius scan, sorted, capped
- [x] 2.6 enrichWaypointsWithSolar — main enrichment (loop, not map, to read prev enriched elev)
- [x] Unit tests __tests__/solar.test.ts — 14/14 passing (2026-04-12)

## PHASE 3 — Seat Recommendation Engine
### Steps 3.1 – 3.4 (complete)
- [x] 3.1 sideOfPlane — relative bearing to left/right mapping
- [x] 3.2 scoreSolarEvent — weight × elevationMultiplier × weatherFactor
- [x] 3.3 scoreLandmark — landscape weight × proximity × weatherFactor
- [x] 3.4 computeVerdict — aggregates all waypoints into SeatVerdict
- [x] Unit tests __tests__/recommend.test.ts — 12/12 passing (2026-04-12)

## PHASE 4 — UI / Input Form
### Steps 4.1 – 4.3 (complete)
- [x] 4.1 InputFormProps interface approved
- [x] 4.2 src/components/InputForm.tsx — airport autocomplete, departure UTC, preference sliders, overcast toggle
- [x] 4.3 Unit tests __tests__/InputForm.test.tsx — 6/6 passing (2026-04-12)
- [x] Config: jest.config.ts setupFilesAfterEnv, tsconfig.jest.json jsx=react-jsx, jest.setup.ts

## PHASE 5 — Map Visualization
### Steps 5.1 – 5.3 (complete)
- [x] 5.1 MapViewProps interface approved
- [x] 5.2 src/components/MapView.tsx — coloured polyline, origin/dest markers, horizon event markers, POI markers, verdict badge overlay
- [x] 5.3 Unit tests __tests__/MapView.test.tsx — 5/5 passing with mocked react-leaflet (2026-04-12)

## PHASE 6 — LLM Narrative
### Steps 6.1 – 6.4 (complete)
- [x] 6.1 Migrated from Anthropic to Gemini (gemini-2.5-flash) — Anthropic credits unavailable
- [x] 6.2 Rule 4 pre-integration test — tmp/test-gemini.ts confirmed working
- [x] 6.3 src/app/api/narrative/route.ts — POST handler, streaming ReadableStream, validation, error handling
- [x] 6.4 src/components/NarrativeCard.tsx — streaming fetch, loading/streaming/done/error states
- [x] Unit tests __tests__/narrative.test.ts — 5/5 passing (2026-04-12)
- [x] .env.example updated with GEMINI_API_KEY

## PHASE 7 — Result UI
### Steps 7.1 – 7.5 (complete)
- [x] 7.1 SeatBadge.tsx — winner badge, confidence bar, score comparison
- [x] 7.2 EventList.tsx — per-side event rows with icon, timing, score bar, empty state
- [x] 7.3 WindowMockup.tsx — CSS oval window, top event inside, highlighted/greyed by winner
- [x] 7.4 ResultScreen.tsx — Layer 5 assembly of all components, dynamic MapView (ssr:false)
- [x] 7.5 Unit tests __tests__/ResultScreen.test.tsx — 6/6 passing (2026-04-12)

## PHASE 8 — Integration & End-to-End
### Steps 8.1 – 8.4 (not started)

---

## Global Completion Checklist
- [ ] Phase 0 complete and user-approved
- [x] Phase 1 — 10/10 tests pass
- [x] Phase 2 — 14/14 tests pass
- [x] Phase 3 — 12/12 tests pass
- [x] Phase 4 — 6/6 tests pass
- [x] Phase 5 — 5/5 tests pass
- [x] Phase 6 — 5/5 tests pass
- [x] Phase 7 — 6/6 tests pass
- [ ] Phase 8 — 8/8 tests pass
- [ ] npx tsc --noEmit zero errors
- [ ] npx next build zero errors
- [ ] npx jest — all 84 test cases passing
- [ ] .env.local confirmed not in git
- [ ] ANTHROPIC_API_KEY absent from client bundle
- [ ] docs/schema.md confirmed up to date
- [ ] User final sign-off
