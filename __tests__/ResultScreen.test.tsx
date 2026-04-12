/**
 * __tests__/ResultScreen.test.tsx — Phase 7 component tests
 *
 * @jest-environment jsdom
 *
 * MapView (Leaflet) and NarrativeCard (fetch) are mocked.
 * 6 lean tests covering SeatBadge, EventList, and ResultScreen wiring.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SeatBadge from '../src/components/SeatBadge';
import EventList from '../src/components/EventList';
import ResultScreen from '../src/components/ResultScreen';
import type { ScoredEvent, SeatVerdict, FlightInput, WaypointData } from '../src/types';

// ── Mock MapView and NarrativeCard ────────────────────────────────────────────

jest.mock('../src/components/MapView', () => () => <div data-testid="map-view" />);
jest.mock('next/dynamic', () => (fn: () => Promise<{ default: React.ComponentType }>) => {
  // immediately resolve the dynamic import
  let Component: React.ComponentType = () => <div data-testid="map-view" />;
  fn().then((mod) => { Component = mod.default; });
  return Component;
});
jest.mock('../src/components/NarrativeCard', () => () => (
  <div data-testid="narrative-card" />
));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SUNRISE_EVENT: ScoredEvent = {
  type: 'sunrise', name: 'Sunrise', side: 'left',
  timeMinFromDeparture: 45, solarElevDeg: 3, score: 2,
};

const LANDMARK_EVENT: ScoredEvent = {
  type: 'landmark', name: 'Mont Blanc', side: 'right',
  timeMinFromDeparture: 180, solarElevDeg: 30, score: 1.5,
};

const LEFT_VERDICT: SeatVerdict = {
  winner: 'left', confidence: 0.8,
  leftScore: 4, rightScore: 1,
  leftEvents: [SUNRISE_EVENT], rightEvents: [LANDMARK_EVENT],
  flightDurationMin: 370,
};

const EITHER_VERDICT: SeatVerdict = {
  winner: 'either', confidence: 0.01,
  leftScore: 1, rightScore: 1,
  leftEvents: [], rightEvents: [],
  flightDurationMin: 370,
};

const JFK = {
  iata: 'JFK', name: 'JFK Int\'l', city: 'New York', country: 'US',
  lat: 40.64, lon: -73.78, timezone: 'America/New_York', utcOffsetMin: -300,
};
const LHR = {
  iata: 'LHR', name: 'Heathrow', city: 'London', country: 'UK',
  lat: 51.48, lon: -0.46, timezone: 'Europe/London', utcOffsetMin: 0,
};

const FLIGHT_INPUT: FlightInput = {
  origin: JFK, destination: LHR,
  departureUTC: '2024-06-21T08:00:00Z',
  preferences: { weights: { sunrise: 1, sunset: 1, landscape: 1, avoidSun: 0 }, isOvercast: false },
};

const WAYPOINTS: WaypointData[] = [{
  index: 0, lat: 40.64, lon: -73.78, bearingDeg: 50,
  cumulativeKm: 0, utcTime: new Date('2024-06-21T08:00:00Z'),
  solarAzimuthDeg: 90, solarElevDeg: 10, isHorizonEvent: null, nearbyPOIs: [],
}];

// ── TC-P7-T1: SeatBadge — renders LEFT ───────────────────────────────────────

test('TC-P7-T1: SeatBadge renders "LEFT" when winner is left', () => {
  render(
    <SeatBadge winner="left" confidence={0.8} leftScore={4} rightScore={1} />
  );
  expect(screen.getByTestId('seat-badge')).toHaveTextContent(/left/i);
});

// ── TC-P7-T2: SeatBadge — renders EITHER ─────────────────────────────────────

test('TC-P7-T2: SeatBadge renders "EITHER" when winner is either', () => {
  render(
    <SeatBadge winner="either" confidence={0} leftScore={1} rightScore={1} />
  );
  expect(screen.getByTestId('seat-badge')).toHaveTextContent(/either/i);
});

// ── TC-P7-T3: EventList — renders correct event count ────────────────────────

test('TC-P7-T3: EventList renders correct number of event rows', () => {
  render(<EventList events={[SUNRISE_EVENT, LANDMARK_EVENT]} side="left" />);
  expect(screen.getAllByTestId('event-item')).toHaveLength(2);
});

// ── TC-P7-T4: EventList — empty state ────────────────────────────────────────

test('TC-P7-T4: EventList shows empty state when no events', () => {
  render(<EventList events={[]} side="right" />);
  expect(screen.getByTestId('event-list-empty')).toBeInTheDocument();
  expect(screen.queryByTestId('event-item')).not.toBeInTheDocument();
});

// ── TC-P7-T5: ResultScreen — renders SeatBadge and both EventLists ────────────

test('TC-P7-T5: ResultScreen renders SeatBadge and both EventLists', () => {
  render(
    <ResultScreen
      input={FLIGHT_INPUT}
      waypoints={WAYPOINTS}
      verdict={LEFT_VERDICT}
      onReset={() => {}}
    />
  );
  expect(screen.getByTestId('seat-badge')).toBeInTheDocument();
  // left has 1 event, right has 1 event
  expect(screen.getAllByTestId('event-item')).toHaveLength(2);
  // route header
  expect(screen.getByText(/JFK.*LHR/)).toBeInTheDocument();
});

// ── TC-P7-T6: ResultScreen — onReset called on button click ──────────────────

test('TC-P7-T6: ResultScreen calls onReset when reset button is clicked', () => {
  const onReset = jest.fn();
  render(
    <ResultScreen
      input={FLIGHT_INPUT}
      waypoints={WAYPOINTS}
      verdict={EITHER_VERDICT}
      onReset={onReset}
    />
  );
  fireEvent.click(screen.getByTestId('reset-button'));
  expect(onReset).toHaveBeenCalledTimes(1);
});