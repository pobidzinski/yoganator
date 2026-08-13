import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import WeightLineChart from './WeightLineChart';
import WeightWeeklyChart from './WeightWeeklyChart';
import { buildDailySeries, buildWeeklyAverages, computeEma, getLatestChange } from './weightEngine';
import type { WeightLog } from './types';

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayKey());
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function fetchLogs() {
    setLoading(true);
    setError(null);
    supabase
      .from('weight_logs')
      .select('*')
      .order('date')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setLogs((data as WeightLog[]) ?? []);
        setLoading(false);
      });
  }

  useEffect(() => { fetchLogs(); }, []);

  const dailySeries = useMemo(() => buildDailySeries(logs), [logs]);
  const emaSeries = useMemo(() => computeEma(dailySeries), [dailySeries]);
  const weeklyAverages = useMemo(() => buildWeeklyAverages(logs), [logs]);
  const latestChange = useMemo(() => getLatestChange(logs), [logs]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const weightNum = Number(weightInput.replace(',', '.'));
    if (!date || !Number.isFinite(weightNum) || weightNum <= 0) {
      setSaveError('Podaj poprawną datę i wagę.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from('weight_logs')
      .upsert({ date, weight_kg: weightNum }, { onConflict: 'date' });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setWeightInput('');
    setDate(todayKey());
    fetchLogs();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('weight_logs').delete().eq('id', id);
    setDeletingId(null);
    if (!error) fetchLogs();
  }

  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight pt-2">Waga</h1>

      {/* Quick add */}
      <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayKey()}
            className="flex-1 bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="kg"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="w-24 bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none focus:border-accent transition-colors"
          />
        </div>
        {saveError && <p className="text-xs text-danger">{saveError}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Zapisywanie…' : 'Zapisz pomiar'}
        </button>
      </form>

      {loading && <p className="text-ink-muted text-sm text-center py-6">Ładowanie…</p>}
      {error && <p className="text-danger text-sm text-center py-6">{error}</p>}

      {!loading && !error && logs.length === 0 && (
        <p className="text-ink-muted text-sm text-center py-6">Brak jeszcze żadnych pomiarów — dodaj pierwszy powyżej.</p>
      )}

      {!loading && !error && logs.length > 0 && (
        <>
          {/* Latest reading */}
          {latestChange && (
            <div className="bg-surface border border-border rounded-2xl px-5 py-6 flex flex-col items-center text-center gap-1">
              <p className="text-5xl font-heading font-semibold tabular-nums text-ink">
                {latestChange.latest.weight_kg.toFixed(1)}
                <span className="text-lg font-sans font-medium text-ink-muted ml-1.5">kg</span>
              </p>
              <p className="text-xs text-ink-muted">{formatDateLabel(latestChange.latest.date)}</p>
              {latestChange.previous && (
                <p className="text-sm text-ink-muted mt-1">
                  {(() => {
                    const delta = latestChange.latest.weight_kg - latestChange.previous.weight_kg;
                    const sign = delta > 0 ? '+' : '';
                    return `${sign}${delta.toFixed(1)} kg vs ${formatDateLabel(latestChange.previous.date)}`;
                  })()}
                </p>
              )}
            </div>
          )}

          {/* Daily chart */}
          <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
            <p className="text-sm font-heading font-semibold text-ink">Codzienne pomiary</p>
            <WeightLineChart dailySeries={dailySeries} emaSeries={emaSeries} />
          </div>

          {/* Weekly chart */}
          <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
            <p className="text-sm font-heading font-semibold text-ink">Średnia tygodniowa</p>
            <WeightWeeklyChart weeks={weeklyAverages} />
          </div>

          {/* Recent entries */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted px-1">Ostatnie wpisy</p>
            <ul className="flex flex-col gap-1.5">
              {recentLogs.map((log) => (
                <li
                  key={log.id}
                  className="bg-surface border border-border rounded-xl px-4 py-2.5 flex items-center justify-between"
                >
                  <span className="text-sm text-ink">{formatDateLabel(log.date)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink tabular-nums">{log.weight_kg.toFixed(1)} kg</span>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deletingId === log.id}
                      className="text-xs text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
                    >
                      Usuń
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
