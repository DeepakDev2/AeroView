'use client';

/**
 * src/components/TimeSlider.tsx
 * Scrubbar + play/pause for the animated flight route.
 * Zero logic — pure UI controls.
 */

import type { WaypointData } from '@/types';

interface TimeSliderProps {
  currentIndex: number;
  maxIndex: number;
  waypoints: WaypointData[];
  isPlaying: boolean;
  onChange: (index: number) => void;
  onPlayPause: () => void;
}

function formatElapsed(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

export default function TimeSlider({
  currentIndex,
  maxIndex,
  waypoints,
  isPlaying,
  onChange,
  onPlayPause,
}: TimeSliderProps) {
  const departureMs = waypoints[0]?.utcTime.getTime() ?? 0;
  const currentMs = (waypoints[currentIndex]?.utcTime.getTime() ?? departureMs) - departureMs;
  const totalMs = (waypoints[maxIndex]?.utcTime.getTime() ?? departureMs) - departureMs;
  const pct = totalMs > 0 ? (currentMs / totalMs) * 100 : 0;

  const currentUTC = waypoints[currentIndex]?.utcTime.toUTCString().slice(17, 22) ?? '--:--';

  return (
    <div className="bg-gray-950 border-t border-gray-700 px-4 py-3 flex items-center gap-4">
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shrink-0"
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Scrubbar */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Track + invisible range input share the same relative container so
            click targets align perfectly with the visual bar */}
        <div className="relative h-4 flex items-center">
          <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden pointer-events-none">
            <div
              className="h-full bg-blue-500 rounded-full transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={currentIndex}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Flight progress"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 select-none">
          <span>Departure</span>
          <span>{formatElapsed(totalMs)} total</span>
        </div>
      </div>

      {/* Current time */}
      <div className="text-right shrink-0">
        <p className="text-sm font-mono text-blue-300">{formatElapsed(currentMs)}</p>
        <p className="text-xs text-gray-500">{currentUTC} UTC</p>
      </div>
    </div>
  );
}
