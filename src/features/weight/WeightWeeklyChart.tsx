import { useState } from 'react';
import { dateKey, addDays as addCalendarDays } from '../calendar/calendarEngine';
import { niceTicks, scaleLinear } from './chartScale';
import { parseDateKey, type WeeklyAverage } from './weightEngine';

const BAR_WIDTH = 28;
const BAR_GAP = 14;
const H = 200;
const PAD = { top: 14, right: 12, bottom: 24, left: 36 };

function formatShortDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function weekEndKey(weekStartKey: string): string {
  return dateKey(addCalendarDays(parseDateKey(weekStartKey), 6));
}

interface WeightWeeklyChartProps {
  weeks: WeeklyAverage[];
}

export default function WeightWeeklyChart({ weeks }: WeightWeeklyChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (weeks.length === 0) {
    return <p className="text-xs text-ink-muted text-center py-10">Brak jeszcze pełnego tygodnia pomiarów.</p>;
  }

  const step = BAR_WIDTH + BAR_GAP;
  const plotWidth = weeks.length * step;
  const W = PAD.left + plotWidth + PAD.right;

  const values = weeks.map((w) => w.avgWeight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const valuePad = Math.max((max - min) * 0.25, 0.4);
  const yDomain: [number, number] = [min - valuePad, max + valuePad];
  const yTicks = niceTicks(yDomain[0], yDomain[1], 4);

  const y = scaleLinear(yDomain, [H - PAD.bottom, PAD.top]);
  const baseline = H - PAD.bottom;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="relative" style={{ width: W }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="touch-none">
          <clipPath id="weekly-bars-clip">
            <rect x={PAD.left} y={PAD.top} width={plotWidth} height={H - PAD.top - PAD.bottom} />
          </clipPath>

          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} opacity={0.6} />
              <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--color-ink-muted)">
                {t}
              </text>
            </g>
          ))}

          {weeks.map((w, i) => {
            const cx = PAD.left + i * step + BAR_GAP / 2;
            const barTop = y(w.avgWeight);
            const barHeight = baseline - barTop;
            const isHover = hoverIndex === i;
            return (
              <g
                key={w.weekStartKey}
                onPointerEnter={() => setHoverIndex(i)}
                onPointerLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
              >
                <rect
                  x={cx}
                  y={barTop}
                  width={BAR_WIDTH}
                  height={barHeight + 4}
                  rx={4}
                  fill="var(--color-accent)"
                  opacity={isHover ? 1 : 0.85}
                  clipPath="url(#weekly-bars-clip)"
                />
                {/* Invisible full-height hit target, taller than the bar itself */}
                <rect x={cx} y={PAD.top} width={BAR_WIDTH} height={H - PAD.top - PAD.bottom} fill="transparent" />
                <text x={cx + BAR_WIDTH / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--color-ink-muted)">
                  {formatShortDate(w.weekStartKey)}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverIndex !== null && (
          <div
            className="absolute top-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[11px] leading-tight pointer-events-none shadow-lg whitespace-nowrap"
            style={{ left: PAD.left + hoverIndex * step + BAR_GAP / 2 + BAR_WIDTH + 6 }}
          >
            <p className="text-ink font-semibold">
              {formatShortDate(weeks[hoverIndex].weekStartKey)}–{formatShortDate(weekEndKey(weeks[hoverIndex].weekStartKey))}
            </p>
            <p className="text-accent">Średnia: {weeks[hoverIndex].avgWeight.toFixed(1)} kg</p>
            <p className="text-ink-muted">
              {weeks[hoverIndex].count} {weeks[hoverIndex].count === 1 ? 'pomiar' : 'pomiary'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
