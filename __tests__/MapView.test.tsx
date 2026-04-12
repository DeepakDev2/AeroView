/**
 * __tests__/MapView.test.tsx — Phase 5 component tests
 *
 * @jest-environment jsdom
 *
 * react-leaflet and leaflet are mocked — Leaflet requires real browser APIs
 * that jsdom cannot provide. Tests cover prop-wiring only.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { WaypointData, AirportRecord, SeatVerdict } from '../src/types';

// ── Mock react-leaflet ────────────────────────────────────────────────────────

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Polyline: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useMap: () => ({ fitBounds: jest.fn() }),
}));

// ── Mock leaflet ──────────────────────────────────────────────────────────────

jest.mock('leaflet', () => ({
  Icon: { Default: { prototype: {}, mergeOptions: jest.fn() } },
  divIcon: () => ({}),
  latLngBounds: () => ({}),
}));

// ── Mock leaflet CSS ──────────────────────────────────────────────────────────

jest.mock('leaflet/dist/leaflet.css', () => {});

// ── Mock leaflet marker images ────────────────────────────────────────────────

jest.mock('leaflet/dist/images/marker-icon-2x.png', () => '');
jest.mock('leaflet/dist/images/marker-icon.png', () => '');
jest.mock('leaflet/dist/images/marker-shadow.png', () => '');

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

// ── TC-P5-T1: Renders map container without crash ─────────────────────────────

test('TC-P5-T1: renders map container without crash', () => {
  render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={LEFT_VERDICT}
    />
  );
  expect(screen.getByTestId('map-container')).toBeInTheDocument();
});

// ── TC-P5-T2: Origin and destination labels rendered ─────────────────────────

test('TC-P5-T2: origin and destination airport names appear in popups', () => {
  render(
    <MapView
      waypoints={[makeWaypoint(0), makeWaypoint(1)]}
      origin={JFK}
      destination={LHR}
      verdict={LEFT_VERDICT}
    />
  );
  expect(screen.getByText(/JFK/)).toBeInTheDocument();
  expect(screen.getByText(/LHR/)).toBeInTheDocument();
});

// ── TC-P5-T3: Horizon event markers rendered ──────────────────────────────────

test('TC-P5-T3: sunrise and sunset labels rendered for horizon event waypoints', () => {
  const waypoints = [
    makeWaypoint(0),
    makeWaypoint(1, 'sunrise'),
    makeWaypoint(2),
    makeWaypoint(3, 'sunset'),
  ];
  render(
    <MapView waypoints={waypoints} origin={JFK} destination={LHR} verdict={LEFT_VERDICT} />
  );
  expect(screen.getByText('Sunrise')).toBeInTheDocument();
  expect(screen.getByText('Sunset')).toBeInTheDocument();
});

// ── TC-P5-T4: Verdict badge shows correct winner ──────────────────────────────

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