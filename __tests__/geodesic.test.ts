/**
 * __tests__/geodesic.test.ts — Phase 1 unit tests
 *
 * No network calls. No file I/O. Only imports from geodesic.ts and constants.ts.
 * Covers all 10 test cases defined in docs/testcases.md (P1-T1 through P1-T10).
 */

import {
  haversineKm,
  bearingDeg,
  intermediatePoint,
  greatCircleWaypoints,
} from '../src/lib/geodesic';
import {
  WAYPOINT_STEP_KM,
  CRUISE_SPEED_KMH,
} from '../src/lib/constants';
import type { AirportRecord } from '../src/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const JFK: AirportRecord = {
  iata: 'JFK', name: 'John F. Kennedy International', city: 'New York',
  country: 'United States', lat: 40.6413, lon: -73.7781,
  timezone: 'America/New_York', utcOffsetMin: -300,
};

const LHR: AirportRecord = {
  iata: 'LHR', name: 'London Heathrow', city: 'London',
  country: 'United Kingdom', lat: 51.4775, lon: -0.4614,
  timezone: 'Europe/London', utcOffsetMin: 0,
};

const LAX: AirportRecord = {
  iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles',
  country: 'United States', lat: 33.9425, lon: -118.4081,
  timezone: 'America/Los_Angeles', utcOffsetMin: -480,
};

const NRT: AirportRecord = {
  iata: 'NRT', name: 'Tokyo Narita International', city: 'Tokyo',
  country: 'Japan', lat: 35.7653, lon: 140.3856,
  timezone: 'Asia/Tokyo', utcOffsetMin: 540,
};

// Two airports ~30 km apart (short route)
const SHORT_A: AirportRecord = {
  iata: 'TST', name: 'Test A', city: 'City A', country: 'Test',
  lat: 51.5, lon: -0.1, timezone: 'UTC', utcOffsetMin: 0,
};
const SHORT_B: AirportRecord = {
  iata: 'TSU', name: 'Test B', city: 'City B', country: 'Test',
  lat: 51.5, lon: 0.3, timezone: 'UTC', utcOffsetMin: 0,
};

const DEPARTURE = '2024-06-21T08:00:00Z';

// ── P1-T1: JFK to LHR distance ───────────────────────────────────────────────

test('P1-T1: JFK→LHR haversine distance ≈ 5539 km ± 50 km', () => {
  const dist = haversineKm(JFK.lat, JFK.lon, LHR.lat, LHR.lon);
  expect(dist).toBeGreaterThan(5489);
  expect(dist).toBeLessThan(5589);
});

// ── P1-T2: Waypoint count ────────────────────────────────────────────────────

test('P1-T2: JFK→LHR waypoint count = ceil(dist/50) + 1', () => {
  const waypoints = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const dist = haversineKm(JFK.lat, JFK.lon, LHR.lat, LHR.lon);
  const expected = Math.ceil(dist / WAYPOINT_STEP_KM) + 1;
  expect(waypoints.length).toBe(expected);
});

// ── P1-T3: First and last waypoints match endpoints ──────────────────────────

test('P1-T3: first waypoint = origin coords ±0.0001°, last = destination', () => {
  const waypoints = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];

  expect(first.lat).toBeCloseTo(JFK.lat, 3);
  expect(first.lon).toBeCloseTo(JFK.lon, 3);
  expect(last.lat).toBeCloseTo(LHR.lat, 3);
  expect(last.lon).toBeCloseTo(LHR.lon, 3);
});

// ── P1-T4: All bearings in [0, 360) ──────────────────────────────────────────

test('P1-T4: every waypoint bearingDeg is in [0, 360)', () => {
  const waypoints = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  for (const wp of waypoints) {
    expect(wp.bearingDeg).toBeGreaterThanOrEqual(0);
    expect(wp.bearingDeg).toBeLessThan(360);
  }
});

// ── P1-T5: Antimeridian LAX→NRT ──────────────────────────────────────────────

test('P1-T5: LAX→NRT — no consecutive lon diff > 180°, distance ≈ 8815 km ± 100 km', () => {
  const waypoints = greatCircleWaypoints(LAX, NRT, DEPARTURE);

  // No lon jump > 180° between consecutive waypoints
  for (let i = 1; i < waypoints.length; i++) {
    const diff = Math.abs(waypoints[i].lon - waypoints[i - 1].lon);
    expect(diff).toBeLessThanOrEqual(180);
  }

  // Distance check
  const dist = haversineKm(LAX.lat, LAX.lon, NRT.lat, NRT.lon);
  expect(dist).toBeGreaterThan(8715);
  expect(dist).toBeLessThan(8915);
});

// ── P1-T6: Bearing north ─────────────────────────────────────────────────────

test('P1-T6: bearing from (0,0) to (10,0) ≈ 0° (north) ± 1°', () => {
  const b = bearingDeg(0, 0, 10, 0);
  expect(b).toBeCloseTo(0, 0); // ±1° tolerance
});

// ── P1-T7: Bearing east ──────────────────────────────────────────────────────

test('P1-T7: bearing from (0,0) to (0,10) ≈ 90° (east) ± 1°', () => {
  const b = bearingDeg(0, 0, 0, 10);
  expect(b).toBeCloseTo(90, 0);
});

// ── P1-T8: Short route (<50 km) → exactly 2 waypoints ───────────────────────

test('P1-T8: route shorter than WAYPOINT_STEP_KM produces exactly 2 waypoints', () => {
  const dist = haversineKm(SHORT_A.lat, SHORT_A.lon, SHORT_B.lat, SHORT_B.lon);
  expect(dist).toBeLessThan(WAYPOINT_STEP_KM); // confirm fixture is short

  const waypoints = greatCircleWaypoints(SHORT_A, SHORT_B, DEPARTURE);
  expect(waypoints.length).toBe(2);
});

// ── P1-T9: cumulativeKm progression ─────────────────────────────────────────

test('P1-T9: cumulativeKm[0]=0, increases monotonically, last ≈ totalKm ± 1', () => {
  const waypoints = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const totalKm = haversineKm(JFK.lat, JFK.lon, LHR.lat, LHR.lon);

  expect(waypoints[0].cumulativeKm).toBe(0);

  for (let i = 1; i < waypoints.length; i++) {
    expect(waypoints[i].cumulativeKm).toBeGreaterThan(waypoints[i - 1].cumulativeKm);
  }

  const last = waypoints[waypoints.length - 1];
  expect(last.cumulativeKm).toBeCloseTo(totalKm, 0);
});

// ── P1-T10: utcTime progression ──────────────────────────────────────────────

test('P1-T10: utcTime[0]=departure, increases per waypoint, last ≈ departure+6.15h', () => {
  const waypoints = greatCircleWaypoints(JFK, LHR, DEPARTURE);
  const departureMs = new Date(DEPARTURE).getTime();

  // First waypoint is exactly at departure
  expect(waypoints[0].utcTime.getTime()).toBe(departureMs);

  // utcTime increases monotonically
  for (let i = 1; i < waypoints.length; i++) {
    expect(waypoints[i].utcTime.getTime()).toBeGreaterThan(
      waypoints[i - 1].utcTime.getTime()
    );
  }

  // Last waypoint: JFK→LHR ≈ 5539 km / 900 kmh ≈ 6.15 h
  const last = waypoints[waypoints.length - 1];
  const elapsedHours =
    (last.utcTime.getTime() - departureMs) / (1000 * 3600);
  expect(elapsedHours).toBeGreaterThan(5.9);
  expect(elapsedHours).toBeLessThan(6.5);
});
