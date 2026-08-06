import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import RetentionResetModal from './RetentionResetModal';
import { getElapsed, getPhaseForElapsedDays, getPhaseProgress, getPhaseRemaining } from './retentionEngine';
import type { RetentionStatus } from './types';

const TICK_MS = 1000;

export default function RetentionPage() {
  const [status, setStatus] = useState<RetentionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function fetchStatus() {
    supabase
      .from('retention_status')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setStatus((data as RetentionStatus | null) ?? null);
        setLoading(false);
      });
  }

  useEffect(() => { fetchStatus(); }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  async function handleSave(date: Date) {
    setSaving(true);
    setSaveError(null);
    const payload = { last_reset_at: date.toISOString(), updated_at: new Date().toISOString() };

    const { data, error } = status
      ? await supabase.from('retention_status').update(payload).eq('id', status.id).select().single()
      : await supabase.from('retention_status').insert(payload).select().single();

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setStatus(data as RetentionStatus);
    setModalOpen(false);
  }

  if (loading) {
    return <p className="text-center text-ink-muted text-sm py-10">Ładowanie…</p>;
  }

  if (!status) {
    return (
      <div className="flex flex-col gap-5 p-4 max-w-md mx-auto items-center text-center py-16">
        <p className="text-4xl">🔥</p>
        <div>
          <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight mb-1">Semen Retention</h1>
          <p className="text-ink-muted text-sm">
            Ustaw datę i godzinę ostatniego wytrysku, żeby rozpocząć liczenie.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 transition-colors"
        >
          Ustaw datę startu
        </button>

        {modalOpen && (
          <RetentionResetModal
            initialValue={new Date()}
            saving={saving}
            error={saveError}
            onClose={() => { setModalOpen(false); setSaveError(null); }}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  const lastResetAt = new Date(status.last_reset_at).getTime();
  const elapsed = getElapsed(now, lastResetAt);
  const elapsedDaysFractional = elapsed.totalMs / 86_400_000;
  const phase = getPhaseForElapsedDays(elapsed.days);
  const progress = getPhaseProgress(elapsedDaysFractional, phase);
  const remaining = getPhaseRemaining(elapsedDaysFractional, phase);
  const dayNumber = elapsed.days + 1;

  const lastResetLabel = new Date(status.last_reset_at).toLocaleString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight">Semen Retention</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs text-ink-muted bg-surface-hover hover:bg-border transition-colors px-3 py-1.5 rounded-lg font-medium"
        >
          Edytuj
        </button>
      </div>

      {/* Counter */}
      <div className="bg-surface border border-border rounded-2xl px-5 py-6 flex flex-col items-center text-center gap-1">
        <p className="text-5xl font-heading font-semibold tabular-nums text-ink">
          {elapsed.days}
          <span className="text-lg font-sans font-medium text-ink-muted ml-1.5">
            {elapsed.days === 1 ? 'dzień' : 'dni'}
          </span>
        </p>
        <p className="text-lg font-heading font-semibold tabular-nums text-ink">
          {elapsed.hours} godz {elapsed.minutes} min
        </p>
        <p className="text-xs text-ink-muted mt-2">od {lastResetLabel}</p>
      </div>

      {/* Phase summary */}
      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">{phase.dayRangeLabel}</p>
            <p className="text-base font-heading font-semibold text-ink mt-0.5">{phase.label}</p>
          </div>
          <span className="text-xs font-semibold text-ink-muted shrink-0">Dzień {dayNumber}</span>
        </div>

        {phase.endDay !== null ? (
          <>
            <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
            </div>
            <p className="text-xs text-ink-muted">
              {remaining && (remaining.days > 0 || remaining.hours > 0)
                ? `${remaining.days} dni ${remaining.hours} godz do końca fazy`
                : 'Faza kończy się lada chwila'}
            </p>
          </>
        ) : (
          <p className="text-xs text-ink-muted">Ta faza nie ma górnej granicy.</p>
        )}

        <p className="text-sm text-ink-muted leading-relaxed">{phase.description}</p>
      </div>

      {modalOpen && (
        <RetentionResetModal
          initialValue={new Date(status.last_reset_at)}
          saving={saving}
          error={saveError}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
