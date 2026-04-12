'use client';

/**
 * src/components/EventList.tsx — Scored events for one side of the plane.
 * Zero logic — pure rendering of pre-computed ScoredEvent[].
 */

import type { ScoredEvent } from '@/types';

interface EventListProps {
  events: ScoredEvent[];
  side: 'left' | 'right';
}

const EVENT_ICON: Record<ScoredEvent['type'], string> = {
  sunrise:  '🌅',
  sunset:   '🌇',
  landmark: '📍',
  city:     '🏙️',
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function EventList({ events, side }: EventListProps) {
  const label = side === 'left' ? '← Left window' : 'Right window →';
  const accentColor = side === 'left' ? 'bg-blue-500' : 'bg-indigo-500';

  return (
    <div className="flex flex-col gap-2 w-full">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </h4>

      {events.length === 0 ? (
        <p data-testid="event-list-empty" className="text-sm text-gray-500 italic">
          No notable events on this side
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="event-list">
          {events.map((ev, i) => (
            <li
              key={i}
              data-testid="event-item"
              className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2"
            >
              <span className="text-xl">{EVENT_ICON[ev.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{ev.name}</p>
                <p className="text-xs text-gray-400">
                  {formatTime(ev.timeMinFromDeparture)} into flight
                </p>
              </div>
              {/* Score bar */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className={`${accentColor} h-full rounded-full`}
                    style={{ width: `${Math.min(ev.score * 20, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{ev.score.toFixed(1)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}