/**
 * src/lib/recommend.ts — Layer 3: Seat Recommendation Engine
 *
 * Pure functions only. Zero React imports. Zero side effects.
 * All tunable numbers imported from constants.ts.
 */

import { elevationMultiplier } from './solar';
import {
  WEATHER_CLEAR_FACTOR,
  WEATHER_OVERCAST_FACTOR,
  LOW_CONFIDENCE_THRESHOLD,
  POI_RADIUS_KM,
} from './constants';
import type {
  WaypointData,
  UserPreferences,
  ScoredEvent,
  SeatVerdict,
} from '../types';

// ── 3.1 sideOfPlane ──────────────────────────────────────────────────────────

/**
 * Determines which side of the plane an object (sun, POI) is on.
 * Computes the relative bearing from the plane's heading to the object.
 * [0, 180)  → right side
 * [180, 360) → left side
 */
export function sideOfPlane(
  planeBearing: number,
  objectAzimuth: number
): 'left' | 'right' {
  const relative = ((objectAzimuth - planeBearing) % 360 + 360) % 360;
  return relative < 180 ? 'right' : 'left';
}

// ── 3.2 scoreSolarEvent ──────────────────────────────────────────────────────

/**
 * Scores a sunrise or sunset horizon event at a waypoint.
 * score = weight × elevationMultiplier(elevDeg) × weatherFactor
 */
export function scoreSolarEvent(
  type: 'sunrise' | 'sunset',
  solarElevDeg: number,
  preferences: UserPreferences
): number {
  const weight =
    type === 'sunrise'
      ? preferences.weights.sunrise
      : preferences.weights.sunset;
  const weatherFactor = preferences.isOvercast
    ? WEATHER_OVERCAST_FACTOR
    : WEATHER_CLEAR_FACTOR;
  return weight * elevationMultiplier(solarElevDeg) * weatherFactor;
}

// ── 3.3 scoreLandmark ────────────────────────────────────────────────────────

/**
 * Scores a POI/landmark sighting based on proximity and user preference.
 * score = landscape weight × (1 − distanceKm / POI_RADIUS_KM) × weatherFactor
 * Closer POIs score higher; beyond POI_RADIUS_KM score would be ≤ 0 (never reached).
 */
export function scoreLandmark(
  distanceKm: number,
  preferences: UserPreferences
): number {
  const weatherFactor = preferences.isOvercast
    ? WEATHER_OVERCAST_FACTOR
    : WEATHER_CLEAR_FACTOR;
  return (
    preferences.weights.landscape *
    (1 - distanceKm / POI_RADIUS_KM) *
    weatherFactor
  );
}

// ── 3.4 computeVerdict ───────────────────────────────────────────────────────

/**
 * Aggregates all enriched waypoints into a SeatVerdict.
 *
 * For each waypoint:
 *   - Horizon events (sunrise/sunset): scored and assigned to left/right side
 *   - avoidSun: penalises the side the sun is on each waypoint
 *   - Nearby POIs: scored and assigned to left/right via their bearing from the plane
 *
 * winner = 'either' if |left − right| < LOW_CONFIDENCE_THRESHOLD × total
 * confidence = |leftScore − rightScore| / (|leftScore| + |rightScore|)
 */
export function computeVerdict(
  waypoints: WaypointData[],
  preferences: UserPreferences
): SeatVerdict {
  let leftScore = 0;
  let rightScore = 0;
  const leftEvents: ScoredEvent[]  = [];
  const rightEvents: ScoredEvent[] = [];
  const seenPoiIds = new Set<string>(); // dedup: one event per unique POI

  const departureMs = waypoints[0]?.utcTime.getTime() ?? 0;
  const weatherFactor = preferences.isOvercast
    ? WEATHER_OVERCAST_FACTOR
    : WEATHER_CLEAR_FACTOR;

  for (const wp of waypoints) {
    const timeMinFromDeparture =
      (wp.utcTime.getTime() - departureMs) / 60000;

    // ── Horizon events ────────────────────────────────────────────────────
    if (wp.isHorizonEvent) {
      const score = scoreSolarEvent(
        wp.isHorizonEvent,
        wp.solarElevDeg,
        preferences
      );
      const side = sideOfPlane(wp.bearingDeg, wp.solarAzimuthDeg);
      const event: ScoredEvent = {
        type: wp.isHorizonEvent,
        name: wp.isHorizonEvent === 'sunrise' ? 'Sunrise' : 'Sunset',
        side,
        timeMinFromDeparture,
        solarElevDeg: wp.solarElevDeg,
        score,
      };
      if (side === 'left') {
        leftScore += score;
        leftEvents.push(event);
      } else {
        rightScore += score;
        rightEvents.push(event);
      }
    }

    // ── avoidSun: penalise the side the sun is on ─────────────────────────
    if (preferences.weights.avoidSun !== 0) {
      const sunSide = sideOfPlane(wp.bearingDeg, wp.solarAzimuthDeg);
      const penalty =
        preferences.weights.avoidSun *
        elevationMultiplier(wp.solarElevDeg) *
        weatherFactor;
      if (sunSide === 'left') {
        leftScore -= penalty;
      } else {
        rightScore -= penalty;
      }
    }

    // ── Nearby POIs ───────────────────────────────────────────────────────
    for (const poiResult of wp.nearbyPOIs) {
      const score = scoreLandmark(poiResult.distanceKm, preferences);
      if (score === 0) continue;
      if (seenPoiIds.has(poiResult.poi.id)) continue;
      seenPoiIds.add(poiResult.poi.id);
      const side = sideOfPlane(wp.bearingDeg, poiResult.bearingFromPlane);
      const type =
        poiResult.poi.category === 'city' ? 'city' : 'landmark';
      const event: ScoredEvent = {
        type,
        name: poiResult.poi.name,
        side,
        timeMinFromDeparture,
        solarElevDeg: wp.solarElevDeg,
        score,
      };
      if (side === 'left') {
        leftScore += score;
        leftEvents.push(event);
      } else {
        rightScore += score;
        rightEvents.push(event);
      }
    }
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const total = Math.abs(leftScore) + Math.abs(rightScore);
  const diff = Math.abs(leftScore - rightScore);
  const confidence = total > 0 ? diff / total : 0;

  let winner: 'left' | 'right' | 'either';
  if (total === 0 || diff < LOW_CONFIDENCE_THRESHOLD * total) {
    winner = 'either';
  } else {
    winner = leftScore >= rightScore ? 'left' : 'right';
  }

  const flightDurationMin =
    waypoints.length >= 2
      ? (waypoints[waypoints.length - 1].utcTime.getTime() - departureMs) /
        60000
      : 0;

  return {
    winner,
    confidence,
    leftScore,
    rightScore,
    leftEvents,
    rightEvents,
    flightDurationMin,
  };
}
