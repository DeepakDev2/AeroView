'use client';

/**
 * src/components/EventSidePanel.tsx
 * Shows scored events alongside the animated map.
 * Highlights events near the current flight time. Zero logic.
 */

import type { ScoredEvent, WaypointData, SeatVerdict } from '@/types';

interface EventSidePanelProps {
  verdict: SeatVerdict;
  waypoints: WaypointData[];
  currentIndex: number;
}

const EVENT_ICON: Record<ScoredEvent['type'], string> = {
  sunrise:  '🌅',
  sunset:   '🌇',
  landmark: '📍',
  city:     '🏙️',
};

const SIDE_COLOR: Record<'left' | 'right', string> = {
  left:  'border-blue-500 bg-blue-500/10',
  right: 'border-indigo-400 bg-indigo-400/10',
};

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

export default function EventSidePanel({
  verdict,
  waypoints,
  currentIndex,
}: EventSidePanelProps) {
  const departureMs = waypoints[0]?.utcTime.getTime() ?? 0;
  const currentMs = (waypoints[currentIndex]?.utcTime.getTime() ?? departureMs) - departureMs;
  const currentMin = currentMs / 60000;

  const allEvents: ScoredEvent[] = [
    ...verdict.leftEvents,
    ...verdict.rightEvents,
  ].sort((a, b) => a.timeMinFromDeparture - b.timeMinFromDeparture);

  return (
    <div className="w-56 bg-gray-950 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Flight Events
        </p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 p-2">
        {allEvents.length === 0 ? (
          <p className="text-xs text-gray-500 italic p-2">No events detected</p>
        ) : (
          allEvents.map((ev, i) => {
            const diff = ev.timeMinFromDeparture - currentMin;
            const isPast = diff < -5;
            const isActive = Math.abs(diff) <= 5;
            const isUpcoming = diff > 5 && diff <= 30;

            return (
              <div
                key={i}
                data-testid="side-event"
                className={`
                  rounded-lg border px-2.5 py-2 transition-all duration-300
                  ${isActive
                    ? `${SIDE_COLOR[ev.side]} border-opacity-100 scale-[1.02] shadow-lg`
                    : isPast
                    ? 'border-gray-800 bg-gray-900/50 opacity-40'
                    : isUpcoming
                    ? 'border-gray-600 bg-gray-800/60'
                    : 'border-gray-700 bg-gray-900/30 opacity-60'}
                `}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">
                    {isPast ? '✓' : EVENT_ICON[ev.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {ev.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(ev.timeMinFromDeparture)}
                    </p>
                  </div>
                  {/* Side indicator */}
                  <span className={`text-xs shrink-0 font-bold ${ev.side === 'left' ? 'text-blue-400' : 'text-indigo-400'}`}>
                    {ev.side === 'left' ? '←' : '→'}
                  </span>
                </div>

                {/* Countdown for upcoming */}
                {isUpcoming && (
                  <p className="text-xs text-yellow-400 mt-1">
                    in {formatTime(diff)}
                  </p>
                )}

                {/* Active pulse */}
                {isActive && (
                  <p className={`text-xs mt-1 font-semibold ${ev.side === 'left' ? 'text-blue-300' : 'text-indigo-300'}`}>
                    NOW — look {ev.side}!
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
