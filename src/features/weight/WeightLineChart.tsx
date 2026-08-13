import { useRef, useState } from 'react';
import { scaleLinear, niceTicks } from './chartScale';
import { EMA_SPAN_DAYS, parseDateKey, type DailyPoint, type EmaPoint } from './weightEngine';

const W = 320;
const H = 200;
const PAD = { top: 14, right: 10, bottom: 24, left: 36 };

function formatShortDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

interface WeightLineChartProps {
  dailySeries: DailyPoint[];
  emaSeries: EmaPoint[];
}

export default function WeightLineChart({ dailySeries, emaSeries }: WeightLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (dailySeries.length < 2) {
    return (
      <p className="text-xs text-ink-muted text-center py-10">
        Dodaj co najmniej dwa pomiary, żeby zobaczyć wykres.
      </p>
    );
  }

  const n = dailySeries.length;
  const actualPoints = dailySeries
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.actual);

  const weights = actualPoints.map((p) => p.weight);
  const emaValues = emaSeries.map((p) => p.ema);
  const min = Math.min(...weights, ...emaValues);
  const max = Math.max(...weights, ...emaValues);
  const valuePad = Math.max((max - min) * 0.2, 0.4);
  const yDomain: [number, number] = [min - valuePad, max + valuePad];
  const yTicks = niceTicks(yDomain[0], yDomain[1], 4);

  const x = scaleLinear([0, n - 1], [PAD.left, W - PAD.right]);
  const y = scaleLinear(yDomain, [H - PAD.bottom, PAD.top]);

  const rawPath = actualPoints.map((p) => `${p.i === actualPoints[0].i ? 'M' : 'L'} ${x(p.i)} ${y(p.weight)}`).join(' ');
  const emaPath = emaSeries.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.ema)}`).join(' ');

  function handlePointer(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = ((clientX - rect.left) / rect.width) * W;
    const ratio = (localX - PAD.left) / (W - PAD.left - PAD.right);
    const idx = Math.round(ratio * (n - 1));
    setHoverIndex(Math.min(n - 1, Math.max(0, idx)));
  }

  const hover = hoverIndex !== null ? dailySeries[hoverIndex] : null;
  const hoverEma = hoverIndex !== null ? emaSeries[hoverIndex].ema : null;
  const tooltipLeftPct = hoverIndex !== null ? (x(hoverIndex) / W) * 100 : 0;
  const tooltipAlignEnd = tooltipLeftPct > 65;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="w-2 h-2 rounded-full bg-accent" /> Pomiar
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="w-2 h-2 rounded-full bg-accent-2" /> Trend (EMA {EMA_SPAN_DAYS} dni)
        </span>
      </div>

      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none"
          onPointerMove={(e) => handlePointer(e.clientX)}
          onPointerDown={(e) => handlePointer(e.clientX)}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {/* Gridlines + y labels */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} opacity={0.6} />
              <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--color-ink-muted)">
                {t}
              </text>
            </g>
          ))}

          {/* x labels: first / last logged day */}
          <text x={x(0)} y={H - 6} textAnchor="start" fontSize={9} fill="var(--color-ink-muted)">
            {formatShortDate(dailySeries[0].dateKey)}
          </text>
          <text x={x(n - 1)} y={H - 6} textAnchor="end" fontSize={9} fill="var(--color-ink-muted)">
            {formatShortDate(dailySeries[n - 1].dateKey)}
          </text>

          {/* EMA trend line */}
          <path
            d={emaPath}
            fill="none"
            stroke="var(--color-accent-2)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 5"
            opacity={0.75}
          />

          {/* Raw measurement line + markers */}
          <path d={rawPath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {actualPoints.map((p) => (
            <circle key={p.i} cx={x(p.i)} cy={y(p.weight)} r={4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
          ))}

          {/* Hover crosshair */}
          {hoverIndex !== null && (
            <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-ink-muted)" strokeWidth={1} strokeDasharray="3 3" />
          )}
        </svg>

        {hover && hoverEma !== null && (
          <div
            className="absolute top-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[11px] leading-tight pointer-events-none shadow-lg"
            style={tooltipAlignEnd ? { right: `${100 - tooltipLeftPct}%`, marginRight: 4 } : { left: `${tooltipLeftPct}%`, marginLeft: 4 }}
          >
            <p className="text-ink font-semibold">{formatShortDate(hover.dateKey)}</p>
            {hover.actual && <p className="text-accent">Pomiar: {hover.weight.toFixed(1)} kg</p>}
            <p className="text-accent-2">Trend: {hoverEma.toFixed(1)} kg</p>
          </div>
        )}
      </div>
    </div>
  );
}
