// Pure date-grid helpers for the training calendar — no external date
// library, mirroring the rest of the app's "plain functions" approach
// (trainingEngine.ts, retentionEngine.ts).

export const WEEKDAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const mondayIndexedDay = (d.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat -> 0=Mon..6=Sun
  return addDays(d, -mondayIndexedDay);
}

/** "YYYY-MM-DD" in local time — used as a Set key, not for display or storage. */
export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Mon–Sun week rows covering `year`/`month` (0-indexed), including lead/trail days from adjacent months. */
export function getMonthGrid(year: number, month: number): Date[][] {
  const gridStart = startOfWeek(new Date(year, month, 1));
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridEnd = startOfWeek(lastOfMonth);

  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
