/**
 * src/lib/geodesic.ts — Layer 2A: Geodesic Engine
 *
 * Pure functions only. Zero React imports. Zero side effects.
 * All tunable numbers imported from constants.ts.
 */

import {
  EARTH_RADIUS_KM,
  CRUISE_SPEED_KMH,
  WAYPOINT_STEP_KM,
} from './constants';
import type { AirportRecord, WaypointData } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

// ── 1.2 haversineKm ──────────────────────────────────────────────────────────

/**
 * Great-circle distance in kilometres between two lat/lon points.
 * Uses the haversine formula.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// ── 1.3 bearingDeg ───────────────────────────────────────────────────────────

/**
 * Initial bearing in degrees [0, 360) from point 1 → point 2.
 * 0° = north, 90° = east, 180° = south, 270° = west.
 */
export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ── 1.4 intermediatePoint ────────────────────────────────────────────────────

/**
 * Spherical linear interpolation (SLERP) — NOT simple linear interpolation.
 * Returns the lat/lon at fraction f (0–1) along the great circle from p1 to p2.
 * Linear interpolation would produce a rhumb line (constant bearing), not a
 * great-circle path.
 */
export function intermediatePoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): { lat: number; lon: number } {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  // Angular distance between the two points
  const dLat = φ2 - φ1;
  const dLon = λ2 - λ1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) ** 2;
  const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Edge case: coincident points
  if (Math.abs(d) < 1e-10) return { lat: lat1, lon: lon1 };

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x =
    A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y =
    A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);

  return { lat: toDeg(φ), lon: toDeg(λ) };
}

// ── 1.5 greatCircleWaypoints ─────────────────────────────────────────────────

/**
 * Generates WaypointData[] along the great-circle route from origin to
 * destination, sampled every WAYPOINT_STEP_KM kilometres.
 *
 * Solar fields are initialised to safe zero/null values — Phase 2 fills them.
 */
export function greatCircleWaypoints(
  origin: AirportRecord,
  destination: AirportRecord,
  departureUTC: string
): WaypointData[] {
  const totalKm = haversineKm(
    origin.lat,
    origin.lon,
    destination.lat,
    destination.lon
  );

  const segmentCount = Math.ceil(totalKm / WAYPOINT_STEP_KM);
  const departureMs = new Date(departureUTC).getTime();
  const waypoints: WaypointData[] = [];

  for (let i = 0; i <= segmentCount; i++) {
    const fraction = i / segmentCount;
    const cumulativeKm = fraction * totalKm;

    // Position — use exact endpoints to avoid floating-point drift
    let lat: number;
    let lon: number;
    if (i === 0) {
      lat = origin.lat;
      lon = origin.lon;
    } else if (i === segmentCount) {
      lat = destination.lat;
      lon = destination.lon;
    } else {
      const pt = intermediatePoint(
        origin.lat,
        origin.lon,
        destination.lat,
        destination.lon,
        fraction
      );
      lat = pt.lat;
      lon = pt.lon;
    }

    // Antimeridian correction: if lon jumps > 180° from previous waypoint,
    // adjust by ±360° so the polyline doesn't draw across the whole map.
    if (waypoints.length > 0) {
      const prevLon = waypoints[waypoints.length - 1].lon;
      if (lon - prevLon > 180) lon -= 360;
      else if (lon - prevLon < -180) lon += 360;
    }

    // Bearing toward next point (use destination bearing for the last point)
    const nextFraction = Math.min((i + 1) / segmentCount, 1);
    const nextPt =
      i < segmentCount
        ? intermediatePoint(
            origin.lat,
            origin.lon,
            destination.lat,
            destination.lon,
            nextFraction
          )
        : { lat: destination.lat, lon: destination.lon };

    const bearing = bearingDeg(lat, lon, nextPt.lat, nextPt.lon);

    // UTC time at this waypoint
    const elapsedSeconds = (cumulativeKm / CRUISE_SPEED_KMH) * 3600;
    const utcTime = new Date(departureMs + elapsedSeconds * 1000);

    waypoints.push({
      index: i,
      lat,
      lon,
      bearingDeg: bearing,
      cumulativeKm,
      utcTime,
      // Solar fields — filled by Phase 2
      solarAzimuthDeg: 0,
      solarElevDeg: 0,
      isHorizonEvent: null,
      nearbyPOIs: [],
    });
  }

  return waypoints;
}
