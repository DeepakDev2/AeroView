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

// ── 2.7 getSubSolarPoint ─────────────────────────────────────────────────────

/**
 * Returns the geographic point (lat, lon) directly beneath the sun — i.e. the
 * location where the sun is at zenith — for a given UTC instant.
 *
 * Sub-solar latitude  = solar declination (depends on day of year).
 * Sub-solar longitude = -(UTC hours offset from solar noon) × 15°/h
 *                       (at UTC 12:00 the sun is overhead at 0° / Greenwich).
 */
export function getSubSolarPoint(date: Date): { lat: number; lon: number } {
  // Day of year (1-based)
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear   = (date.getTime() - startOfYear) / 86_400_000 + 1;

  // Solar declination via simple sinusoidal approximation (±23.45°)
  const declRad = (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));

  // Sub-solar longitude: 15°/h west of the Greenwich meridian at UTC noon
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let sunLon = (12 - utcHours) * 15;
  // Normalise to [-180, 180]
  sunLon = ((sunLon + 180) % 360 + 360) % 360 - 180;

  return { lat: (declRad * 180) / Math.PI, lon: sunLon };
}

// ── 2.8 getNightPolygonCoords ────────────────────────────────────────────────

/**
 * Returns a GeoJSON polygon ring (exterior coordinates only) that covers the
 * night hemisphere at the given UTC time.
 *
 * Algorithm:
 *  - The solar terminator satisfies: tan(lat) = −cos(HA) / tan(decl)
 *    where HA = (lon − sunLon) in radians, decl = solar declination.
 *  - We sample every 2° of longitude to trace the terminator line.
 *  - We close the polygon around the pole that is currently in winter darkness.
 *
 * Equinox safety: declination is clamped to ±0.5° minimum to avoid division-
 * by-zero; the resulting tiny distortion is visually imperceptible.
 */
export function getNightPolygonCoords(date: Date): [number, number][] {
  const { lat: sunLat, lon: sunLon } = getSubSolarPoint(date);

  // Clamp decl away from zero to prevent tan(decl) blow-up at equinox
  const MIN_DECL_DEG = 0.5;
  const clampedDecl  = sunLat >= 0
    ? Math.max(sunLat, MIN_DECL_DEG)
    : Math.min(sunLat, -MIN_DECL_DEG);
  const declRad = (clampedDecl * Math.PI) / 180;

  // Trace the terminator from lon=−180 to lon=+180
  const terminator: [number, number][] = [];
  for (let i = 0; i <= 180; i++) {
    const lon   = -180 + i * 2;
    const haRad = ((lon - sunLon) * Math.PI) / 180;
    const latRad = Math.atan(-Math.cos(haRad) / Math.tan(declRad));
    terminator.push([lon, (latRad * 180) / Math.PI]);
  }

  // The pole in the winter (night) hemisphere closes the polygon
  const poleY: number = sunLat >= 0 ? -90 : 90;

  return [
    [-180, poleY] as [number, number],
    ...terminator,
    [ 180, poleY] as [number, number],
    [-180, poleY] as [number, number],   // close ring
  ];
}