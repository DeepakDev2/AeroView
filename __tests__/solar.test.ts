/**
 * __tests__/solar.test.ts — Phase 2 unit tests
 *
 * No network calls. No file I/O.
 * Imports from solar.ts, constants.ts, and types only.
 * Covers TC-P2-T1 through TC-P2-T14.
 */

import {
  toNorthClockwiseDeg,
  getSolarPosition,
  detectHorizonEvent,
  elevationMultiplier,
  scanNearbyPOIs,
  enrichWaypointsWithSolar,
} from '../src/lib/solar';
import {
  TWILIGHT_ELEV_DEG,
  POI_RADIUS_KM,
  MAX_POIS_PER_WAYPOINT,
} from '../src/lib/constants';
import type { POIRecord, WaypointData } from '../src/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makePOI(id: string, lat: number, lon: number): POIRecord {
  return {
    id,
    name: `POI-${id}`,
    lat,
    lon,
    category: 'landmark',
    minVisibilityKm: 50,
  };
}

function makeWaypoint(
  index: number,
  lat: number,
  lon: number,
  utcTime: Date
): WaypointData {
  return {
    index,
    lat,
    lon,
    bearingDeg: 90,
    cumulativeKm: index * 50,
    utcTime,
    solarAzimuthDeg: 0,
    solarElevDeg: 0,
    isHorizonEvent: null,
    nearbyPOIs: [],
  };
}

// ── TC-P2-T1: Azimuth conversion — south ────────────────────────────────────

test('TC-P2-T1: toNorthClockwiseDeg(0) = 180° (south)', () => {
  expect(toNorthClockwiseDeg(0)).toBeCloseTo(180, 1);
});

// ── TC-P2-T2: Azimuth conversion — north ────────────────────────────────────

test('TC-P2-T2: toNorthClockwiseDeg(π) = 0° or 360° (north)', () => {
  const result = toNorthClockwiseDeg(Math.PI);
  // 360° mod 360 = 0°
  expect(result).toBeCloseTo(0, 1);
});

// ── TC-P2-T3: Azimuth conversion — west ─────────────────────────────────────

test('TC-P2-T3: toNorthClockwiseDeg(π/2) = 270° (west)', () => {
  expect(toNorthClockwiseDeg(Math.PI / 2)).toBeCloseTo(270, 1);
});

// ── TC-P2-T4: Solar noon London ──────────────────────────────────────────────

test('TC-P2-T4: solar noon London 2024-06-21 — elev ≈ 62° ± 2°, azimuth ≈ 180° ± 5°', () => {
  // Solar noon in London on summer solstice: max elevation ~62°, azimuth ~180°
  const date = new Date('2024-06-21T12:00:00Z');
  const pos = getSolarPosition(51.5, -0.1, date);
  expect(pos.solarElevDeg).toBeGreaterThan(60);
  expect(pos.solarElevDeg).toBeLessThan(64);
  expect(pos.solarAzimuthDeg).toBeGreaterThan(175);
  expect(pos.solarAzimuthDeg).toBeLessThan(185);
});

// ── TC-P2-T5: Horizon event — sunrise ────────────────────────────────────────

test('TC-P2-T5: detectHorizonEvent(-1, +1) = "sunrise"', () => {
  expect(detectHorizonEvent(-1, 1)).toBe('sunrise');
});

// ── TC-P2-T6: Horizon event — sunset ─────────────────────────────────────────

test('TC-P2-T6: detectHorizonEvent(+1, -1) = "sunset"', () => {
  expect(detectHorizonEvent(1, -1)).toBe('sunset');
});

// ── TC-P2-T7: No horizon event ───────────────────────────────────────────────

test('TC-P2-T7: detectHorizonEvent(5, 10) = null', () => {
  expect(detectHorizonEvent(5, 10)).toBeNull();
});

// ── TC-P2-T8: Elevation multiplier — suppressed ──────────────────────────────

test('TC-P2-T8: elevationMultiplier(-10) = 0 (below twilight)', () => {
  expect(elevationMultiplier(-10)).toBe(0);
});

// ── TC-P2-T9: Elevation multiplier — twilight ─────────────────────────────────

test('TC-P2-T9: elevationMultiplier(-3) = 0.5 (twilight)', () => {
  // -3 is between TWILIGHT_ELEV_DEG (-6) and 0
  expect(TWILIGHT_ELEV_DEG).toBe(-6);
  expect(elevationMultiplier(-3)).toBe(0.5);
});

// ── TC-P2-T10: Elevation multiplier — daylight ────────────────────────────────

test('TC-P2-T10: elevationMultiplier(30) = 1.0 (daylight)', () => {
  expect(elevationMultiplier(30)).toBe(1.0);
});

// ── TC-P2-T11: POI scan radius — outside ────────────────────────────────────

test('TC-P2-T11: POI at 300 km is NOT returned (exceeds POI_RADIUS_KM=250)', () => {
  // Place the plane at (0, 0), put a POI ~300 km north at (2.7, 0)
  // 1 degree latitude ≈ 111 km, so 2.7° ≈ 300 km
  const poi = makePOI('far', 2.7, 0);
  const results = scanNearbyPOIs(0, 0, 0, [poi]);
  expect(results).toHaveLength(0);
});

// ── TC-P2-T12: POI scan returns max MAX_POIS_PER_WAYPOINT ────────────────────

test('TC-P2-T12: 10 POIs within radius → returns exactly MAX_POIS_PER_WAYPOINT (5)', () => {
  // All POIs within ~111 km (1° offset)
  const pois = Array.from({ length: 10 }, (_, i) =>
    makePOI(`p${i}`, 0.5, i * 0.05)
  );
  const results = scanNearbyPOIs(0, 0, 0, pois);
  expect(results).toHaveLength(MAX_POIS_PER_WAYPOINT);
});

// ── TC-P2-T13: Enriched waypoint has valid solar fields ──────────────────────

test('TC-P2-T13: enriched waypoint has solarAzimuthDeg in [0,360) and solarElevDeg in [-90,90]', () => {
  const utcTime = new Date('2024-06-21T08:00:00Z');
  const waypoints = [makeWaypoint(0, 40.64, -73.78, utcTime)];
  const enriched = enrichWaypointsWithSolar(waypoints, []);

  expect(enriched[0].solarAzimuthDeg).toBeGreaterThanOrEqual(0);
  expect(enriched[0].solarAzimuthDeg).toBeLessThan(360);
  expect(enriched[0].solarElevDeg).toBeGreaterThanOrEqual(-90);
  expect(enriched[0].solarElevDeg).toBeLessThanOrEqual(90);
});

// ── TC-P2-T14: Polar night edge case ────────────────────────────────────────

test('TC-P2-T14: Arctic in December — no horizon events, no crash', () => {
  // Longyearbyen, Svalbard — polar night in December
  const base = new Date('2024-12-15T12:00:00Z');
  const waypoints = Array.from({ length: 5 }, (_, i) =>
    makeWaypoint(i, 78.2, 15.6, new Date(base.getTime() + i * 3600_000))
  );
  const enriched = enrichWaypointsWithSolar(waypoints, []);

  // No crash
  expect(enriched).toHaveLength(5);
  // All solar elevations should be negative (polar night)
  for (const wp of enriched) {
    expect(wp.solarElevDeg).toBeLessThan(0);
  }
  // isHorizonEvent should be null for all (first is always null)
  for (const wp of enriched) {
    expect(wp.isHorizonEvent).toBeNull();
  }
});