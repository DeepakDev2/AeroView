# Schema — Source of Truth

> Every TypeScript interface and type in the project, grouped by layer.
> **Update here FIRST before touching any code. Re-export everything from src/types/index.ts.**

---

## Layer 0 — Data Files (src/data/)

### AirportRecord
```typescript
interface AirportRecord {
  iata: string;          // e.g. "JFK"
  name: string;          // e.g. "John F. Kennedy International"
  city: string;          // e.g. "New York"
  country: string;       // e.g. "United States"
  lat: number;           // decimal degrees
  lon: number;           // decimal degrees
  timezone: string;      // IANA timezone e.g. "America/New_York"
  utcOffsetMin: number;  // standard (non-DST) UTC offset in minutes e.g. -300
}
```

### POIRecord
```typescript
interface POIRecord {
  id: string;               // unique slug e.g. "grand-canyon"
  name: string;             // display name e.g. "Grand Canyon"
  lat: number;              // decimal degrees
  lon: number;              // decimal degrees
  category: 'landmark' | 'mountain' | 'island' | 'city' | 'natural' | 'water';
  minVisibilityKm: number;  // minimum flight altitude visibility distance in km
}
```

---

## Layer 1 — User Input (Phase 4)

### UserPreferences
```typescript
interface UserPreferences {
  weights: {
    sunrise: number;    // -2 to 3
    sunset: number;     // -2 to 3
    landscape: number;  // -2 to 3
    avoidSun: number;   // -2 to 3 (negative suppresses sunny side)
  };
  isOvercast: boolean;
}
```

### FlightInput
```typescript
interface FlightInput {
  origin: AirportRecord;
  destination: AirportRecord;
  departureUTC: string;          // ISO 8601 UTC string e.g. "2024-06-21T08:00:00Z"
  preferences: UserPreferences;
}
```

---

## Layer 2A — Geodesic Engine (Phase 1 — src/lib/geodesic.ts)

### WaypointData (partial — geodesic fields only at Phase 1 output)
```typescript
interface WaypointData {
  index: number;
  lat: number;
  lon: number;
  bearingDeg: number;       // 0–360, north-up
  cumulativeKm: number;     // distance from origin
  utcTime: Date;            // UTC datetime at this waypoint

  // Solar fields — null/0 until enriched by Phase 2
  solarAzimuthDeg: number;  // 0–360 north-clockwise
  solarElevDeg: number;     // -90 to 90
  isHorizonEvent: 'sunrise' | 'sunset' | null;
  nearbyPOIs: POIResult[];
}
```

---

## Layer 2B — Astronomy Engine (Phase 2 — src/lib/solar.ts)

### SolarPosition
```typescript
interface SolarPosition {
  solarAzimuthDeg: number;  // 0–360 north-clockwise (converted from SunCalc south-origin)
  solarElevDeg: number;     // degrees above/below horizon
}
```

### POIResult
```typescript
interface POIResult {
  poi: POIRecord;
  distanceKm: number;
  bearingFromPlane: number;  // 0–360 north-clockwise
}
```

---

## Layer 3 — Recommendation Engine (Phase 3 — src/lib/recommend.ts)

### ScoredEvent
```typescript
interface ScoredEvent {
  type: 'sunrise' | 'sunset' | 'landmark' | 'city';
  name: string;
  side: 'left' | 'right';
  timeMinFromDeparture: number;
  solarElevDeg: number;
  score: number;
}
```

### SeatVerdict
```typescript
interface SeatVerdict {
  winner: 'left' | 'right' | 'either';
  confidence: number;          // 0–1
  leftScore: number;
  rightScore: number;
  leftEvents: ScoredEvent[];
  rightEvents: ScoredEvent[];
  flightDurationMin: number;
}
```

---

## Layer 4B — API (Phase 6 — src/app/api/narrative/route.ts)

### NarrativeRequest (POST body)
```typescript
interface NarrativeRequest {
  verdict: SeatVerdict;
}
```

### NarrativeResponse
- Type: `ReadableStream<string>` (plain text, streamed)
- Content-Type: `text/plain; charset=utf-8`

---

## Changelog

| Date       | Change                                    | Reason                     |
|------------|-------------------------------------------|----------------------------|
| 2026-04-12 | Schema file created with all Phase 0 types | Phase 0 foundation setup  |
