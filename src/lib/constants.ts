// AeroView — src/lib/constants.ts
// Single source of truth for every tunable number in the application.
// No raw numbers may appear in logic code. Always import from here.

/** Earth radius in kilometres (mean radius) */
export const EARTH_RADIUS_KM = 6371;

/** Cruise speed assumed for timing waypoints along the route */
export const CRUISE_SPEED_KMH = 900;

/** Great-circle sampling interval — one waypoint every N km */
export const WAYPOINT_STEP_KM = 50;

/** Radius around each waypoint to scan for nearby POIs */
export const POI_RADIUS_KM = 250;

/** Solar elevation threshold (degrees) below which twilight is "dim" vs suppressed.
 *  Below this value (e.g. -6°) the sun is below astronomical twilight — score is 0. */
export const TWILIGHT_ELEV_DEG = -6;

/** Score multiplier when weather is clear */
export const WEATHER_CLEAR_FACTOR = 1.0;

/** Score multiplier when weather is overcast (80% reduction) */
export const WEATHER_OVERCAST_FACTOR = 0.2;

/** Maximum weight value allowed on any preference slider */
export const MAX_WEIGHT = 3;

/** Minimum weight value allowed on any preference slider */
export const MIN_WEIGHT = -2;

/** If |leftScore - rightScore| / (leftScore + rightScore) is below this,
 *  verdict winner is 'either' (not enough difference to recommend a side) */
export const LOW_CONFIDENCE_THRESHOLD = 0.1;

/** Maximum number of POIs returned per waypoint scan */
export const MAX_POIS_PER_WAYPOINT = 5;

/** Minimum characters typed before airport autocomplete dropdown appears */
export const AUTOCOMPLETE_MIN_CHARS = 3;

/** Maximum results shown in airport autocomplete dropdown */
export const AUTOCOMPLETE_MAX_RESULTS = 8;
