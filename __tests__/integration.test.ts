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

// ── TC-P8-T5: Performance — full pipeline < 500 ms ───────────────────────────

test('TC-P8-T5: full pipeline JFK→LHR completes in < 500 ms', () => {
  const start = performance.now();
  const raw      = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const enriched = enrichWaypointsWithSolar(raw, pois);
  computeVerdict(enriched, PREFS);
  const elapsed = performance.now() - start;

  // Log for visibility; assert hard cap
  console.log(`Pipeline time: ${elapsed.toFixed(1)} ms (${raw.length} waypoints)`);
  expect(elapsed).toBeLessThan(500);
});

// ── TC-P8-T6: Route LHR → JFK (afternoon eastbound) ─────────────────────────

test('TC-P8-T6: LHR→JFK produces valid verdict', () => {
  const SYD = airports.find((a) => a.iata === 'SYD')!; // used below; check fixture here too
  expect(SYD).toBeDefined();

  const raw      = greatCircleWaypoints(LHR, JFK, '2024-06-21T12:00:00Z');
  const enriched = enrichWaypointsWithSolar(raw, pois);
  const verdict  = computeVerdict(enriched, PREFS);

  expect(['left', 'right', 'either']).toContain(verdict.winner);
  expect(verdict.flightDurationMin).toBeGreaterThan(300);
  expect(verdict.flightDurationMin).toBeLessThan(450);
  // No consecutive lon jump > 180° (antimeridian safety)
  for (let i = 1; i < raw.length; i++) {
    expect(Math.abs(raw[i].lon - raw[i - 1].lon)).toBeLessThan(180);
  }
});

// ── TC-P8-T7: Route SYD → LAX (transpacific, antimeridian crossing) ──────────

test('TC-P8-T7: SYD→LAX crosses antimeridian without map artifact', () => {
  const SYD = airports.find((a) => a.iata === 'SYD')!;
  const LAX = airports.find((a) => a.iata === 'LAX')!;

  const raw      = greatCircleWaypoints(SYD, LAX, '2024-12-21T22:00:00Z');
  const enriched = enrichWaypointsWithSolar(raw, pois);
  const verdict  = computeVerdict(enriched, PREFS);

  expect(['left', 'right', 'either']).toContain(verdict.winner);
  // SYD→LAX ≈ 12,074 km / 900 kmh ≈ 805 min
  expect(verdict.flightDurationMin).toBeGreaterThan(750);
  expect(verdict.flightDurationMin).toBeLessThan(870);
  // Antimeridian: no consecutive lon jump > 180°
  for (let i = 1; i < raw.length; i++) {
    expect(Math.abs(raw[i].lon - raw[i - 1].lon)).toBeLessThan(180);
  }
});

// ── TC-P8-T8: Route DEL → DXB (short route) ──────────────────────────────────

test('TC-P8-T8: DEL→DXB short route produces verdict without crash', () => {
  const DEL = airports.find((a) => a.iata === 'DEL')!;
  const DXB = airports.find((a) => a.iata === 'DXB')!;

  const raw      = greatCircleWaypoints(DEL, DXB, '2024-06-21T06:00:00Z');
  const enriched = enrichWaypointsWithSolar(raw, pois);
  const verdict  = computeVerdict(enriched, PREFS);

  expect(['left', 'right', 'either']).toContain(verdict.winner);
  // DEL→DXB ≈ 2,200 km / 900 kmh ≈ 147 min
  expect(verdict.flightDurationMin).toBeGreaterThan(120);
  expect(verdict.flightDurationMin).toBeLessThan(200);
  // All waypoints have valid solar data
  for (const wp of enriched) {
    expect(wp.solarElevDeg).toBeGreaterThanOrEqual(-90);
    expect(wp.solarElevDeg).toBeLessThanOrEqual(90);
  }
});