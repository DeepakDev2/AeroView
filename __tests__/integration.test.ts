/**
 * __tests__/integration.test.ts — Phase 8 integration tests
 *
 * Full pipeline: geodesic → solar enrichment → recommendation engine.
 * No mocks. Real airports.json and pois.json data.
 * No network calls. No UI rendering.
 */

import { greatCircleWaypoints } from '../src/lib/geodesic';
import { enrichWaypointsWithSolar } from '../src/lib/solar';
import { computeVerdict } from '../src/lib/recommend';
import airportsData from '../src/data/airports.json';
import poisData from '../src/data/pois.json';
import type { AirportRecord, POIRecord, UserPreferences } from '../src/types';

const airports = airportsData as AirportRecord[];
const pois = poisData as POIRecord[];

const JFK = airports.find((a) => a.iata === 'JFK')!;
const LHR = airports.find((a) => a.iata === 'LHR')!;

const DEPARTURE = '2024-06-21T08:00:00Z';

const PREFS: UserPreferences = {
  weights: { sunrise: 2, sunset: 2, landscape: 1, avoidSun: 0 },
  isOvercast: false,
};

// Sanity-check fixtures exist in airports.json
test('fixtures: JFK and LHR present in airports.json', () => {
  expect(JFK).toBeDefined();
  expect(LHR).toBeDefined();
});

// ── TC-P8-T1: Full pipeline produces valid SeatVerdict ────────────────────────

test('TC-P8-T1: full pipeline JFK→LHR produces valid SeatVerdict', () => {
  const raw = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const enriched = enrichWaypointsWithSolar(raw, pois);
  const verdict = computeVerdict(enriched, PREFS);

  expect(['left', 'right', 'either']).toContain(verdict.winner);
  expect(verdict.confidence).toBeGreaterThanOrEqual(0);
  expect(verdict.confidence).toBeLessThanOrEqual(1);
  expect(typeof verdict.leftScore).toBe('number');
  expect(typeof verdict.rightScore).toBe('number');
});

// ── TC-P8-T2: Enriched waypoints have valid solar fields ──────────────────────

test('TC-P8-T2: enriched waypoints have solarElevDeg in [-90, 90]', () => {
  const raw = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const enriched = enrichWaypointsWithSolar(raw, pois);

  for (const wp of enriched) {
    expect(wp.solarElevDeg).toBeGreaterThanOrEqual(-90);
    expect(wp.solarElevDeg).toBeLessThanOrEqual(90);
    expect(wp.solarAzimuthDeg).toBeGreaterThanOrEqual(0);
    expect(wp.solarAzimuthDeg).toBeLessThan(360);
  }
});

// ── TC-P8-T3: Enriched waypoints have nearbyPOIs array ───────────────────────

test('TC-P8-T3: every enriched waypoint has a nearbyPOIs array', () => {
  const raw = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const enriched = enrichWaypointsWithSolar(raw, pois);

  for (const wp of enriched) {
    expect(Array.isArray(wp.nearbyPOIs)).toBe(true);
  }
});

// ── TC-P8-T4: flightDurationMin ≈ 370 min for JFK→LHR ────────────────────────

test('TC-P8-T4: computeVerdict flightDurationMin ≈ 370 min for JFK→LHR', () => {
  const raw = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const enriched = enrichWaypointsWithSolar(raw, pois);
  const verdict = computeVerdict(enriched, PREFS);

  // JFK→LHR ≈ 5539 km / 900 kmh ≈ 369 min
  expect(verdict.flightDurationMin).toBeGreaterThan(340);
  expect(verdict.flightDurationMin).toBeLessThan(400);
});