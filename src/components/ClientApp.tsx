'use client';

/**
 * src/components/ClientApp.tsx — Client-side orchestration.
 *
 * Manages the form → compute → result flow.
 * Calls pure lib functions (geodesic → solar → recommend) on form submit.
 * Zero rendering logic — delegates to InputForm and ResultScreen.
 */

import { useState } from 'react';
import InputForm from './InputForm';
import ResultScreen from './ResultScreen';
import { greatCircleWaypoints } from '@/lib/geodesic';
import { enrichWaypointsWithSolar } from '@/lib/solar';
import { computeVerdict } from '@/lib/recommend';
import type {
  AirportRecord,
  POIRecord,
  FlightInput,
  WaypointData,
  SeatVerdict,
} from '@/types';

interface ClientAppProps {
  airports: AirportRecord[];
  pois: POIRecord[];
}

type Phase = 'form' | 'computing' | 'result';

interface ResultState {
  input: FlightInput;
  waypoints: WaypointData[];
  verdict: SeatVerdict;
}

export default function ClientApp({ airports, pois }: ClientAppProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [result, setResult] = useState<ResultState | null>(null);

  function handleSubmit(input: FlightInput) {
    setPhase('computing');

    // Run pipeline — all pure functions, no async needed
    const raw = greatCircleWaypoints(
      input.origin,
      input.destination,
      input.departureUTC
    );
    const enriched = enrichWaypointsWithSolar(raw, pois);
    const verdict = computeVerdict(enriched, input.preferences);

    setResult({ input, waypoints: enriched, verdict });
    setPhase('result');
  }

  function handleReset() {
    setResult(null);
    setPhase('form');
  }

  if (phase === 'computing') {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
        <span className="animate-spin">⟳</span>
        <span>Analysing route…</span>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <ResultScreen
        input={result.input}
        waypoints={result.waypoints}
        verdict={result.verdict}
        onReset={handleReset}
      />
    );
  }

  return <InputForm airports={airports} onSubmit={handleSubmit} />;
}