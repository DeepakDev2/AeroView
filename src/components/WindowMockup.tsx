'use client';

/**
 * src/components/WindowMockup.tsx — Airplane window illustration.
 * Pure CSS/SVG. Zero logic.
 */

import type { SeatVerdict, ScoredEvent } from '@/types';

interface WindowMockupProps {
  side: SeatVerdict['winner'];
  topEvent: ScoredEvent | null;
}

const EVENT_ICON: Record<ScoredEvent['type'], string> = {
  sunrise:  '🌅',
  sunset:   '🌇',
  landmark: '📍',
  city:     '🏙️',
};

export default function WindowMockup({ side, topEvent }: WindowMockupProps) {
  const isHighlighted = side !== 'either';
  const label = side === 'left' ? 'Left' : side === 'right' ? 'Right' : 'Either';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Window frame */}
      <div
        data-testid="window-mockup"
        className={`
          relative w-24 h-32 rounded-[40%_40%_35%_35%/50%_50%_40%_40%]
          border-4 flex items-center justify-center
          transition-all duration-300
          ${isHighlighted
            ? 'border-blue-400 bg-gradient-to-b from-sky-300 to-blue-500 shadow-lg shadow-blue-500/40'
            : 'border-gray-600 bg-gray-800 opacity-50'}
        `}
      >
        {/* Top event inside window */}
        {topEvent && isHighlighted ? (
          <div className="flex flex-col items-center gap-1 text-center px-2">
            <span className="text-2xl">{EVENT_ICON[topEvent.type]}</span>
            <span className="text-white text-xs font-medium leading-tight line-clamp-2">
              {topEvent.name}
            </span>
          </div>
        ) : (
          <span className="text-gray-500 text-3xl">✈</span>
        )}
      </div>

      <span className="text-xs text-gray-400 font-medium">{label} side</span>
    </div>
  );
}