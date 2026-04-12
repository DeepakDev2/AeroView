/**
 * __tests__/MapView.test.tsx — Phase 5 component tests (Mapbox GL JS)
 *
 * @jest-environment jsdom
 *
 * mapbox-gl is mocked — it requires a real browser WebGL context that jsdom
 * cannot provide. Tests cover React-rendered output only (verdict badge,
 * EventSidePanel events, TimeSlider controls).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { WaypointData, AirportRecord, SeatVerdict, ScoredEvent } from '../src/types';

// ── Mock mapbox-gl ────────────────────────────────────────────────────────────

jest.mock('mapbox-gl', () => {
  const addTo = jest.fn().mockReturnThis();
  const setPopup = jest.fn().mockReturnThis();
  const setLngLat = jest.fn().mockReturnThis();
  const getElement = jest.fn().mockReturnValue({ style: {} });

  const MockMarker = jest.fn().mockImplementation(() => ({
    addTo,
    setLngLat,
    setPopup,
    getElement,
  }));

  const MockPopup = jest.fn().mockImplementation(() => ({
    setHTML: jest.fn().mockReturnThis(),
  }));

  const MockMap = jest.fn().mockImplementation(() => ({
    addControl: jest.fn(),
    on: jest.fn(),         // 'load' callback never fires — that's fine
    remove: jest.fn(),
    getSource: jest.fn().mockReturnValue({ setData: jest.fn() }),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    setTerrain: jest.fn(),
    setFog: jest.fn(),
    fitBounds: jest.fn(),
  }));

  return {
    __esModule: true,
    default: {
      accessToken: '',
      Map: MockMap,
      Marker: MockMarker,
      Popup: MockPopup,
      NavigationControl: jest.fn(),
      LngLatBounds: jest.fn().mockImplementation(() => ({ extend: jest.fn() })),
    },
  };
});

jest.mock('mapbox-gl/dist/mapbox-gl.css', () => {});

// ── Import component AFTER mocks ──────────────────────────────────────────────

import MapView from '../src/components/MapView';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const JFK: AirportRecord = {
  iata: 'JFK', name: 'John F. Kennedy International', city: 'New York',
  country: 'United States', lat: 40.64, lon: -73.78,
  timezone: 'America/New_York', utcOffsetMin: -300,
};

const LHR: AirportRecord = {
  iata: 'LHR', name: 'London Heathrow', city: 'London',
  country: 'United Kingdom', lat: 51.48, lon: -0.46,
  timezone: 'Europe/London', utcOffsetMin: 0,
};

function makeWaypoint(
  index: number,
  isHorizonEvent: WaypointData['isHorizonEvent'] = null
): WaypointData {
  return {
    index,
    lat: 45 + index,
    lon: -50 + index,
    bearingDeg: 50,
    cumulativeKm: index * 50,
    utcTime: new Date('2024-06-21T08:00:00Z'),
    solarAzimuthDeg: 180,
    solarElevDeg: 10,
    isHorizonEvent,
    nearbyPOIs: [],
  };
}

function makeScoredEvent(
  name: string,
  side: 'left' | 'right',
  timeMin: number
): ScoredEvent {
  return {
    type: 'landmark',
    name,
    side,
    score: 1,
    timeMinFromDeparture: timeMin,
    solarElevDeg: 10,
  };
}

const LEFT_VERDICT: SeatVerdict = {
  winner: 'left', confidence: 0.8,
  leftScore: 4, rightScore: 1,
  leftEvents: [], rightEvents: [],
  flightDurationMin: 370,
};

const EITHER_VERDICT: SeatVerdict = {
  winner: 'either', confidence: 0.02,
  leftScore: 1, rightScore: 1,
  leftEvents: [], rightEvents: [],
  flightDurationMin: 370,
};

const EVENTS_VERDICT: SeatVerdict = {
  winner: 'left', confidence: 0.9,
  leftScore: 5, rightScore: 1,
  leftEvents: [
    makeScoredEvent('Alps', 'left', 200),
  ],
  rightEvents: [
    makeScoredEvent('Atlantic', 'right', 60),
  ],
  flightDurationMin: 370,
};

// ── TC-P5-T1: Renders without crash ──────────────────────────────────────────

test('TC-P5-T1: renders map shell without crash', () => {
  const { container } = render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={LEFT_VERDICT}
    />
  );
  // Outer wrapper div always renders
  expect(container.firstChild).not.toBeNull();
});

// ── TC-P5-T2: EventSidePanel renders flight events header ─────────────────────

test('TC-P5-T2: EventSidePanel "Flight Events" header is rendered', () => {
  render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={LEFT_VERDICT}
    />
  );
  expect(screen.getByText(/Flight Events/i)).toBeInTheDocument();
});

// ── TC-P5-T3: EventSidePanel lists scored events ──────────────────────────────

test('TC-P5-T3: EventSidePanel lists events from both sides', () => {
  const waypoints = [
    makeWaypoint(0),
    makeWaypoint(1),
  ];
  render(
    <MapView waypoints={waypoints} origin={JFK} destination={LHR} verdict={EVENTS_VERDICT} />
  );
  expect(screen.getByText('Alps')).toBeInTheDocument();
  expect(screen.getByText('Atlantic')).toBeInTheDocument();
});

// ── TC-P5-T4: Verdict badge correct winner ────────────────────────────────────

test('TC-P5-T4: verdict badge shows correct side for left winner', () => {
  render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={LEFT_VERDICT}
    />
  );
  expect(screen.getByTestId('verdict-badge')).toHaveTextContent(/left/i);
});

test('TC-P5-T4b: verdict badge shows "either" when winner is either', () => {
  render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={EITHER_VERDICT}
    />
  );
  expect(screen.getByTestId('verdict-badge')).toHaveTextContent(/either/i);
});

// ── TC-P5-T5: TimeSlider play button is rendered ──────────────────────────────

test('TC-P5-T5: TimeSlider play button is present', () => {
  render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={LEFT_VERDICT}
    />
  );
  expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
});
