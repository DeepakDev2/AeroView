/**
 * __tests__/InputForm.test.tsx — Phase 4 component tests
 *
 * @jest-environment jsdom
 *
 * 6 focused tests covering the critical interaction paths.
 * No snapshots. No implementation-detail coupling.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InputForm from '../src/components/InputForm';
import type { AirportRecord, FlightInput } from '../src/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AIRPORTS: AirportRecord[] = [
  {
    iata: 'JFK', name: 'John F. Kennedy International', city: 'New York',
    country: 'United States', lat: 40.64, lon: -73.78,
    timezone: 'America/New_York', utcOffsetMin: -300,
  },
  {
    iata: 'LHR', name: 'London Heathrow', city: 'London',
    country: 'United Kingdom', lat: 51.48, lon: -0.46,
    timezone: 'Europe/London', utcOffsetMin: 0,
  },
  {
    iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris',
    country: 'France', lat: 49.01, lon: 2.55,
    timezone: 'Europe/Paris', utcOffsetMin: 60,
  },
];

const noop = () => {};

// ── TC-P4-T1: Renders without crash ──────────────────────────────────────────

test('TC-P4-T1: renders without crash', () => {
  render(<InputForm airports={AIRPORTS} onSubmit={noop} />);
  expect(screen.getByLabelText('Origin airport')).toBeInTheDocument();
  expect(screen.getByLabelText('Destination airport')).toBeInTheDocument();
  expect(screen.getByLabelText('Departure date')).toBeInTheDocument();
});

// ── TC-P4-T2: Autocomplete hidden below AUTOCOMPLETE_MIN_CHARS ───────────────

test('TC-P4-T2: autocomplete dropdown hidden when query < 3 chars', () => {
  render(<InputForm airports={AIRPORTS} onSubmit={noop} />);
  fireEvent.change(screen.getByLabelText('Origin airport'), { target: { value: 'Lo' } });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

// ── TC-P4-T3: Autocomplete shows matches at 3+ chars ─────────────────────────

test('TC-P4-T3: autocomplete shows matching airports at 3+ chars', () => {
  render(<InputForm airports={AIRPORTS} onSubmit={noop} />);
  fireEvent.change(screen.getByLabelText('Origin airport'), { target: { value: 'Lon' } });
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  // 'London' matches LHR
  expect(screen.getByText(/LHR/)).toBeInTheDocument();
});

// ── TC-P4-T4: Selecting airport closes dropdown ───────────────────────────────

test('TC-P4-T4: selecting an airport from dropdown closes it', () => {
  render(<InputForm airports={AIRPORTS} onSubmit={noop} />);
  fireEvent.change(screen.getByLabelText('Origin airport'), { target: { value: 'Lon' } });
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByText(/LHR/));
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

// ── TC-P4-T5: Submit disabled until origin + destination + date set ───────────

test('TC-P4-T5: submit button disabled until all required fields are filled', () => {
  render(<InputForm airports={AIRPORTS} onSubmit={noop} />);
  const btn = screen.getByRole('button', { name: /find best seat/i });

  // Initially disabled
  expect(btn).toBeDisabled();

  // Select origin
  fireEvent.change(screen.getByLabelText('Origin airport'), { target: { value: 'New' } });
  fireEvent.mouseDown(screen.getByText(/JFK/));
  expect(btn).toBeDisabled();

  // Select destination
  fireEvent.change(screen.getByLabelText('Destination airport'), { target: { value: 'Lon' } });
  fireEvent.mouseDown(screen.getByText(/LHR/));
  expect(btn).toBeDisabled();

  // Set date — now should be enabled
  fireEvent.change(screen.getByLabelText('Departure date'), { target: { value: '2024-06-21' } });
  expect(btn).not.toBeDisabled();
});

// ── TC-P4-T6: onSubmit called with correct FlightInput shape ──────────────────

test('TC-P4-T6: onSubmit receives correct FlightInput on form submission', () => {
  const handleSubmit = jest.fn();
  render(<InputForm airports={AIRPORTS} onSubmit={handleSubmit} />);

  // Fill origin
  fireEvent.change(screen.getByLabelText('Origin airport'), { target: { value: 'New' } });
  fireEvent.mouseDown(screen.getByText(/JFK/));

  // Fill destination
  fireEvent.change(screen.getByLabelText('Destination airport'), { target: { value: 'Lon' } });
  fireEvent.mouseDown(screen.getByText(/LHR/));

  // Fill date
  fireEvent.change(screen.getByLabelText('Departure date'), { target: { value: '2024-06-21' } });

  // Submit
  fireEvent.click(screen.getByRole('button', { name: /find best seat/i }));

  expect(handleSubmit).toHaveBeenCalledTimes(1);
  const arg: FlightInput = handleSubmit.mock.calls[0][0];
  expect(arg.origin.iata).toBe('JFK');
  expect(arg.destination.iata).toBe('LHR');
  expect(arg.departureUTC).toBe('2024-06-21T00:00:00Z');
  expect(arg.preferences).toBeDefined();
  expect(typeof arg.preferences.weights.sunrise).toBe('number');
});