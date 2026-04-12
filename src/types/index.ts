// Re-exports all project TypeScript interfaces
// Source of truth: docs/schema.md
// This file grows as phases are completed

// ── Layer 0 — Data ──────────────────────────────────────────────────────────

export interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  utcOffsetMin: number;
}

export interface POIRecord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: 'landmark' | 'mountain' | 'island' | 'city' | 'natural' | 'water';
  minVisibilityKm: number;
}

// ── Layer 2A — Geodesic Engine ───────────────────────────────────────────────

export interface WaypointData {
  index: number;
  lat: number;
  lon: number;
  bearingDeg: number;
  cumulativeKm: number;
  utcTime: Date;
  // Solar fields — 0/null/[] until Phase 2 enrichment
  solarAzimuthDeg: number;
  solarElevDeg: number;
  isHorizonEvent: 'sunrise' | 'sunset' | null;
  nearbyPOIs: POIResult[];
}

// ── Layer 2B — Astronomy Engine ──────────────────────────────────────────────

export interface SolarPosition {
  solarAzimuthDeg: number;
  solarElevDeg: number;
}

export interface POIResult {
  poi: POIRecord;
  distanceKm: number;
  bearingFromPlane: number;
}

// ── Layer 1 — User Input ─────────────────────────────────────────────────────

export interface UserPreferences {
  weights: {
    sunrise: number;
    sunset: number;
    landscape: number;
    avoidSun: number;
  };
  isOvercast: boolean;
}

export interface FlightInput {
  origin: AirportRecord;
  destination: AirportRecord;
  departureUTC: string;
  preferences: UserPreferences;
}

// ── Layer 3 — Recommendation Engine ─────────────────────────────────────────

export interface ScoredEvent {
  type: 'sunrise' | 'sunset' | 'landmark' | 'city';
  name: string;
  side: 'left' | 'right';
  timeMinFromDeparture: number;
  solarElevDeg: number;
  score: number;
}

export interface SeatVerdict {
  winner: 'left' | 'right' | 'either';
  confidence: number;
  leftScore: number;
  rightScore: number;
  leftEvents: ScoredEvent[];
  rightEvents: ScoredEvent[];
  flightDurationMin: number;
}
