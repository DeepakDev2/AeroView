# AeroView — CLAUDE.md

## Project Description
AeroView: A Next.js application that analyses a flight route and tells you which side of the plane offers the best views — sunrises, sunsets, mountain ranges, and landmarks — powered by great-circle geodesy, SunCalc solar positioning, and an Anthropic LLM narrative.

---

## Key Commands

```bash
npm run dev        # Start dev server on port 3000
npm run build      # Production build
npm run start      # Start production server
npm run typecheck  # TypeScript check (npx tsc --noEmit)
npm run test       # Run all Jest tests
npm run lint       # ESLint
```

---

## Critical Rules (Rules 1–12)

1. **Never add anything unapproved** — No library, API, tool, or architectural decision without explicit user approval. Ask first.
2. **Approval gate before coding** — Present input/output/payload TypeScript interfaces. STOP. Wait for "approved" before writing implementation.
3. **Present before finalizing** — Show result (UI, terminal output). Get explicit sign-off before marking complete.
4. **Test API connections first** — Write standalone test script in ./tmp/, run it, confirm it works, then integrate.
5. **Secrets only in .env.local** — Never hardcode. Never expose to client. Commit .env.example with placeholders only.
6. **Temp files in ./tmp/** — All logs, debug outputs, test scripts, scraped data go here. This folder is gitignored.
7. **Update docs after every subtask** — Mark task_plan.md [x] only after tests pass. Update progress.md, schema.md, error.md.
8. **Error handling protocol** — Read full stack trace. Find exact file/line. Fix only what the error points to. Log in error.md.
9. **Schema is source of truth** — Update docs/schema.md FIRST when any type changes. Then update code. Re-export from src/types/index.ts.
10. **Never mark done without tests passing** — Code written + all testcases.md cases passing + user approved = done.
11. **Layer purity** — src/lib/ = pure functions only (no React, no side effects). src/components/ = zero math/business logic.
12. **No magic numbers** — Every tunable constant goes in src/lib/constants.ts. No raw numbers inline in logic.

---

## Layer Map

| Layer | Files | Description |
|-------|-------|-------------|
| Layer 1 | src/components/InputForm.tsx | User input form — no logic |
| Layer 2A | src/lib/geodesic.ts | Pure geodesic math — haversine, great circle |
| Layer 2B | src/lib/solar.ts | Pure solar math — SunCalc wrapper, POI scanner |
| Layer 3 | src/lib/recommend.ts | Pure scoring engine — verdict computation |
| Layer 4A | src/components/MapView.tsx | Leaflet map — dynamic import, ssr:false |
| Layer 4B | src/app/api/narrative/route.ts | Anthropic streaming API route (server-only) |
| Layer 5 | src/components/ResultScreen.tsx | Assembly of all result UI components |
| Data | src/data/airports.json, pois.json | Static JSON databases |
| Types | src/types/index.ts | Re-exports all TypeScript interfaces |
| Constants | src/lib/constants.ts | All tunable numbers |

---

## Documentation Reference

| File | Purpose |
|------|---------|
| [docs/task_plan.md](docs/task_plan.md) | Master task checklist — mark [x] after tests pass |
| [docs/findings.md](docs/findings.md) | Research log, library gotchas, design decisions |
| [docs/progress.md](docs/progress.md) | Session log, app flow, libraries, project rules |
| [docs/error.md](docs/error.md) | Error log and change log |
| [docs/schema.md](docs/schema.md) | TypeScript interfaces — source of truth |
| [docs/testcases.md](docs/testcases.md) | All test cases with pass/fail status |

---

## Folder Structure

```
src/
  app/
    page.tsx                  — Root page, wires all layers
    layout.tsx                — Root layout
    globals.css               — Tailwind import
    api/narrative/route.ts    — Anthropic streaming endpoint (Phase 6)
  components/
    InputForm.tsx             — Layer 1 (Phase 4)
    MapView.tsx               — Layer 4A (Phase 5) — dynamic/ssr:false
    NarrativeCard.tsx         — Layer 4B client (Phase 6)
    ResultScreen.tsx          — Layer 5 (Phase 7)
    SeatBadge.tsx             — Phase 7
    EventList.tsx             — Phase 7
    WindowMockup.tsx          — Phase 7
  lib/
    constants.ts              — All magic-number constants
    geodesic.ts               — Layer 2A (Phase 1)
    solar.ts                  — Layer 2B (Phase 2)
    recommend.ts              — Layer 3 (Phase 3)
  types/
    index.ts                  — Re-exports all interfaces
  data/
    airports.json             — ~3000 AirportRecord entries
    pois.json                 — ~200 POIRecord entries
__tests__/
  geodesic.test.ts            — Phase 1 tests
  solar.test.ts               — Phase 2 tests
  recommend.test.ts           — Phase 3 tests
docs/                         — All documentation
taskInfo/                     — Per-task README folders
tmp/                          — Gitignored scratch space
```
