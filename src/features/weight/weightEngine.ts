// Pure functions for the weight log charts — no I/O, mirroring the
// trainingEngine.ts / retentionEngine.ts / calendarEngine.ts pattern.
import { addDays, dateKey, startOfWeek } from '../calendar/calendarEngine';
import type { WeightLog } from './types';

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export interface DailyPoint {
  dateKey: string;
  weight: number;
  actual: boolean; // false = filled by linear interpolation between two real logs
}

/**
 * One point per calendar day from the first to the last logged entry.
 * Days without a log are linearly interpolated between the nearest real
 * entries before and after them — never extrapolated past the ends, and
 * never carried forward flat, so a gap doesn't distort the trend with a
 * long plateau. Assumes `logs` has at most one entry per date (DB-enforced).
 */
export function buildDailySeries(logs: WeightLog[]): DailyPoint[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  const points: DailyPoint[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    points.push({ dateKey: start.date, weight: start.weight_kg, actual: true });

    const spanDays = Math.round(
      (parseDateKey(end.date).getTime() - parseDateKey(start.date).getTime()) / 86_400_000
    );
    for (let d = 1; d < spanDays; d++) {
      const t = d / spanDays;
      points.push({
        dateKey: dateKey(addDays(parseDateKey(start.date), d)),
        weight: start.weight_kg + (end.weight_kg - start.weight_kg) * t,
        actual: false,
      });
    }
  }
  const last = sorted[sorted.length - 1];
  points.push({ dateKey: last.date, weight: last.weight_kg, actual: true });
  return points;
}

export interface EmaPoint {
  dateKey: string;
  ema: number;
}

export const EMA_SPAN_DAYS = 7;

/**
 * Exponential moving average over the gap-filled daily series (so an
 * irregular logging cadence doesn't bias the smoothing), seeded at the
 * first value.
 */
export function computeEma(series: DailyPoint[], spanDays = EMA_SPAN_DAYS): EmaPoint[] {
  if (series.length === 0) return [];
  const alpha = 2 / (spanDays + 1);
  let ema = series[0].weight;
  return series.map((point, i) => {
    ema = i === 0 ? point.weight : alpha * point.weight + (1 - alpha) * ema;
    return { dateKey: point.dateKey, ema };
  });
}

export interface WeeklyAverage {
  weekStartKey: string;
  avgWeight: number;
  count: number;
}

/**
 * Average of the actual logged entries per Mon–Sun calendar week. Weeks
 * with no entries are simply absent (nothing to average) rather than
 * interpolated — the weekly view is meant to reflect real data density,
 * not fill it in.
 */
export function buildWeeklyAverages(logs: WeightLog[]): WeeklyAverage[] {
  const buckets = new Map<string, number[]>();
  for (const log of logs) {
    const weekStartKey = dateKey(startOfWeek(parseDateKey(log.date)));
    const bucket = buckets.get(weekStartKey);
    if (bucket) bucket.push(log.weight_kg);
    else buckets.set(weekStartKey, [log.weight_kg]);
  }
  return [...buckets.entries()]
    .map(([weekStartKey, weights]) => ({
      weekStartKey,
      avgWeight: weights.reduce((sum, w) => sum + w, 0) / weights.length,
      count: weights.length,
    }))
    .sort((a, b) => a.weekStartKey.localeCompare(b.weekStartKey));
}

export function getLatestChange(logs: WeightLog[]): { latest: WeightLog; previous: WeightLog | null } | null {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  return { latest: sorted[sorted.length - 1], previous: sorted[sorted.length - 2] ?? null };
}
