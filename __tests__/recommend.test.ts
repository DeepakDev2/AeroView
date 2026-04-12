/**
 * __tests__/recommend.test.ts — Phase 3 unit tests
 *
 * No network calls. No file I/O.
 * Imports from recommend.ts, constants.ts, and types only.
 * Covers TC-P3-T1 through TC-P3-T12.
 */

import {
  sideOfPlane,
  scoreSolarEvent,
  scoreLandmark,
  computeVerdict,
} from '../src/lib/recommend';
import {
  WEATHER_OVERCAST_FACTOR,
  LOW_CONFIDENCE_THRESHOLD,
} from '../src/lib/constants';
import type { WaypointData, UserPreferences, POIRecord, POIResult } from '../src/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PREFS_CLEAR: UserPreferences = {
  weights: { sunrise: 2, sunset: 2, landscape: 1, avoidSun: 0 },
  isOvercast: false,
};

const PREFS_OVERCAST: UserPreferences = {
  weights: { sunrise: 2, sunset: 2, landscape: 1, avoidSun: 0 },
  isOvercast: true,
};

function makeWaypoint(overrides: Partial<WaypointData> = {}): WaypointData {
  return {
    index: 0,
    lat: 51.5,
    lon: -0.1,
    bearingDeg: 90,       // flying east
    cumulativeKm: 0,
    utcTime: new Date('2024-06-21T08:00:00Z'),
    solarAzimuthDeg: 180, // sun to the south (right when flying east)
    solarElevDeg: 10,
    isHorizonEvent: null,
    nearbyPOIs: [],
    ...overrides,
  };
}

function makePOIResult(distanceKm: number, bearingFromPlane: number): POIResult {
  const poi: POIRecord = {
    id: 'test',
    name: 'Test POI',
    lat: 0,
    lon: 0,
    category: 'landmark',
    minVisibilityKm: 50,
  };
  return { poi, distanceKm, bearingFromPlane };
}

// ── TC-P3-T1: sideOfPlane — right ────────────────────────────────────────────

test('TC-P3-T1: sideOfPlane — object at relative bearing 90° → right', () => {
  // planeBearing=0 (north), objectAzimuth=90 (east) → relativeBearing=90 → right
  expect(sideOfPlane(0, 90)).toBe('right');
});

// ── TC-P3-T2: sideOfPlane — left ─────────────────────────────────────────────

test('TC-P3-T2: sideOfPlane — object at relative bearing 270° → left', () => {
  // planeBearing=0, objectAzimuth=270 → relativeBearing=270 → left
  expect(sideOfPlane(0, 270)).toBe('left');
});

// ── TC-P3-T3: sideOfPlane — dead ahead boundary ──────────────────────────────

test('TC-P3-T3: sideOfPlane — object dead ahead (relativeBearing=0) → right', () => {
  // planeBearing=90, objectAzimuth=90 → relativeBearing=0 → right ([0,180))
  expect(sideOfPlane(90, 90)).toBe('right');
});

// ── TC-P3-T4: scoreSolarEvent — normal sunrise ────────────────────────────────

test('TC-P3-T4: scoreSolarEvent sunrise, elev=5°, clear, weight=2 → score=2', () => {
  // elevationMultiplier(5) = 1.0, weatherFactor=1.0, weight=2 → 2×1×1 = 2
  const score = scoreSolarEvent('sunrise', 5, PREFS_CLEAR);
  expect(score).toBeCloseTo(2, 5);
});

// ── TC-P3-T5: scoreSolarEvent — below twilight ────────────────────────────────

test('TC-P3-T5: scoreSolarEvent sunrise, elev=-10° (below twilight) → score=0', () => {
  // elevationMultiplier(-10) = 0 → score = 0
  const score = scoreSolarEvent('sunrise', -10, PREFS_CLEAR);
  expect(score).toBe(0);
});

// ── TC-P3-T6: scoreSolarEvent — overcast penalty ──────────────────────────────

test('TC-P3-T6: scoreSolarEvent overcast → score = WEATHER_OVERCAST_FACTOR × clear score', () => {
  const clear = scoreSolarEvent('sunrise', 5, PREFS_CLEAR);
  const overcast = scoreSolarEvent('sunrise', 5, PREFS_OVERCAST);
  expect(overcast).toBeCloseTo(clear * WEATHER_OVERCAST_FACTOR, 5);
});

// ── TC-P3-T7: scoreLandmark — closer POI scores higher ────────────────────────

test('TC-P3-T7: scoreLandmark — 50 km scores higher than 200 km', () => {
  const near = scoreLandmark(50, PREFS_CLEAR);
  const far = scoreLandmark(200, PREFS_CLEAR);
  expect(near).toBeGreaterThan(far);
});

// ── TC-P3-T8: scoreLandmark — zero landscape weight ──────────────────────────

test('TC-P3-T8: scoreLandmark — landscape weight=0 → score=0', () => {
  const prefs: UserPreferences = {
    weights: { sunrise: 2, sunset: 2, landscape: 0, avoidSun: 0 },
    isOvercast: false,
  };
  expect(scoreLandmark(100, prefs)).toBe(0);
});

// ── TC-P3-T9: computeVerdict — all events on left → winner=left ───────────────

test('TC-P3-T9: computeVerdict — all horizon events on left side → winner=left', () => {
  // planeBearing=90 (east), solarAzimuth=270 (north) → relative=(270-90)%360=180 → left
  const wp = makeWaypoint({
    bearingDeg: 90,
    solarAzimuthDeg: 270,
    solarElevDeg: 5,
    isHorizonEvent: 'sunrise',
  });
  const verdict = computeVerdict([wp], PREFS_CLEAR);
  expect(verdict.winner).toBe('left');
  expect(verdict.leftScore).toBeGreaterThan(verdict.rightScore);
  expect(verdict.leftEvents).toHaveLength(1);
});

// ── TC-P3-T10: computeVerdict — balanced → winner=either ─────────────────────

test('TC-P3-T10: computeVerdict — equal events on both sides → winner=either', () => {
  const prefs: UserPreferences = {
    weights: { sunrise: 2, sunset: 2, landscape: 0, avoidSun: 0 },
    isOvercast: false,
  };
  const t0 = new Date('2024-06-21T08:00:00Z');
  const t1 = new Date('2024-06-21T09:00:00Z');

  // wp1: sunrise on left (solarAzimuth=270, bearing=90 → relative=180 → left)
  const wp1 = makeWaypoint({
    index: 0,
    utcTime: t0,
    bearingDeg: 90,
    solarAzimuthDeg: 270,
    solarElevDeg: 5,
    isHorizonEvent: 'sunrise',
  });
  // wp2: sunrise on right (solarAzimuth=90, bearing=90 → relative=0 → right)
  const wp2 = makeWaypoint({
    index: 1,
    utcTime: t1,
    bearingDeg: 90,
    solarAzimuthDeg: 90,
    solarElevDeg: 5,
    isHorizonEvent: 'sunrise',
  });

  const verdict = computeVerdict([wp1, wp2], prefs);
  expect(verdict.winner).toBe('either');
  expect(verdict.confidence).toBeLessThan(LOW_CONFIDENCE_THRESHOLD);
});

// ── TC-P3-T11: computeVerdict — avoidSun penalises sun side ──────────────────

test('TC-P3-T11: computeVerdict — avoidSun=3, sun on left → right wins', () => {
  const prefs: UserPreferences = {
    weights: { sunrise: 0, sunset: 0, landscape: 0, avoidSun: 3 },
    isOvercast: false,
  };
  // sun on left: bearing=90, solarAzimuth=270 → relative=180 → left
  const wp = makeWaypoint({
    bearingDeg: 90,
    solarAzimuthDeg: 270,
    solarElevDeg: 30, // full sun, elevationMultiplier=1.0
    isHorizonEvent: null,
  });
  const verdict = computeVerdict([wp], prefs);
  // leftScore penalised → right wins
  expect(verdict.winner).toBe('right');
  expect(verdict.rightScore).toBeGreaterThan(verdict.leftScore);
});

// ── TC-P3-T12: computeVerdict — flightDurationMin ────────────────────────────

test('TC-P3-T12: computeVerdict — flightDurationMin = last utcTime minus first, in minutes', () => {
  const t0 = new Date('2024-06-21T08:00:00Z');
  const t1 = new Date('2024-06-21T09:30:00Z'); // 90 minutes later
  const wp1 = makeWaypoint({ index: 0, utcTime: t0 });
  const wp2 = makeWaypoint({ index: 1, utcTime: t1 });

  const verdict = computeVerdict([wp1, wp2], PREFS_CLEAR);
  expect(verdict.flightDurationMin).toBeCloseTo(90, 5);
});
