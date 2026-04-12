/**
 * src/app/api/narrative/route.ts — Layer 4B: LLM Narrative API Route
 *
 * Server-only. GEMINI_API_KEY never leaves this file.
 * Streams Gemini text back to the client as plain text chunks.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SeatVerdict, AirportRecord } from '@/types';

const MODEL = 'gemini-2.5-flash';

// ── Request shape ─────────────────────────────────────────────────────────────

interface NarrativeRequest {
  verdict: SeatVerdict;
  origin: AirportRecord;
  destination: AirportRecord;
  departureUTC: string;
}

function isValidRequest(body: unknown): body is NarrativeRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    b.verdict !== undefined &&
    b.origin !== undefined &&
    b.destination !== undefined &&
    typeof b.departureUTC === 'string'
  );
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(req: NarrativeRequest): string {
  const { verdict, origin, destination, departureUTC } = req;

  const sideLabel =
    verdict.winner === 'either' ? 'either side' : `the ${verdict.winner} side`;

  const winningEvents =
    verdict.winner === 'left'
      ? verdict.leftEvents
      : verdict.winner === 'right'
      ? verdict.rightEvents
      : [...verdict.leftEvents, ...verdict.rightEvents];

  const eventLines =
    winningEvents.length > 0
      ? winningEvents
          .slice(0, 5)
          .map(
            (e) =>
              `- ${e.type} "${e.name}" at ${Math.round(e.timeMinFromDeparture)} min into flight`
          )
          .join('\n')
      : '- No major events detected';

  const departureLabel = new Date(departureUTC).toUTCString();

  return `You are AeroView, a flight experience narrator. Write a vivid 2-paragraph description (under 120 words total) for a passenger on ${origin.iata} → ${destination.iata} departing ${departureLabel}.

Seat recommendation: ${sideLabel} (${Math.round(verdict.confidence * 100)}% confidence).
Flight duration: ${Math.round(verdict.flightDurationMin)} minutes.

Key events visible from the recommended side:
${eventLines}

Write in second person ("you will see..."). Be specific and engaging. Mention exact timings. Keep it under 120 words.`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response('GEMINI_API_KEY not configured', { status: 500 });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!isValidRequest(body)) {
    return new Response('Missing required fields: verdict, origin, destination, departureUTC', {
      status: 400,
    });
  }

  // Build prompt and stream Gemini response
  const prompt = buildPrompt(body);
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: MODEL });

  try {
    const geminiStream = await model.generateContentStream(prompt);

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gemini error';
    return new Response(`Gemini error: ${msg}`, { status: 500 });
  }
}