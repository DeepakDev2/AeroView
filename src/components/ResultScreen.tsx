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
import WindowMockup from './WindowMockup';
import NarrativeCard from './NarrativeCard';
import type { FlightInput, WaypointData, SeatVerdict, ScoredEvent } from '@/types';

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

function topEvent(events: ScoredEvent[]): ScoredEvent | null {
  if (events.length === 0) return null;
  return events.reduce((best, ev) => (ev.score > best.score ? ev : best));
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
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">

      {/* Header — recap bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
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

      {/* Seat badge */}
      <SeatBadge
        winner={verdict.winner}
        confidence={verdict.confidence}
        leftScore={verdict.leftScore}
        rightScore={verdict.rightScore}
      />

      {/* Cabin overhead diagram */}
      <CabinDiagram winner={verdict.winner} />

      {/* Window mockups */}
      <div className="flex justify-center gap-12">
        <WindowMockup
          side={verdict.winner === 'left' ? 'left' : 'either'}
          topEvent={topEvent(verdict.leftEvents)}
        />
        <WindowMockup
          side={verdict.winner === 'right' ? 'right' : 'either'}
          topEvent={topEvent(verdict.rightEvents)}
        />
      </div>

      {/* Event lists */}
      <div className="grid grid-cols-2 gap-4">
        <EventList events={verdict.leftEvents} side="left" />
        <EventList events={verdict.rightEvents} side="right" />
      </div>

      {/* Map — MapView is self-contained with its own height */}
      <MapView
        waypoints={waypoints}
        origin={origin}
        destination={destination}
        verdict={verdict}
      />

      {/* LLM Narrative */}
      <NarrativeCard
        verdict={verdict}
        origin={origin}
        destination={destination}
        departureUTC={departureUTC}
      />

    </div>
  );
}