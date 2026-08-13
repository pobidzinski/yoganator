// Small SVG scale helpers shared by the weight charts — no charting library,
// mirroring the rest of the app's "plain functions, no extra deps" approach.

export function scaleLinear([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  return (value: number) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0));
}

/** Rounds a rough step size (e.g. range / tickCount) up to a "nice" 1/2/5 step. */
function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = rough / 10 ** exp;
  const niceBase = base < 1.5 ? 1 : base < 3 ? 2 : base < 7 ? 5 : 10;
  return niceBase * 10 ** exp;
}

/** "Nice" tick values covering [min, max], stepped by 1/2/5 * 10^n. */
export function niceTicks(min: number, max: number, targetCount = 4): number[] {
  if (min === max) return [min];
  const step = niceStep((max - min) / targetCount);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
