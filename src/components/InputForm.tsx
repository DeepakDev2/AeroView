'use client';

/**
 * src/components/InputForm.tsx — Layer 1: User Input Form
 *
 * Zero math/business logic. Pure UI state and rendering.
 * All filtering uses only Array.filter + String methods — no domain math.
 */

import { useState, useMemo } from 'react';
import type { AirportRecord, FlightInput, UserPreferences } from '@/types';
import {
  AUTOCOMPLETE_MIN_CHARS,
  AUTOCOMPLETE_MAX_RESULTS,
  MAX_WEIGHT,
  MIN_WEIGHT,
} from '@/lib/constants';

interface InputFormProps {
  airports: AirportRecord[];
  onSubmit: (input: FlightInput) => void;
  isLoading?: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  weights: { sunrise: 1, sunset: 1, landscape: 1, avoidSun: 0 },
  isOvercast: false,
};

const WEIGHT_LABELS: Record<keyof UserPreferences['weights'], string> = {
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  landscape: 'Landscape',
  avoidSun: 'Avoid Sun Glare',
};

export default function InputForm({
  airports,
  onSubmit,
  isLoading = false,
}: InputFormProps) {
  // ── Airport selection ────────────────────────────────────────────────────
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [origin, setOrigin] = useState<AirportRecord | null>(null);
  const [destination, setDestination] = useState<AirportRecord | null>(null);
  const [showOriginDrop, setShowOriginDrop] = useState(false);
  const [showDestDrop, setShowDestDrop] = useState(false);

  // ── Departure UTC ────────────────────────────────────────────────────────
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('00:00');

  // ── Preferences ──────────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);

  // ── Autocomplete filtering (no domain math) ───────────────────────────────
  const originResults = useMemo(() => {
    if (originQuery.length < AUTOCOMPLETE_MIN_CHARS) return [];
    const q = originQuery.toLowerCase();
    return airports
      .filter(
        (a) =>
          a.iata.toLowerCase().startsWith(q) ||
          a.city.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      )
      .slice(0, AUTOCOMPLETE_MAX_RESULTS);
  }, [originQuery, airports]);

  const destResults = useMemo(() => {
    if (destQuery.length < AUTOCOMPLETE_MIN_CHARS) return [];
    const q = destQuery.toLowerCase();
    return airports
      .filter(
        (a) =>
          a.iata.toLowerCase().startsWith(q) ||
          a.city.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      )
      .slice(0, AUTOCOMPLETE_MAX_RESULTS);
  }, [destQuery, airports]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const canSubmit =
    origin !== null && destination !== null && departureDate !== '' && !isLoading;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function selectOrigin(airport: AirportRecord) {
    setOrigin(airport);
    setOriginQuery(`${airport.iata} — ${airport.city}`);
    setShowOriginDrop(false);
  }

  function selectDestination(airport: AirportRecord) {
    setDestination(airport);
    setDestQuery(`${airport.iata} — ${airport.city}`);
    setShowDestDrop(false);
  }

  function setWeight(key: keyof UserPreferences['weights'], value: number) {
    setPreferences((p) => ({ ...p, weights: { ...p.weights, [key]: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) return;
    const departureUTC = `${departureDate}T${departureTime}:00Z`;
    onSubmit({ origin, destination, departureUTC, preferences });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-lg">

      {/* Origin */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-sm font-medium text-gray-300">Origin</label>
        <input
          type="text"
          value={originQuery}
          onChange={(e) => {
            setOriginQuery(e.target.value);
            setOrigin(null);
            setShowOriginDrop(true);
          }}
          onFocus={() => setShowOriginDrop(true)}
          placeholder="JFK, London, Tokyo…"
          className="rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          aria-label="Origin airport"
          autoComplete="off"
        />
        {showOriginDrop && originResults.length > 0 && (
          <ul
            role="listbox"
            className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-600 rounded-md z-10 max-h-48 overflow-y-auto"
          >
            {originResults.map((a) => (
              <li
                key={a.iata}
                role="option"
                aria-selected={false}
                onMouseDown={() => selectOrigin(a)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-700 text-sm text-white"
              >
                <span className="font-mono text-blue-400">{a.iata}</span>
                {' — '}
                {a.city}, {a.country}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Destination */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-sm font-medium text-gray-300">Destination</label>
        <input
          type="text"
          value={destQuery}
          onChange={(e) => {
            setDestQuery(e.target.value);
            setDestination(null);
            setShowDestDrop(true);
          }}
          onFocus={() => setShowDestDrop(true)}
          placeholder="LHR, Paris, Sydney…"
          className="rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          aria-label="Destination airport"
          autoComplete="off"
        />
        {showDestDrop && destResults.length > 0 && (
          <ul
            role="listbox"
            className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-600 rounded-md z-10 max-h-48 overflow-y-auto"
          >
            {destResults.map((a) => (
              <li
                key={a.iata}
                role="option"
                aria-selected={false}
                onMouseDown={() => selectDestination(a)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-700 text-sm text-white"
              >
                <span className="font-mono text-blue-400">{a.iata}</span>
                {' — '}
                {a.city}, {a.country}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Departure UTC */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-300">Departure date (UTC)</label>
          <input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-white focus:outline-none focus:border-blue-400"
            aria-label="Departure date"
          />
        </div>
        <div className="flex flex-col gap-1 w-28">
          <label className="text-sm font-medium text-gray-300">Time (UTC)</label>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-white focus:outline-none focus:border-blue-400"
            aria-label="Departure time"
          />
        </div>
      </div>

      {/* Preference sliders */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-300">View preferences</p>
        {(Object.keys(WEIGHT_LABELS) as Array<keyof UserPreferences['weights']>).map(
          (key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-32">{WEIGHT_LABELS[key]}</span>
              <input
                type="range"
                min={MIN_WEIGHT}
                max={MAX_WEIGHT}
                step={1}
                value={preferences.weights[key]}
                onChange={(e) => setWeight(key, Number(e.target.value))}
                className="flex-1 accent-blue-400"
                aria-label={`${WEIGHT_LABELS[key]} weight`}
              />
              <span className="text-sm text-white w-4 text-right">
                {preferences.weights[key]}
              </span>
            </div>
          )
        )}

        {/* Overcast toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.isOvercast}
            onChange={(e) =>
              setPreferences((p) => ({ ...p, isOvercast: e.target.checked }))
            }
            className="w-4 h-4 accent-blue-400"
            aria-label="Overcast sky"
          />
          <span className="text-sm text-gray-400">Overcast sky (reduces visibility scores)</span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 transition-colors"
      >
        {isLoading ? 'Analysing…' : 'Find best seat'}
      </button>
    </form>
  );
}