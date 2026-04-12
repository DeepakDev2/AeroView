'use client';

/**
 * src/components/MapView.tsx — Layer 4A: Map Visualization
 *
 * Zero math/business logic. Pure rendering of pre-computed waypoint data.
 * Must be imported via next/dynamic with ssr:false — Leaflet requires browser DOM.
 */

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WaypointData, AirportRecord, SeatVerdict, POIRecord } from '@/types';

// ── Leaflet default-icon fix (webpack/Next.js breaks default asset URLs) ──────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// ── Props ─────────────────────────────────────────────────────────────────────

interface MapViewProps {
  waypoints: WaypointData[];
  origin: AirportRecord;
  destination: AirportRecord;
  verdict: SeatVerdict;
}

// ── UI helpers (presentation only — no domain constants) ──────────────────────

/** Maps solar elevation to a polyline colour. Pure UI decision. */
function elevToColor(elevDeg: number): string {
  if (elevDeg < -6) return '#1e3a5f'; // night  — dark blue
  if (elevDeg < 0) return '#e67e22';  // twilight — orange
  return '#f1c40f';                    // day     — yellow
}

type Segment = { positions: [number, number][]; color: string };

/**
 * Groups consecutive waypoints into colour segments for the polyline.
 * Adjacent waypoints with the same colour are merged into one Polyline
 * to minimise DOM elements.
 */
function buildSegments(waypoints: WaypointData[]): Segment[] {
  if (waypoints.length < 2) return [];
  const segments: Segment[] = [];
  let pos: [number, number][] = [[waypoints[0].lat, waypoints[0].lon]];
  let color = elevToColor(waypoints[0].solarElevDeg);

  for (let i = 1; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const c = elevToColor(wp.solarElevDeg);
    pos.push([wp.lat, wp.lon]);
    if (c !== color) {
      segments.push({ positions: [...pos], color });
      pos = [[wp.lat, wp.lon]];
      color = c;
    }
  }
  if (pos.length >= 2) segments.push({ positions: pos, color });
  return segments;
}

/** Deduplicates POIs across all waypoints by poi.id. */
function collectUniquePOIs(
  waypoints: WaypointData[]
): Array<{ poi: POIRecord; lat: number; lon: number }> {
  const seen = new Set<string>();
  const result: Array<{ poi: POIRecord; lat: number; lon: number }> = [];
  for (const wp of waypoints) {
    for (const pr of wp.nearbyPOIs) {
      if (!seen.has(pr.poi.id)) {
        seen.add(pr.poi.id);
        result.push({ poi: pr.poi, lat: pr.poi.lat, lon: pr.poi.lon });
      }
    }
  }
  return result;
}

// ── Custom divIcons ───────────────────────────────────────────────────────────

const makeIcon = (emoji: string) =>
  L.divIcon({
    html: `<span style="font-size:20px;line-height:1">${emoji}</span>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const ICON_ORIGIN      = makeIcon('🛫');
const ICON_DEST        = makeIcon('🛬');
const ICON_SUNRISE     = makeIcon('🌅');
const ICON_SUNSET      = makeIcon('🌇');
const ICON_POI         = makeIcon('📍');

// ── FitBounds — auto-zooms map to show full route ─────────────────────────────

function FitBounds({ waypoints }: { waypoints: WaypointData[] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map((wp) => [wp.lat, wp.lon]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, waypoints]);
  return null;
}

// ── Verdict badge label ───────────────────────────────────────────────────────

function verdictLabel(winner: SeatVerdict['winner']): string {
  if (winner === 'left') return '← Sit on the LEFT';
  if (winner === 'right') return 'Sit on the RIGHT →';
  return 'Either side is fine';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapView({
  waypoints,
  origin,
  destination,
  verdict,
}: MapViewProps) {
  const segments = buildSegments(waypoints);
  const pois = collectUniquePOIs(waypoints);
  const horizonWaypoints = waypoints.filter((wp) => wp.isHorizonEvent !== null);

  // Fallback center while waypoints load
  const center: [number, number] = [
    (origin.lat + destination.lat) / 2,
    (origin.lon + destination.lon) / 2,
  ];

  return (
    <div className="relative w-full h-full">
      {/* Verdict badge overlay */}
      <div
        data-testid="verdict-badge"
        className={`
          absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
          px-4 py-2 rounded-full text-sm font-semibold shadow-lg
          ${verdict.winner === 'either'
            ? 'bg-gray-700 text-gray-200'
            : 'bg-blue-600 text-white'}
        `}
      >
        {verdictLabel(verdict.winner)}
      </div>

      <MapContainer
        center={center}
        zoom={4}
        className="w-full h-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to route */}
        {waypoints.length > 0 && <FitBounds waypoints={waypoints} />}

        {/* Route polyline — coloured by solar elevation */}
        {segments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            pathOptions={{ color: seg.color, weight: 3, opacity: 0.85 }}
          />
        ))}

        {/* Origin marker */}
        <Marker position={[origin.lat, origin.lon]} icon={ICON_ORIGIN}>
          <Popup>
            <strong>{origin.iata}</strong> — {origin.name}
            <br />
            {origin.city}, {origin.country}
          </Popup>
        </Marker>

        {/* Destination marker */}
        <Marker position={[destination.lat, destination.lon]} icon={ICON_DEST}>
          <Popup>
            <strong>{destination.iata}</strong> — {destination.name}
            <br />
            {destination.city}, {destination.country}
          </Popup>
        </Marker>

        {/* Sunrise / sunset markers */}
        {horizonWaypoints.map((wp) => (
          <Marker
            key={`horizon-${wp.index}`}
            position={[wp.lat, wp.lon]}
            icon={wp.isHorizonEvent === 'sunrise' ? ICON_SUNRISE : ICON_SUNSET}
          >
            <Tooltip permanent={false}>
              {wp.isHorizonEvent === 'sunrise' ? 'Sunrise' : 'Sunset'}
            </Tooltip>
          </Marker>
        ))}

        {/* POI markers */}
        {pois.map(({ poi }) => (
          <Marker
            key={poi.id}
            position={[poi.lat, poi.lon]}
            icon={ICON_POI}
          >
            <Popup>
              <strong>{poi.name}</strong>
              <br />
              <span className="text-xs text-gray-500 capitalize">{poi.category}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}