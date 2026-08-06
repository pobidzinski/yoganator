import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { addDays, dateKey, getMonthGrid, isSameDay, startOfWeek, WEEKDAY_LABELS } from './calendarEngine';
import type { TrainingLog } from './types';

const MONTH_LABELS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('training_logs')
      .select('*')
      .order('completed_at', { ascending: false })
      .then(({ data }) => {
        setLogs((data as TrainingLog[]) ?? []);
        setLoading(false);
      });
  }, []);

  const practicedDays = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) set.add(dateKey(new Date(log.completed_at)));
    return set;
  }, [logs]);

  const weekTrainingCount = useMemo(() => {
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 7);
    return logs.filter((log) => {
      const d = new Date(log.completed_at);
      return d >= weekStart && d < weekEnd;
    }).length;
  }, [logs, today]);

  const weeks = useMemo(() => getMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  function goToPrevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  function goToToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight">Kalendarz</h1>
        <button
          onClick={goToToday}
          className="text-xs text-ink-muted bg-surface-hover hover:bg-border transition-colors px-3 py-1.5 rounded-lg font-medium"
        >
          Dziś
        </button>
      </div>

      {/* Weekly summary */}
      <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center justify-between">
        <p className="text-sm text-ink-muted">Treningi w tym tygodniu</p>
        <p className="text-xl font-heading font-semibold text-ink tabular-nums">{loading ? '—' : weekTrainingCount}</p>
      </div>

      {/* Month calendar */}
      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink text-lg transition-colors"
          >
            ‹
          </button>
          <p className="text-sm font-heading font-semibold text-ink">
            {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink text-lg transition-colors"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-bold uppercase tracking-widest text-ink-muted py-1">
              {label}
            </div>
          ))}

          {weeks.flat().map((day) => {
            const inMonth = day.getMonth() === cursor.getMonth();
            const practiced = practicedDays.has(dateKey(day));
            const isToday = isSameDay(day, today);

            return (
              <div key={day.toISOString()} className="aspect-square flex items-center justify-center">
                <div
                  className={[
                    'w-full h-full flex items-center justify-center rounded-xl text-sm font-medium transition-colors',
                    !inMonth ? 'text-ink-muted/40' : '',
                    inMonth && practiced ? 'bg-accent text-accent-contrast font-semibold' : '',
                    inMonth && !practiced ? 'text-ink-muted' : '',
                    isToday && !practiced ? 'ring-1 ring-accent text-ink' : '',
                  ].join(' ')}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!loading && logs.length === 0 && (
        <p className="text-center text-ink-muted text-sm">
          Brak zapisanych treningów. Ukończ sesję w zakładce Trening, żeby zaczęła się pojawiać tutaj.
        </p>
      )}
    </div>
  );
}
