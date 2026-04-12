# Findings — AeroView

> Research log. Every library quirk, constraint, gotcha, or design decision discovered.
> Format: `date — topic — discovery — impact — source`

---

## Log

### 2026-04-12 — create-next-app naming
- **Discovery:** `create-next-app` rejects directory names with capital letters as invalid npm package names. The directory "AeroView" caused exit code 1.
- **Impact:** Had to set up Next.js manually (package.json + config files) instead of using the scaffold CLI.
- **Fix:** Created package.json with `"name": "aeroview"` (lowercase), then installed next/react/react-dom and all devDeps manually.
- **Source:** npm naming restrictions

---

### 2026-04-12 — Leaflet SSR incompatibility
- **Discovery:** Leaflet accesses `window` on import, which crashes Next.js SSR. Must use `dynamic(() => import(...), { ssr: false })` for any component that imports leaflet.
- **Impact:** MapView component must always be dynamically imported with ssr: false in the parent. The import of `leaflet/dist/leaflet.css` must also be inside the client component.
- **Fix (planned):** In Phase 5, parent uses `const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })`. The component file has `'use client'` at top.
- **Source:** react-leaflet docs, Next.js App Router docs

---

### 2026-04-12 — Leaflet default icon broken on webpack
- **Discovery:** Leaflet's default marker icon URLs are resolved relative to the leaflet CSS file, which webpack cannot resolve correctly. Results in broken 404 icon requests.
- **Impact:** Must manually patch `L.Icon.Default` after import to point to CDN or public/ assets.
- **Fix (planned):** Phase 5 step 5.2 includes the explicit `delete (L.Icon.Default.prototype as any)._getIconUrl` + `mergeOptions` patch.
- **Source:** Known leaflet/webpack issue, documented in react-leaflet FAQ

---

### 2026-04-12 — SunCalc azimuth convention
- **Discovery:** SunCalc.getPosition() returns `azimuth` in radians measured from **south**, going **westward** (i.e., south=0, west=π/2, north=π, east=3π/2). This is the opposite of standard navigation convention (north=0, clockwise).
- **Impact:** EVERY place that reads SunCalc azimuth must call `toNorthClockwizeDeg()` helper. Raw azimuth must never be used directly for bearing comparisons or map display.
- **Fix (planned):** Phase 2 step 2.2 creates the conversion helper: `(rad * 180/π + 180) % 360`.
- **Source:** SunCalc source code and docs

---

### 2026-04-12 — SunCalc polar night/day edge case
- **Discovery:** In polar regions during summer/winter, `SunCalc.getTimes()` returns `false` for sunrise/sunset when the sun never rises or sets. Accessing `.toISOString()` on `false` throws.
- **Impact:** `enrichWaypointsWithSolar` must check for falsy return from SunCalc before using the result.
- **Fix (planned):** Phase 2 step 2.8 includes: `if getTimes returns false for sunrise/sunset, set isHorizonEvent: null`.
- **Source:** SunCalc README, issues tracker

---

### 2026-04-12 — Great-circle vs rhumb line interpolation
- **Discovery:** Simple linear interpolation of latitude/longitude (lerp) produces a rhumb line (constant bearing), NOT a great-circle path. For long-haul routes the difference can be hundreds of km.
- **Impact:** Phase 1 `intermediatePoint` must use spherical linear interpolation (SLERP) via the haversine intermediate point formula, NOT `lat = lat1 + f*(lat2-lat1)`.
- **Source:** Aviation geodesy, Movable Type Scripts formulas

---

### 2026-04-12 — Antimeridian crossing
- **Discovery:** Routes crossing the antimeridian (±180° longitude, e.g. LAX→NRT) have waypoints where longitude jumps from ~+170 to ~-170. A naïve polyline will draw a horizontal line across the entire map.
- **Impact:** Two places need antimeridian handling:
  1. `greatCircleWaypoints` (Phase 1): if `|lon - prevLon| > 180`, adjust by ±360.
  2. `MapView` polyline (Phase 5): split polyline at the antimeridian crossing point.
- **Source:** Leaflet antimeridian FAQ, OpenLayers docs

---

### 2026-04-12 — airports.json capital-letter naming fix
- **Discovery:** The file size target is ~500KB for ~3000 airports. The JSON structure is `{ iata, name, city, country, lat, lon, timezone, utcOffsetMin }[]`.
- **Impact:** File generated via `tmp/gen-airports.js` script. utcOffsetMin is the **standard** (non-DST) offset in minutes. Components that need real-time offset must account for DST separately or store both.
- **Source:** Plan spec section 0.8

---

### 2026-04-12 — motion package (Framer Motion v11+)
- **Discovery:** The package is now published as `motion` (not `framer-motion`). Import as `import { motion } from 'motion/react'` for React components.
- **Impact:** All Phase 7 animation imports must use `motion/react`, not `framer-motion`.
- **Source:** motion.dev docs
