/**
 * __tests__/narrative.test.ts — Phase 6 API route tests
 *
 * testEnvironment: node (default) — no jsdom needed for route handlers.
 * @google/generative-ai is mocked throughout.
 */

import { POST } from '../src/app/api/narrative/route';

// ── Mock @google/generative-ai ────────────────────────────────────────────────

const mockGenerateContentStream = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContentStream: mockGenerateContentStream,
    }),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  origin: {
    iata: 'JFK', name: 'JFK', city: 'New York', country: 'US',
    lat: 40.64, lon: -73.78, timezone: 'America/New_York', utcOffsetMin: -300,
  },
  destination: {
    iata: 'LHR', name: 'LHR', city: 'London', country: 'UK',
    lat: 51.48, lon: -0.46, timezone: 'Europe/London', utcOffsetMin: 0,
  },
  departureUTC: '2024-06-21T08:00:00Z',
  verdict: {
    winner: 'left', confidence: 0.8,
    leftScore: 4, rightScore: 1,
    leftEvents: [
      { type: 'sunrise', name: 'Sunrise', side: 'left', timeMinFromDeparture: 45, solarElevDeg: 2, score: 2 },
    ],
    rightEvents: [],
    flightDurationMin: 370,
  },
};

// ── TC-P6-T1: 400 for malformed body ─────────────────────────────────────────

test('TC-P6-T1: POST returns 400 when body is missing required fields', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const res = await POST(makeRequest({ origin: 'JFK' })); // missing verdict, destination, departureUTC
  expect(res.status).toBe(400);
});

// ── TC-P6-T2: 400 for invalid JSON ────────────────────────────────────────────

test('TC-P6-T2: POST returns 400 when body is not valid JSON', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const req = new Request('http://localhost/api/narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

// ── TC-P6-T3: Calls generateContentStream ────────────────────────────────────

test('TC-P6-T3: POST calls generateContentStream and returns streaming response', async () => {
  process.env.GEMINI_API_KEY = 'test-key';

  // Mock a minimal async iterable stream
  async function* fakeStream() {
    yield { text: () => 'You will see ' };
    yield { text: () => 'a beautiful sunrise.' };
  }
  mockGenerateContentStream.mockResolvedValue({ stream: fakeStream() });

  const res = await POST(makeRequest(VALID_BODY));

  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toContain('text/plain');
  expect(mockGenerateContentStream).toHaveBeenCalledTimes(1);

  // Read the full stream
  const text = await res.text();
  expect(text).toBe('You will see a beautiful sunrise.');
});

// ── TC-P6-T4: 500 on missing API key ─────────────────────────────────────────

test('TC-P6-T4: POST returns 500 when GEMINI_API_KEY is not set', async () => {
  delete process.env.GEMINI_API_KEY;
  const res = await POST(makeRequest(VALID_BODY));
  expect(res.status).toBe(500);
  process.env.GEMINI_API_KEY = 'test-key'; // restore
});

// ── TC-P6-T5: 500 on Gemini SDK error ────────────────────────────────────────

test('TC-P6-T5: POST returns 500 when Gemini throws', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  mockGenerateContentStream.mockRejectedValue(new Error('Quota exceeded'));

  const res = await POST(makeRequest(VALID_BODY));
  expect(res.status).toBe(500);
  const body = await res.text();
  expect(body).toContain('Quota exceeded');
});