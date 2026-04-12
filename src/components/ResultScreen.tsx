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

export default function ResultScreen({
  input,
  waypoints,
  verdict,
  onReset,
}: ResultScreenProps) {
  const { origin, destination, departureUTC } = input;
  const winningEvents =
    verdict.winner === 'left'
      ? verdict.leftEvents
      : verdict.winner === 'right'
      ? verdict.rightEvents
      : [...verdict.leftEvents, ...verdict.rightEvents];

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {origin.iata} → {destination.iata}
        </h2>
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

      {/* Map */}
      <div className="w-full h-72 rounded-xl overflow-hidden">
        <MapView
          waypoints={waypoints}
          origin={origin}
          destination={destination}
          verdict={verdict}
        />
      </div>

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