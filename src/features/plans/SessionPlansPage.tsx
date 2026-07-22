import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatSeconds } from '../../lib/time';
import SessionPlanEditor from './SessionPlanEditor';
import type { SessionPlan } from './types';

type View = 'list' | { planId: string | null };

function DeletePlanModal({
  name,
  onConfirm,
  onCancel,
  deleting,
  error,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  error?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-xs w-full">
        <p className="text-sm font-heading font-semibold text-ink mb-1">Usunąć plan?</p>
        <p className="text-xs text-ink-muted mb-5">
          <span className="text-ink">"{name}"</span> zostanie trwale usunięty.
        </p>
        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-surface-hover text-ink-muted text-sm font-semibold disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50"
          >
            {deleting ? 'Usuwanie…' : 'Usuń'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionPlanListView({
  onEdit,
  onNew,
}: {
  onEdit: (id: string) => void;
  onNew: () => void;
}) {
  const [plans, setPlans] = useState<SessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  function fetchPlans() {
    supabase
      .from('session_plans')
      .select('*, session_plan_items(*, pose:poses(*))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPlans((data as SessionPlan[]) ?? []);
        setLoading(false);
      });
  }

  useEffect(() => { fetchPlans(); }, []);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    const { error } = await supabase.from('session_plans').delete().eq('id', id);
    if (error) { setDeleteErr(error.message); setIsDeleting(false); return; }
    setDeletingId(null);
    setDeleteErr(null);
    setIsDeleting(false);
    fetchPlans();
  }

  const deletingPlan = plans.find((p) => p.id === deletingId) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight">Planowanie sesji</h1>
        <button
          onClick={onNew}
          className="px-4 py-2 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 transition-colors"
        >
          + Nowy
        </button>
      </div>

      {loading && <p className="text-center text-ink-muted text-sm py-10">Ładowanie…</p>}

      {!loading && plans.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-ink-muted text-sm font-medium">Brak zaplanowanych sesji.</p>
          <p className="text-ink-muted text-sm mt-1">Stwórz swój pierwszy plan treningu.</p>
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => {
            const items = [...plan.session_plan_items].sort((a, b) => a.position - b.position);
            const totalSeconds = items.reduce((sum, i) => sum + i.prep_seconds + i.hold_seconds, 0);

            return (
              <div key={plan.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold text-ink">{plan.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {items.length} {items.length === 1 ? 'pozycja' : 'pozycji'} · {formatSeconds(totalSeconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDeletingId(plan.id); setDeleteErr(null); }}
                      className="text-xs text-danger hover:text-danger/80 px-2 py-1.5 transition-colors"
                    >
                      Usuń
                    </button>
                    <button
                      onClick={() => onEdit(plan.id)}
                      className="text-xs text-ink-muted bg-surface-hover hover:bg-border transition-colors px-3 py-1.5 rounded-lg font-medium"
                    >
                      Edytuj
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-ink-muted italic">Brak pozycji</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-ink-muted">{item.pose.name}</span>
                        <span className="text-xs text-ink-muted shrink-0 ml-2 tabular-nums">
                          przyg. {item.prep_seconds}s · trwanie {item.hold_seconds}s
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deletingPlan && (
        <DeletePlanModal
          name={deletingPlan.name}
          onConfirm={() => handleDelete(deletingPlan.id)}
          onCancel={() => { setDeletingId(null); setDeleteErr(null); }}
          deleting={isDeleting}
          error={deleteErr}
        />
      )}
    </div>
  );
}

export default function SessionPlansPage() {
  const [view, setView] = useState<View>('list');

  if (view !== 'list') {
    return (
      <SessionPlanEditor
        planId={view.planId}
        onBack={() => setView('list')}
        onSaved={() => setView('list')}
      />
    );
  }

  return (
    <SessionPlanListView
      onEdit={(id) => setView({ planId: id })}
      onNew={() => setView({ planId: null })}
    />
  );
}
