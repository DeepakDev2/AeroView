'use client';

/**
 * src/components/SeatBadge.tsx — Prominent seat recommendation display.
 * Zero logic — pure rendering of pre-computed verdict values.
 */

import type { SeatVerdict } from '@/types';

interface SeatBadgeProps {
  winner: SeatVerdict['winner'];
  confidence: number;
  leftScore: number;
  rightScore: number;
}

const WINNER_CONFIG = {
  left:   { label: 'LEFT',   emoji: '←', bg: 'bg-blue-600',  text: 'text-white' },
  right:  { label: 'RIGHT',  emoji: '→', bg: 'bg-indigo-600', text: 'text-white' },
  either: { label: 'EITHER', emoji: '↔', bg: 'bg-gray-600',  text: 'text-white' },
};

export default function SeatBadge({
  winner,
  confidence,
  leftScore,
  rightScore,
}: SeatBadgeProps) {
  const cfg = WINNER_CONFIG[winner];
  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Main badge */}
      <div
        data-testid="seat-badge"
        className={`${cfg.bg} ${cfg.text} rounded-2xl px-8 py-5 text-center shadow-lg w-full max-w-xs`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
          Best seat side
        </p>
        <p className="text-5xl font-black tracking-tight">
          {cfg.emoji} {cfg.label}
        </p>
        {winner !== 'either' && (
          <p className="text-sm opacity-80 mt-2">
            {confidencePct}% confidence
          </p>
        )}
      </div>

      {/* Confidence bar */}
      {winner !== 'either' && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Left</span>
            <span>Right</span>
          </div>
          <div className="h-2 rounded-full bg-gray-700 overflow-hidden flex">
            <div
              className="bg-blue-500 h-full transition-all"
              style={{
                width: `${leftScore <= 0 && rightScore <= 0
                  ? 50
                  : (Math.max(leftScore, 0) / (Math.max(leftScore, 0) + Math.max(rightScore, 0))) * 100
                }%`,
              }}
            />
            <div className="bg-indigo-500 h-full flex-1" />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{leftScore.toFixed(1)}</span>
            <span>{rightScore.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}