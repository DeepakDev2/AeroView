'use client';

/**
 * src/components/ResultScreen.tsx — Layer 5: Result assembly.
 *
 * Assembles SeatBadge, EventList, WindowMockup, MapView, and NarrativeCard.
 * MapView is dynamically imported with ssr:false (Leaflet requires browser DOM).
 * Zero math/business logic.
 */

import dynamic from 'next/dynamic';
import SeatBadge from './SeatBadge';
import CabinDiagram from './CabinDiagram';
import EventList from './EventList';
import NarrativeCard from './NarrativeCard';
import type { FlightInput, WaypointData, SeatVerdict } from '@/types';

// Leaflet must not SSR
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-xl text-gray-400 text-sm">
      Loading map…
    </div>
  ),
});

interface ResultScreenProps {
  input: FlightInput;
  waypoints: WaypointData[];
  verdict: SeatVerdict;
  onReset: () => void;
}


/** Format total minutes as "6h 12m" (or "6h" when minutes are 0). */
function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Format a UTC ISO string as "Jun 21 2024 08:00 UTC". */
function formatDepartureUTC(iso: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d   = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export default function ResultScreen({
  input,
  waypoints,
  verdict,
  onReset,
}: ResultScreenProps) {
  const { origin, destination, departureUTC } = input;

  const durationMin = Math.round(
    (waypoints[waypoints.length - 1].utcTime.getTime() - waypoints[0].utcTime.getTime()) / 60_000
  );

  return (
    <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-gray-900">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3">
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">
            {origin.iata} → {destination.iata}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDuration(durationMin)} · {formatDepartureUTC(departureUTC)}
          </p>
        </div>
        <button
          data-testid="reset-button"
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-white transition-colors underline"
        >
          ← New search
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden gap-5 px-5 pb-5">

        {/* ── Left panel — Cabin Overview + Events + Narrative ────────────── */}
        <div className="w-[38%] flex-shrink-0 flex flex-col gap-5 overflow-y-auto
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-gray-700
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-gray-500">

          <SeatBadge
            winner={verdict.winner}
            confidence={verdict.confidence}
            leftScore={verdict.leftScore}
            rightScore={verdict.rightScore}
          />

          <CabinDiagram winner={verdict.winner} />

          <div className="grid grid-cols-2 gap-3">
            <EventList events={verdict.leftEvents} side="left" />
            <EventList events={verdict.rightEvents} side="right" />
          </div>

          <NarrativeCard
            verdict={verdict}
            origin={origin}
            destination={destination}
            departureUTC={departureUTC}
          />

        </div>

        {/* ── Right column — Map only ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <MapView
            waypoints={waypoints}
            origin={origin}
            destination={destination}
            verdict={verdict}
            fillHeight
          />
        </div>

      </div>
    </div>
  );
}