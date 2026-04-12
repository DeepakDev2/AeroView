'use client';

/**
 * src/components/NarrativeCard.tsx — Layer 4B client
 *
 * Fetches /api/narrative and renders the streaming Gemini response.
 * Zero business logic — pure UI state and streaming read.
 */

import { useEffect, useState } from 'react';
import type { SeatVerdict, AirportRecord } from '@/types';

interface NarrativeCardProps {
  verdict: SeatVerdict;
  origin: AirportRecord;
  destination: AirportRecord;
  departureUTC: string;
}

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export default function NarrativeCard({
  verdict,
  origin,
  destination,
  departureUTC,
}: NarrativeCardProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    let cancelled = false;

    async function fetchNarrative() {
      setStatus('loading');
      setText('');

      try {
        const res = await fetch('/api/narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verdict, origin, destination, departureUTC }),
        });

        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        setStatus('streaming');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) { reader.cancel(); break; }
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }

        if (!cancelled) setStatus('done');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setText(err instanceof Error ? err.message : 'Failed to load narrative');
        }
      }
    }

    fetchNarrative();
    return () => { cancelled = true; };
  }, [verdict, origin, destination, departureUTC]);

  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5 w-full">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Flight Narrative
      </h3>

      {status === 'loading' && (
        <div data-testid="narrative-loading" className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-pulse">●</span>
          <span>Generating narrative…</span>
        </div>
      )}

      {(status === 'streaming' || status === 'done') && (
        <p
          data-testid="narrative-text"
          className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap"
        >
          {text}
          {status === 'streaming' && (
            <span className="inline-block w-1 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
          )}
        </p>
      )}

      {status === 'error' && (
        <p data-testid="narrative-error" className="text-red-400 text-sm">
          {text}
        </p>
      )}
    </div>
  );
}