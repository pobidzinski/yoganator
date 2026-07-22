import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatSeconds } from '../../lib/time';
import { useTrainingStore } from './trainingStore';
import type { SessionPlan } from '../plans/types';

export default function TrainingSelectScreen() {
  const [plans, setPlans] = useState<SessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadPlan = useTrainingStore((s) => s.loadPlan);

  useEffect(() => {
    supabase
      .from('session_plans')
      .select('*, session_plan_items(*, pose:poses(*))')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        setPlans((data as SessionPlan[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight pt-2">Trening</h1>

      {loading && <p className="text-center text-ink-muted text-sm py-10">Ładowanie…</p>}
      {error && <p className="text-center text-danger text-sm py-10">{error}</p>}

      {!loading && !error && plans.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧘</p>
          <p className="text-ink-muted text-sm font-medium">Brak zaplanowanych sesji.</p>
          <p className="text-ink-muted text-sm mt-1">Stwórz plan w zakładce Plany.</p>
        </div>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => {
            const items = [...plan.session_plan_items].sort((a, b) => a.position - b.position);
            const totalSeconds = items.reduce((sum, i) => sum + i.prep_seconds + i.hold_seconds, 0);
            return (
              <button
                key={plan.id}
                onClick={() => loadPlan(plan)}
                disabled={items.length === 0}
                className="text-left bg-surface border border-border hover:border-accent/50 rounded-xl px-4 py-3.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-semibold text-ink">{plan.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {items.length} {items.length === 1 ? 'pozycja' : 'pozycji'} · {formatSeconds(totalSeconds)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
