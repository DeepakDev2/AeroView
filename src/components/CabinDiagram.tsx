'use client';

/**
 * src/components/CabinDiagram.tsx — Overhead cabin SVG diagram
 *
 * Top-down view of airplane cabin. Shows seat columns A–C (left window),
 * D–G (middle), J–L (right window) with winner-side highlighting.
 * Pure SVG — no external images, no math, no business logic.
 */

import type { SeatVerdict } from '@/types';

interface CabinDiagramProps {
  winner: SeatVerdict['winner'];
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function seatFill(side: 'left' | 'right' | 'middle', winner: SeatVerdict['winner']): string {
  if (side === 'middle') return '#374151'; // always neutral
  if (side === 'left')  return winner === 'right'  ? '#1f2937' : '#1d4ed8'; // blue
  /* right */           return winner === 'left'   ? '#1f2937' : '#4338ca'; // indigo
}

function seatStroke(side: 'left' | 'right' | 'middle', winner: SeatVerdict['winner']): string {
  if (side === 'middle') return '#4b5563';
  if (side === 'left')  return winner === 'right'  ? '#374151' : '#60a5fa';
  /* right */           return winner === 'left'   ? '#374151' : '#818cf8';
}

function windowFill(side: 'left' | 'right', winner: SeatVerdict['winner']): string {
  if (side === 'left')  return winner === 'right'  ? '#1e293b' : '#93c5fd';
  /* right */           return winner === 'left'   ? '#1e293b' : '#a5b4fc';
}

// ── Layout constants (SVG coordinate space) ───────────────────────────────────
// Total SVG: 320 × 340
// Fuselage: x 30–290, y 20–320  (260w × 300h)
// Nose tip: y ≈ 10, tail: y ≈ 330

const SVG_W = 320;
const SVG_H = 340;

// Column x-centres (7 columns: A B C | D E F G | J K L)
const COL: Record<string, number> = {
  A: 50,  B: 73,  C: 96,    // left window block
  D: 130, E: 153, F: 176, G: 199, // middle block
  J: 234, K: 257, L: 280,  // right window block
};

// Row y positions (8 representative rows, spaced 28px apart, starting at y=80)
const ROW_START = 80;
const ROW_STEP  = 28;
const ROW_COUNT = 7;

const SEAT_W = 18;
const SEAT_H = 22;
const SEAT_R = 3;

// ── Component ─────────────────────────────────────────────────────────────────

export default function CabinDiagram({ winner }: CabinDiagramProps) {
  const rows = Array.from({ length: ROW_COUNT }, (_, i) => ROW_START + i * ROW_STEP);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Cabin Overview
      </p>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        aria-label="Overhead cabin diagram"
        className="w-full h-auto max-w-xs"
      >
        {/* ── Fuselage outline ─────────────────────────────────────────────── */}
        <path
          d={`
            M 160 12
            C 200 12, 290 30, 290 60
            L 290 280
            C 290 315, 240 330, 160 330
            C 80 330, 30 315, 30 280
            L 30 60
            C 30 30, 120 12, 160 12
            Z
          `}
          fill="#111827"
          stroke="#374151"
          strokeWidth="2"
        />

        {/* ── Nose cockpit bulkhead ─────────────────────────────────────────── */}
        <rect x="60" y="50" width="200" height="8" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />

        {/* ── Tail bulkhead ─────────────────────────────────────────────────── */}
        <rect x="60" y="282" width="200" height="8" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />

        {/* ── Aisle strips ─────────────────────────────────────────────────── */}
        {/* Left aisle (between C=96 and D=130): C right-edge=105, D left-edge=121 */}
        <rect x="105" y="55" width="16" height="232" fill="#1a2535" />
        {/* Right aisle (between G=199 and J=234): G right-edge=208, J left-edge=225 */}
        <rect x="208" y="55" width="17" height="232" fill="#1a2535" />

        {/* ── Window dots (left side) ───────────────────────────────────────── */}
        {rows.map((ry, i) => (
          <circle
            key={`wl-${i}`}
            cx={38}
            cy={ry + SEAT_H / 2}
            r={4}
            fill={windowFill('left', winner)}
            stroke="#1e3a5f"
            strokeWidth="0.8"
          />
        ))}

        {/* ── Window dots (right side) ──────────────────────────────────────── */}
        {rows.map((ry, i) => (
          <circle
            key={`wr-${i}`}
            cx={SVG_W - 38}
            cy={ry + SEAT_H / 2}
            r={4}
            fill={windowFill('right', winner)}
            stroke="#312e81"
            strokeWidth="0.8"
          />
        ))}

        {/* ── Seats ─────────────────────────────────────────────────────────── */}
        {rows.map((ry, ri) =>
          Object.entries(COL).map(([col, cx]) => {
            const side: 'left' | 'right' | 'middle' =
              col === 'A' || col === 'B' || col === 'C' ? 'left'
              : col === 'J' || col === 'K' || col === 'L' ? 'right'
              : 'middle';
            return (
              <rect
                key={`${col}-${ri}`}
                x={cx - SEAT_W / 2}
                y={ry}
                width={SEAT_W}
                height={SEAT_H}
                rx={SEAT_R}
                fill={seatFill(side, winner)}
                stroke={seatStroke(side, winner)}
                strokeWidth="1"
              />
            );
          })
        )}

        {/* ── Column headers ────────────────────────────────────────────────── */}
        {Object.entries(COL).map(([col, cx]) => (
          <text
            key={`hdr-${col}`}
            x={cx}
            y={72}
            textAnchor="middle"
            fontSize="8"
            fontFamily="monospace"
            fill="#6b7280"
          >
            {col}
          </text>
        ))}

        {/* ── FRONT / TAIL labels ────────────────────────────────────────────── */}
        <text x="160" y="40" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fill="#4b5563" letterSpacing="2">
          FRONT
        </text>
        <text x="160" y="320" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fill="#4b5563" letterSpacing="2">
          TAIL
        </text>

        {/* ── Side labels ────────────────────────────────────────────────────── */}
        <text
          x="15"
          y={ROW_START + (ROW_COUNT * ROW_STEP) / 2}
          textAnchor="middle"
          fontSize="8"
          fontFamily="sans-serif"
          fill={winner === 'right' ? '#374151' : '#60a5fa'}
          transform={`rotate(-90, 15, ${ROW_START + (ROW_COUNT * ROW_STEP) / 2})`}
        >
          LEFT
        </text>
        <text
          x={SVG_W - 15}
          y={ROW_START + (ROW_COUNT * ROW_STEP) / 2}
          textAnchor="middle"
          fontSize="8"
          fontFamily="sans-serif"
          fill={winner === 'left' ? '#374151' : '#818cf8'}
          transform={`rotate(90, ${SVG_W - 15}, ${ROW_START + (ROW_COUNT * ROW_STEP) / 2})`}
        >
          RIGHT
        </text>
      </svg>

    </div>
  );
}