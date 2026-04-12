/**
 * src/lib/solar.ts — Layer 2B: Astronomy Engine
 *
 * Pure functions only. Zero React imports. Zero side effects.
 * All tunable numbers imported from constants.ts.
 * SunCalc azimuth MUST always go through toNorthClockwiseDeg() before use.
 */

import SunCalc from 'suncalc';
import { haversineKm, bearingDeg } from './geodesic';
import {
  TWILIGHT_ELEV_DEG,
  POI_RADIUS_KM,
  MAX_POIS_PER_WAYPOINT,
} from './constants';
import type { WaypointData, POIRecord, POIResult, SolarPosition } from '../types';

// ── 2.1 toNorthClockwiseDeg ──────────────────────────────────────────────────

/**
 * Converts SunCalc's raw azimuth (radians, 0=south, clockwise) to
 * north-clockwise degrees (0=north, 90=east, 180=south, 270=west).
 *
 * SunCalc convention: 0 rad = south. Adding π rotates the reference to north.
 */
export function toNorthClockwiseDeg(rawAzimuthRad: number): number {
  const deg = ((rawAzimuthRad + Math.PI) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

// ── 2.2 getSolarPosition ─────────────────────────────────────────────────────

/**
 * Returns the solar azimuth and elevation at a given position and time.
 * Elevation (altitude) is converted from radians to degrees.
 */
export function getSolarPosition(
  lat: number,
  lon: number,
  utcTime: Date
): SolarPosition {
  const pos = SunCalc.getPosition(utcTime, lat, lon);
  return {
    solarAzimuthDeg: toNorthClockwiseDeg(pos.azimuth),
    solarElevDeg: (pos.altitude * 180) / Math.PI,
  };
}

// ── 2.3 detectHorizonEvent ───────────────────────────────────────────────────

/**
 * Detects whether the sun crosses the horizon between two consecutive waypoints.
 * Returns 'sunrise' if elevation transitions negative→positive,
 * 'sunset' if positive→negative, null otherwise.
 */
export function detectHorizonEvent(
  prevElevDeg: number,
  currElevDeg: number
): 'sunrise' | 'sunset' | null {
  if (prevElevDeg < 0 && currElevDeg >= 0) return 'sunrise';
  if (prevElevDeg >= 0 && currElevDeg < 0) return 'sunset';
  return null;
}

// ── 2.4 elevationMultiplier ──────────────────────────────────────────────────

/**
 * Quality multiplier for solar events based on sun elevation:
 * - Below TWILIGHT_ELEV_DEG (−6°): 0.0 — too dark, no visible event
 * - Twilight [−6°, 0°):            0.5 — partial visibility
 * - Daylight [0°, ∞):              1.0 — full visibility
 */
export function elevationMultiplier(elevDeg: number): number {
  if (elevDeg < TWILIGHT_ELEV_DEG) return 0;
  if (elevDeg < 0) return 0.5;
  return 1.0;
}

// ── 2.5 scanNearbyPOIs ───────────────────────────────────────────────────────

/**
 * Scans the POI list for entries within POI_RADIUS_KM of the plane's position.
 * Returns up to MAX_POIS_PER_WAYPOINT results, sorted by ascending distance.
 * Each result includes the bearing from the plane to the POI.
 */
export function scanNearbyPOIs(
  lat: number,
  lon: number,
  bearing: number,
  pois: POIRecord[]
): POIResult[] {
  const results: POIResult[] = [];

  for (const poi of pois) {
    const distanceKm = haversineKm(lat, lon, poi.lat, poi.lon);
    if (distanceKm <= POI_RADIUS_KM) {
      results.push({
        poi,
        distanceKm,
        bearingFromPlane: bearingDeg(lat, lon, poi.lat, poi.lon),
      });
    }
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, MAX_POIS_PER_WAYPOINT);
}

// ── 2.6 enrichWaypointsWithSolar ─────────────────────────────────────────────

/**
 * Fills all solar fields on every waypoint.
 * Returns a new array — does not mutate the input.
 *
 * For each waypoint:
 *   - Computes solar azimuth and elevation via getSolarPosition
 *   - Detects horizon events by comparing elevation with the previous waypoint
 *   - Scans nearby POIs within POI_RADIUS_KM
 */
export function enrichWaypointsWithSolar(
  waypoints: WaypointData[],
  pois: POIRecord[]
): WaypointData[] {
  const enriched: WaypointData[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const solar = getSolarPosition(wp.lat, wp.lon, wp.utcTime);

    const isHorizonEvent =
      i === 0
        ? null
        : detectHorizonEvent(
            enriched[i - 1].solarElevDeg,  // read from already-enriched result
            solar.solarElevDeg
          );

    const nearbyPOIs = scanNearbyPOIs(wp.lat, wp.lon, wp.bearingDeg, pois);

    enriched.push({
      ...wp,
      solarAzimuthDeg: solar.solarAzimuthDeg,
      solarElevDeg: solar.solarElevDeg,
      isHorizonEvent,
      nearbyPOIs,
    });
  }

  return enriched;
}