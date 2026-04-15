'use client';

/**
 * src/components/MapView.tsx — Layer 4A: Mapbox 3D Map Visualization
 *
 * Must be imported via next/dynamic with ssr:false — Mapbox requires browser DOM.
 * Contains animated plane, coloured route, event markers, time slider, event panel.
 */

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import TimeSlider from './TimeSlider';
import EventSidePanel from './EventSidePanel';
import { getSubSolarPoint, getNightPolygonCoords } from '@/lib/solar';
import type { WaypointData, AirportRecord, SeatVerdict, ScoredEvent } from '@/types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface MapViewProps {
  waypoints: WaypointData[];
  origin: AirportRecord;
  destination: AirportRecord;
  verdict: SeatVerdict;
  /** When true the component fills its parent height instead of using a fixed 450px. */
  fillHeight?: boolean;
}

// ── Route colour by solar elevation (night / twilight / day) ──────────────────

function elevToColor(elevDeg: number): string {
  if (elevDeg < -6) return '#1e3a5f';
  if (elevDeg < 0)  return '#f97316';
  return '#facc15';
}

// ── Verdict label ─────────────────────────────────────────────────────────────

function verdictLabel(winner: SeatVerdict['winner']): string {
  if (winner === 'left')  return '← Sit on the LEFT';
  if (winner === 'right') return 'Sit on the RIGHT →';
  return '↔ Either side';
}

// ── Event icon by type ────────────────────────────────────────────────────────

function eventIcon(type: ScoredEvent['type']): string {
  if (type === 'sunrise') return '🌅';
  if (type === 'sunset')  return '🌇';
  if (type === 'city')    return '🏙️';
  return '📍';
}

// ── Rich event popup HTML ─────────────────────────────────────────────────────

function buildEventPopupHTML(ev: ScoredEvent): string {
  const icon  = eventIcon(ev.type);
  const typeLabel =
    ev.type === 'sunrise'  ? 'Sunrise'
    : ev.type === 'sunset' ? 'Sunset'
    : ev.type === 'city'   ? 'City / Landmark'
    : 'Point of Interest';

  const h   = Math.floor(ev.timeMinFromDeparture / 60);
  const m   = Math.round(ev.timeMinFromDeparture % 60);
  const timeStr = h > 0 ? `T + ${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `T + ${m}m`;

  const sideLabel = ev.side === 'left' ? '← Left window' : 'Right window →';
  const seatLabel = ev.side === 'left' ? 'Seats A / B / C' : 'Seats J / K / L';
  const sideColor = ev.side === 'left' ? '#3b82f6' : '#818cf8';

  const elevStr   = `${ev.solarElevDeg > 0 ? '+' : ''}${ev.solarElevDeg.toFixed(1)}°`;
  const showElev  = ev.type === 'sunrise' || ev.type === 'sunset';

  const scorePct  = Math.min(100, Math.round((ev.score / 6) * 100)); // 6 = rough max score

  return `
    <div style="font-family:system-ui,sans-serif;min-width:190px;padding:2px 0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:20px;line-height:1">${icon}</span>
        <div>
          <div style="font-size:12px;font-weight:700;color:#0f172a;line-height:1.2">${ev.name}</div>
          <div style="font-size:10px;color:#64748b;margin-top:1px">${typeLabel}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;border-top:1px solid #e2e8f0;padding-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
          <span style="color:#64748b">Window</span>
          <span style="font-weight:700;color:${sideColor}">${sideLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
          <span style="color:#64748b">Seats</span>
          <span style="font-weight:600;color:#1e293b">${seatLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
          <span style="color:#64748b">Visible at</span>
          <span style="font-weight:600;color:#1e293b">${timeStr}</span>
        </div>
        ${showElev ? `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
          <span style="color:#64748b">Sun elevation</span>
          <span style="font-weight:600;color:#1e293b">${elevStr}</span>
        </div>` : ''}
        <div style="margin-top:2px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:3px">
            <span>View quality</span><span>${scorePct}%</span>
          </div>
          <div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${scorePct}%;background:${sideColor};border-radius:2px"></div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Find waypoint closest to an event's elapsed time ─────────────────────────

function waypointForEvent(ev: ScoredEvent, waypoints: WaypointData[]): WaypointData {
  const deptMs  = waypoints[0].utcTime.getTime();
  const targetMs = deptMs + ev.timeMinFromDeparture * 60_000;
  return waypoints.reduce((best, wp) =>
    Math.abs(wp.utcTime.getTime() - targetMs) <
    Math.abs(best.utcTime.getTime() - targetMs) ? wp : best
  );
}

// ── Dynamic fog / sky colours based on solar elevation ────────────────────────

type FogConfig = Parameters<mapboxgl.Map['setFog']>[0];

function fogForElev(elev: number): FogConfig {
  if (elev < -12) return {
    color: 'rgb(2,4,20)', 'high-color': 'rgb(5,15,50)',
    'horizon-blend': 0.04, 'space-color': 'rgb(0,0,10)', 'star-intensity': 0.95,
  };
  if (elev < -6) return {
    color: 'rgb(10,15,40)', 'high-color': 'rgb(20,40,100)',
    'horizon-blend': 0.05, 'space-color': 'rgb(2,6,23)', 'star-intensity': 0.65,
  };
  if (elev < 0) return {
    color: 'rgb(90,45,20)', 'high-color': 'rgb(210,100,30)',
    'horizon-blend': 0.07, 'space-color': 'rgb(2,6,23)', 'star-intensity': 0.2,
  };
  if (elev < 15) return {
    color: 'rgb(185,130,75)', 'high-color': 'rgb(100,155,225)',
    'horizon-blend': 0.06, 'space-color': 'rgb(2,6,23)', 'star-intensity': 0,
  };
  // Full day
  return {
    color: 'rgb(185,215,245)', 'high-color': 'rgb(75,145,230)',
    'horizon-blend': 0.04, 'space-color': 'rgb(2,6,23)', 'star-intensity': 0,
  };
}

// ── SVG airplane top-down view pointing north (up) ───────────────────────────
// Path anatomy (24×24 grid):
//   Nose tip    → (12, 1)
//   Wings       → span x=2..22 at y≈9–15  (swept back, wide)
//   Tail fins   → span x=10.5..13.5 at y≈15–21 (small horizontal stabilisers)

const PLANE_SVG = `<svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg"
  style="filter:drop-shadow(0 0 7px rgba(96,165,250,1));">
  <path d="M12,1 L13,9 L22,13 L13,15 L13.5,21 L12,20 L10.5,21 L11,15 L2,13 L11,9 Z"
        fill="#60a5fa" stroke="#bfdbfe" stroke-width="0.4"/>
</svg>`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapView({
  waypoints,
  origin,
  destination,
  verdict,
  fillHeight = false,
}: MapViewProps) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<mapboxgl.Map | null>(null);
  const planeRef           = useRef<mapboxgl.Marker | null>(null);
  const sunMarkerRef       = useRef<mapboxgl.Marker | null>(null);
  // Ref so the map 'rotate' event handler can read the latest index without
  // a stale closure (the handler is registered once inside the init useEffect)
  const currentIndexRef    = useRef(0);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [mapReady,      setMapReady]      = useState(false);
  const [isFullscreen,  setIsFullscreen]  = useState(false);

  const maxIndex = waypoints.length - 1;

  // ── Initialise map once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) { console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set'); return; }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [
        (origin.lon + destination.lon) / 2,
        (origin.lat + destination.lat) / 2,
      ],
      zoom: 3,
      pitch: 50,
      bearing: -10,
      antialias: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // ── 3-D terrain ──────────────────────────────────────────────────────
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Initial atmosphere based on departure solar elevation
      map.setFog(fogForElev(waypoints[0].solarElevDeg));

      // ── Night hemisphere (terminator fill) ───────────────────────────────
      map.addSource('night', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [getNightPolygonCoords(waypoints[0].utcTime)],
          },
          properties: {},
        },
      });
      map.addLayer({
        id: 'night-fill',
        type: 'fill',
        source: 'night',
        paint: {
          'fill-color': '#000d1a',
          'fill-opacity': 0.45,
        },
      });

      // ── Sun marker ────────────────────────────────────────────────────────
      const sunEl = document.createElement('div');
      sunEl.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg"
        style="filter:drop-shadow(0 0 5px rgba(251,191,36,0.8));">
        <circle cx="12" cy="12" r="5" fill="#fbbf24"/>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="2.5 2.5" opacity="0.65"/>
      </svg>`;
      sunEl.style.cssText = 'cursor: default; pointer-events: none;';

      const { lat: sunLat0, lon: sunLon0 } = getSubSolarPoint(waypoints[0].utcTime);
      const sunMarker = new mapboxgl.Marker({ element: sunEl, anchor: 'center' })
        .setLngLat([sunLon0, sunLat0])
        .addTo(map);
      sunMarkerRef.current = sunMarker;

      // ── Full coloured route (solar elevation per segment) ─────────────────
      const segmentFeatures = waypoints.slice(1).map((wp, i) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [waypoints[i].lon, waypoints[i].lat],
            [wp.lon, wp.lat],
          ],
        },
        properties: { color: elevToColor(waypoints[i].solarElevDeg) },
      }));

      map.addSource('segments', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: segmentFeatures },
      });
      map.addLayer({
        id: 'route-colored',
        type: 'line',
        source: 'segments',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.75,
        },
      });

      // ── Dashed overlay (unflown future path) ─────────────────────────────
      const routeCoords = waypoints.map((wp) => [wp.lon, wp.lat]);
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCoords },
          properties: {},
        },
      });
      map.addLayer({
        id: 'route-dashed',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#334155',
          'line-width': 1.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.45,
        },
      });

      // ── Flown path (bright glow — grows as plane advances) ────────────────
      map.addSource('flown', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[waypoints[0].lon, waypoints[0].lat]],
          },
          properties: {},
        },
      });
      map.addLayer({
        id: 'flown-glow',
        type: 'line',
        source: 'flown',
        paint: { 'line-color': '#60a5fa', 'line-width': 7, 'line-blur': 5, 'line-opacity': 0.45 },
      });
      map.addLayer({
        id: 'flown-core',
        type: 'line',
        source: 'flown',
        paint: { 'line-color': '#bfdbfe', 'line-width': 2.5, 'line-opacity': 0.95 },
      });

      // ── Origin marker ─────────────────────────────────────────────────────
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([origin.lon, origin.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${origin.iata}</strong> — ${origin.city}`
          )
        )
        .addTo(map);

      // ── Destination marker ────────────────────────────────────────────────
      new mapboxgl.Marker({ color: '#818cf8' })
        .setLngLat([destination.lon, destination.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${destination.iata}</strong> — ${destination.city}`
          )
        )
        .addTo(map);

      // ── Verdict event markers (scored left + right events) ────────────────
      const allEvents = [...verdict.leftEvents, ...verdict.rightEvents];
      allEvents.forEach((ev) => {
        const wp  = waypointForEvent(ev, waypoints);
        const el  = document.createElement('div');
        el.textContent = eventIcon(ev.type);
        el.style.cssText = `
          font-size: 18px;
          cursor: pointer;
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.9));
        `;
        new mapboxgl.Marker({ element: el })
          .setLngLat([wp.lon, wp.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 16, maxWidth: '240px' }).setHTML(
              buildEventPopupHTML(ev)
            )
          )
          .addTo(map);
      });

      // ── Plane marker ──────────────────────────────────────────────────────
      // Two-layer structure is required:
      //   planeOuter — Mapbox writes its own positioning transform here; never touch it
      //   planeInner — we write rotate() here only; Mapbox never touches this child
      const planeOuter = document.createElement('div');
      planeOuter.style.cssText = 'cursor: pointer;';

      const planeInner = document.createElement('div');
      planeInner.innerHTML = PLANE_SVG;
      planeInner.style.cssText = 'transform-origin: center; transition: transform 0.12s linear;';

      planeOuter.appendChild(planeInner);

      const planeMarker = new mapboxgl.Marker({ element: planeOuter, anchor: 'center' })
        .setLngLat([waypoints[0].lon, waypoints[0].lat])
        .addTo(map);
      planeRef.current = planeMarker;

      // ── Fit bounds ────────────────────────────────────────────────────────
      const bounds = new mapboxgl.LngLatBounds();
      waypoints.forEach((wp) => bounds.extend([wp.lon, wp.lat] as [number, number]));
      map.fitBounds(bounds, { padding: { top: 60, bottom: 80, left: 60, right: 60 } });

      // Keep plane aligned when user rotates the map manually
      map.on('rotate', () => {
        if (!planeRef.current) return;
        const wp    = waypoints[currentIndexRef.current];
        const inner = planeRef.current.getElement().firstElementChild as HTMLElement | null;
        if (inner) inner.style.transform = `rotate(${wp.bearingDeg - map.getBearing()}deg)`;
      });

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current   = null;
      planeRef.current = null;
      sunMarkerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update plane, flown path, and sky on index change ─────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !planeRef.current) return;
    const map = mapRef.current;
    const wp  = waypoints[currentIndex];

    // Keep ref in sync so the map 'rotate' handler always has the latest index
    currentIndexRef.current = currentIndex;

    // Move plane: setLngLat → Mapbox updates planeOuter.style.transform (position)
    planeRef.current.setLngLat([wp.lon, wp.lat]);

    // Rotate: subtract map.getBearing() so the SVG stays aligned with the route
    // regardless of how the user has rotated the map.
    // Target planeInner only — never overwrite planeOuter.style.transform (Mapbox owns it)
    const inner = planeRef.current.getElement().firstElementChild as HTMLElement | null;
    if (inner) inner.style.transform = `rotate(${wp.bearingDeg - map.getBearing()}deg)`;

    // Extend flown path
    const flownSource = map.getSource('flown') as mapboxgl.GeoJSONSource | undefined;
    flownSource?.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: waypoints.slice(0, currentIndex + 1).map((w) => [w.lon, w.lat]),
      },
      properties: {},
    });

    // Update sky / atmosphere for current solar position
    map.setFog(fogForElev(wp.solarElevDeg));

    // Update night terminator polygon
    const nightSource = map.getSource('night') as mapboxgl.GeoJSONSource | undefined;
    nightSource?.setData({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [getNightPolygonCoords(wp.utcTime)],
      },
      properties: {},
    });

    // Move sun marker to current sub-solar point
    if (sunMarkerRef.current) {
      const { lat: sunLat, lon: sunLon } = getSubSolarPoint(wp.utcTime);
      sunMarkerRef.current.setLngLat([sunLon, sunLat]);
    }
  }, [currentIndex, mapReady, waypoints]);

  // ── Auto-play animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(id);
  }, [isPlaying, maxIndex]);

  // ── Resize map when fullscreen toggles (Mapbox needs explicit resize call) ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const id = setTimeout(() => mapRef.current?.resize(), 50);
    return () => clearTimeout(id);
  }, [isFullscreen, mapReady]);

  // ── Escape key exits fullscreen ───────────────────────────────────────────
  useEffect(() => {
    if (!isFullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-black flex flex-col'
          : fillHeight
            ? 'h-full rounded-xl overflow-hidden flex flex-col'
            : 'w-full rounded-xl overflow-hidden flex flex-col'
      }
    >
      {/* Map + Events row */}
      <div className="flex" style={isFullscreen || fillHeight ? { flex: 1 } : { height: '450px' }}>
        {/* Mapbox container */}
        <div ref={containerRef} className="flex-1 relative">
          {/* Verdict badge */}
          <div
            data-testid="verdict-badge"
            className={`
              absolute top-3 left-1/2 -translate-x-1/2 z-10
              px-4 py-1.5 rounded-full text-xs font-bold shadow-xl backdrop-blur-sm
              ${verdict.winner === 'either'
                ? 'bg-gray-800/80 text-gray-200 border border-gray-600'
                : 'bg-blue-600/90 text-white border border-blue-400'}
            `}
          >
            {verdictLabel(verdict.winner)}
          </div>

          {/* Fullscreen toggle button */}
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="absolute bottom-3 right-3 z-10 bg-gray-900/80 hover:bg-gray-700 text-white rounded-md p-1.5 backdrop-blur-sm border border-gray-600 transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              /* Minimize — inward arrows */
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path d="M3 8h5V3H6v3H3V8zm0 4v2h3v3h2v-5H3zm12-4V3h-2v5h5V6h-3zm0 9v-3h3v-2h-5v5h2z"/>
              </svg>
            ) : (
              /* Maximize — outward arrows */
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path d="M1 1h6v2H3v4H1V1zm12 0h6v6h-2V3h-4V1zM1 13h2v4h4v2H1v-6zm16 4h-4v2h6v-6h-2v4z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Events side panel */}
        <EventSidePanel
          verdict={verdict}
          waypoints={waypoints}
          currentIndex={currentIndex}
        />
      </div>

      {/* Time slider */}
      <TimeSlider
        currentIndex={currentIndex}
        maxIndex={maxIndex}
        waypoints={waypoints}
        isPlaying={isPlaying}
        onChange={(i) => { setCurrentIndex(i); }}
        onPlayPause={() => {
          if (currentIndex >= maxIndex) setCurrentIndex(0);
          setIsPlaying((p) => !p);
        }}
      />
    </div>
  );
}
