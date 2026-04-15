'use client';

/**
 * src/components/InputForm.tsx — Layer 1: User Input Form
 *
 * Zero math/business logic. Pure UI state and rendering.
 * All filtering uses only Array.filter + String methods — no domain math.
 */

import { useState, useMemo, useId } from 'react';
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
  isOvercast: false, // always clear — UI toggle removed
};

const WEIGHT_LABELS: Record<keyof UserPreferences['weights'], string> = {
  sunrise:   'Sunrise',
  sunset:    'Sunset',
  landscape: 'Landscape',
  avoidSun:  'Avoid Sun Glare',
};

// ── Date validation (pure — no domain math) ──────────────────────────────────

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns an error string if the YYYY-MM-DD string fails year / leap-year rules,
 * or null when the date is valid.
 */
function validateDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 1000) return 'Year must be 4 digits (1000 or later).';
  if (y > 3036) return 'Year cannot be later than 3036.';
  if (m === 2 && d === 29 && !isLeapYear(y))
    return `${y} is not a leap year — February 29 does not exist.`;
  return null;
}

/**
 * Convert a local departure datetime (date + time strings, no TZ info) to a
 * UTC ISO-8601 string using the origin airport's UTC offset.
 *
 * Strategy: parse as if UTC (the "anchor"), then subtract the offset to get true UTC.
 * Example: JFK local 08:00 (utcOffsetMin=-300) → UTC anchor 08:00 - (-300 min) = 13:00 UTC
 */
function toUTC(dateStr: string, timeStr: string, utcOffsetMin: number): string {
  const anchorMs = Date.parse(`${dateStr}T${timeStr}:00Z`);
  const utcMs    = anchorMs - utcOffsetMin * 60_000;
  const d        = new Date(utcMs);
  const pad      = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
  );
}

export default function InputForm({
  airports,
  onSubmit,
  isLoading = false,
}: InputFormProps) {
  // ── Airport selection ────────────────────────────────────────────────────
  const [originQuery,    setOriginQuery]    = useState('');
  const [destQuery,      setDestQuery]      = useState('');
  const [origin,         setOrigin]         = useState<AirportRecord | null>(null);
  const [destination,    setDestination]    = useState<AirportRecord | null>(null);
  const [showOriginDrop, setShowOriginDrop] = useState(false);
  const [showDestDrop,   setShowDestDrop]   = useState(false);
  // Keyboard navigation: index of the highlighted item (-1 = none)
  const [originActiveIdx, setOriginActiveIdx] = useState(-1);
  const [destActiveIdx,   setDestActiveIdx]   = useState(-1);

  // ── Departure (local time at origin) ─────────────────────────────────────
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('00:00');

  // ── Preferences ──────────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);

  // ── Validation touched state (show errors only after blur) ───────────────
  const [touched, setTouched] = useState({ origin: false, dest: false, date: false });

  // ── Stable IDs for ARIA listbox ───────────────────────────────────────────
  const originListId = useId();
  const destListId   = useId();

  // ── Autocomplete filtering ────────────────────────────────────────────────
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

  // ── Validation errors ─────────────────────────────────────────────────────
  const showOriginError  = touched.origin && !origin && originQuery !== '';
  const showDestError    = touched.dest   && !destination && destQuery !== '';
  const showSameAirport  = origin !== null && destination !== null && origin.iata === destination.iata;
  const showDateError    = touched.date   && departureDate === '';
  const dateFormatError  = validateDate(departureDate);
  const showDateFmtError = touched.date && dateFormatError !== null;

  // Future-date validation: departure must be ≥ 1 hour from now (in UTC)
  const depUtcMs = departureDate
    ? Date.parse(`${departureDate}T${departureTime}:00Z`) - (origin?.utcOffsetMin ?? 0) * 60_000
    : null;
  const isPastDeparture  = depUtcMs !== null && depUtcMs < Date.now() + 3_600_000;
  const showFutureError  = touched.date && isPastDeparture && departureDate !== '';

  // At least one preference weight must be non-zero
  const hasAnyWeight = Object.values(preferences.weights).some((w) => w !== 0);

  const canSubmit =
    origin !== null &&
    destination !== null &&
    origin.iata !== destination.iata &&
    departureDate !== '' &&
    dateFormatError === null &&
    !isPastDeparture &&
    hasAnyWeight &&
    !isLoading;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function selectOrigin(airport: AirportRecord) {
    setOrigin(airport);
    setOriginQuery(`${airport.iata} — ${airport.city}`);
    setShowOriginDrop(false);
    setOriginActiveIdx(-1);
  }

  function selectDestination(airport: AirportRecord) {
    setDestination(airport);
    setDestQuery(`${airport.iata} — ${airport.city}`);
    setShowDestDrop(false);
    setDestActiveIdx(-1);
  }

  function setWeight(key: keyof UserPreferences['weights'], value: number) {
    setPreferences((p) => ({ ...p, weights: { ...p.weights, [key]: value } }));
  }

  function handleOriginKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showOriginDrop || originResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOriginActiveIdx((i) => Math.min(i + 1, originResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOriginActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (originActiveIdx >= 0) selectOrigin(originResults[originActiveIdx]);
    } else if (e.key === 'Escape') {
      setShowOriginDrop(false);
      setOriginActiveIdx(-1);
    }
  }

  function handleDestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDestDrop || destResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestActiveIdx((i) => Math.min(i + 1, destResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (destActiveIdx >= 0) selectDestination(destResults[destActiveIdx]);
    } else if (e.key === 'Escape') {
      setShowDestDrop(false);
      setDestActiveIdx(-1);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const departureUTC = toUTC(departureDate, departureTime, origin!.utcOffsetMin);
    onSubmit({ origin: origin!, destination: destination!, departureUTC, preferences });
  }

  // ── Shared input class helper ─────────────────────────────────────────────
  function inputCls(hasError: boolean) {
    return `rounded-md bg-gray-800 border px-3 py-2 text-white placeholder-gray-500
      focus:outline-none focus:border-blue-400 w-full
      ${hasError ? 'border-red-500' : 'border-gray-600'}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-lg" noValidate>

      {/* Origin */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-sm font-medium text-gray-300">Origin airport</label>
        <input
          type="text"
          role="combobox"
          aria-expanded={showOriginDrop && originResults.length > 0}
          aria-controls={originListId}
          aria-activedescendant={
            originActiveIdx >= 0 ? `${originListId}-${originActiveIdx}` : undefined
          }
          aria-autocomplete="list"
          value={originQuery}
          onChange={(e) => {
            setOriginQuery(e.target.value);
            setOrigin(null);
            setShowOriginDrop(true);
            setOriginActiveIdx(-1);
          }}
          onFocus={() => setShowOriginDrop(true)}
          onBlur={() => {
            setTimeout(() => setShowOriginDrop(false), 150);
            setTouched((t) => ({ ...t, origin: true }));
          }}
          onKeyDown={handleOriginKeyDown}
          placeholder="JFK, London, Tokyo…"
          className={inputCls(showOriginError)}
          aria-label="Origin airport"
          autoComplete="off"
        />
        {showOriginError && (
          <p className="text-xs text-red-400 mt-0.5">
            Please select an airport from the dropdown list.
          </p>
        )}
        {showOriginDrop && originResults.length > 0 && (
          <ul
            id={originListId}
            role="listbox"
            className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-600 rounded-md z-10 max-h-48 overflow-y-auto"
          >
            {originResults.map((a, i) => (
              <li
                key={a.iata}
                id={`${originListId}-${i}`}
                role="option"
                aria-selected={i === originActiveIdx}
                onMouseDown={() => selectOrigin(a)}
                className={`px-3 py-2 cursor-pointer text-sm text-white ${
                  i === originActiveIdx ? 'bg-gray-600' : 'hover:bg-gray-700'
                }`}
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
        <label className="text-sm font-medium text-gray-300">Destination airport</label>
        <input
          type="text"
          role="combobox"
          aria-expanded={showDestDrop && destResults.length > 0}
          aria-controls={destListId}
          aria-activedescendant={
            destActiveIdx >= 0 ? `${destListId}-${destActiveIdx}` : undefined
          }
          aria-autocomplete="list"
          value={destQuery}
          onChange={(e) => {
            setDestQuery(e.target.value);
            setDestination(null);
            setShowDestDrop(true);
            setDestActiveIdx(-1);
          }}
          onFocus={() => setShowDestDrop(true)}
          onBlur={() => {
            setTimeout(() => setShowDestDrop(false), 150);
            setTouched((t) => ({ ...t, dest: true }));
          }}
          onKeyDown={handleDestKeyDown}
          placeholder="LHR, Paris, Sydney…"
          className={inputCls(showDestError || showSameAirport)}
          aria-label="Destination airport"
          autoComplete="off"
        />
        {showDestError && (
          <p className="text-xs text-red-400 mt-0.5">
            Please select an airport from the dropdown list.
          </p>
        )}
        {showSameAirport && (
          <p className="text-xs text-red-400 mt-0.5">
            Origin and destination cannot be the same airport.
          </p>
        )}
        {showDestDrop && destResults.length > 0 && (
          <ul
            id={destListId}
            role="listbox"
            className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-600 rounded-md z-10 max-h-48 overflow-y-auto"
          >
            {destResults.map((a, i) => (
              <li
                key={a.iata}
                id={`${destListId}-${i}`}
                role="option"
                aria-selected={i === destActiveIdx}
                onMouseDown={() => selectDestination(a)}
                className={`px-3 py-2 cursor-pointer text-sm text-white ${
                  i === destActiveIdx ? 'bg-gray-600' : 'hover:bg-gray-700'
                }`}
              >
                <span className="font-mono text-blue-400">{a.iata}</span>
                {' — '}
                {a.city}, {a.country}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Departure (local at origin) */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-300">
            Departure date{' '}
            <span className="text-gray-500">
              {origin ? `(local at ${origin.city})` : '(UTC)'}
            </span>
          </label>
          <input
            type="date"
            value={departureDate}
            min="1000-01-01"
            max="3036-12-31"
            onChange={(e) => setDepartureDate(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, date: true }))}
            className={inputCls(showDateError || showDateFmtError || showFutureError)}
            aria-label="Departure date"
          />
          {showDateError && (
            <p className="text-xs text-red-400 mt-0.5">
              Please select a departure date.
            </p>
          )}
          {showDateFmtError && (
            <p className="text-xs text-red-400 mt-0.5">
              {dateFormatError}
            </p>
          )}
          {showFutureError && (
            <p className="text-xs text-red-400 mt-0.5">
              Departure must be at least 1 hour from now.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 w-28">
          <label className="text-sm font-medium text-gray-300">
            Time{' '}
            <span className="text-gray-500">
              {origin ? `(${origin.city})` : '(UTC)'}
            </span>
          </label>
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
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-300">View preferences</p>
          <p className="text-xs text-gray-500">
            Positive — want to see it &nbsp;·&nbsp; 0 — don't care &nbsp;·&nbsp; Negative — want to avoid it
          </p>
        </div>
        {(Object.keys(WEIGHT_LABELS) as Array<keyof UserPreferences['weights']>).map((key) => (
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
        ))}

        {/* No-weight error */}
        {!hasAnyWeight && (
          <p className="text-xs text-red-400">
            At least one preference must have a non-zero weight.
          </p>
        )}

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
