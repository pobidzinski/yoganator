import { Fragment, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSortable } from '../../components/useSortable';
import PosePicker from '../poses/PosePicker';
import type { Pose } from '../poses/types';
import type { SessionPlan } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftItem {
  localId: string;
  pose: Pose;
  prepSeconds: number;
  holdSeconds: number;
}

const DEFAULT_PREP_SECONDS = 10;
const DEFAULT_HOLD_SECONDS = 30;

// ─── DraftItemRow ─────────────────────────────────────────────────────────────

function DraftItemRow({
  index,
  item,
  onChange,
  onRemove,
  dragHandleProps,
  isDragging,
}: {
  index: number;
  item: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
  dragHandleProps: React.HTMLAttributes<HTMLElement>;
  isDragging: boolean;
}) {
  return (
    <div
      data-sortable-row
      className={[
        'flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700',
        isDragging ? 'ring-2 ring-lime-400 shadow-lg shadow-black/40' : '',
      ].join(' ')}
    >
      {/* Drag handle */}
      <span
        className="w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none text-zinc-500 hover:text-zinc-300"
        {...dragHandleProps}
      >
        ⠿
      </span>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-700 shrink-0">
        {item.pose.image_url ? (
          <img src={item.pose.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg">🧘</div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="text-[10px] text-zinc-500 font-semibold">#{index + 1}</span>
        <p className="text-sm font-medium text-zinc-100 truncate">{item.pose.name}</p>
      </div>

      {/* Prep seconds */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <label className="text-[9px] text-zinc-500 uppercase tracking-wide">Przyg.</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={600}
          value={item.prepSeconds}
          onChange={(e) => onChange({ prepSeconds: Math.max(0, Number(e.target.value) || 0) })}
          className="w-14 bg-zinc-700 border border-zinc-600 rounded-lg px-1.5 py-1 text-xs text-zinc-100 text-center outline-none focus:border-lime-400 transition-colors"
        />
      </div>

      {/* Hold seconds */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <label className="text-[9px] text-zinc-500 uppercase tracking-wide">Trwanie</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={1200}
          value={item.holdSeconds}
          onChange={(e) => onChange({ holdSeconds: Math.max(1, Number(e.target.value) || 1) })}
          className="w-14 bg-zinc-700 border border-zinc-600 rounded-lg px-1.5 py-1 text-xs text-zinc-100 text-center outline-none focus:border-lime-400 transition-colors"
        />
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  );
}

// ─── Session Plan Editor ──────────────────────────────────────────────────────

interface Props {
  planId: string | null;
  onBack: () => void;
  onSaved: () => void;
}

export default function SessionPlanEditor({ planId, onBack, onSaved }: Props) {
  const isNew = planId === null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { dragging, over, handleProps } = useSortable(draftItems.length, (from, to) => {
    setDraftItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  });

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('session_plans')
      .select('*, session_plan_items(*, pose:poses(*))')
      .eq('id', planId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError(err?.message ?? 'Nie znaleziono planu'); setLoading(false); return; }
        const plan = data as SessionPlan;
        setName(plan.name);
        setDescription(plan.description ?? '');
        setDraftItems(
          [...plan.session_plan_items]
            .sort((a, b) => a.position - b.position)
            .map((it) => ({
              localId: crypto.randomUUID(),
              pose: it.pose,
              prepSeconds: it.prep_seconds,
              holdSeconds: it.hold_seconds,
            }))
        );
        setLoading(false);
      });
  }, [isNew, planId]);

  function addPose(pose: Pose) {
    setDraftItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        pose,
        prepSeconds: DEFAULT_PREP_SECONDS,
        holdSeconds: DEFAULT_HOLD_SECONDS,
      },
    ]);
  }

  function updateItem(localId: string, patch: Partial<DraftItem>) {
    setDraftItems((prev) => prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  }

  function removeItem(localId: string) {
    setDraftItems((prev) => prev.filter((d) => d.localId !== localId));
  }

  async function handleSave() {
    if (!name.trim()) { setError('Nazwa jest wymagana.'); return; }
    if (draftItems.length === 0) { setError('Dodaj przynajmniej jedną pozycję.'); return; }
    setSaving(true);
    setError(null);

    try {
      let id = planId;

      if (isNew) {
        const { data, error: err } = await supabase
          .from('session_plans')
          .insert({ name: name.trim(), description: description.trim() || null })
          .select('id')
          .single();
        if (err) throw err;
        id = data.id;
      } else {
        const { error: err } = await supabase
          .from('session_plans')
          .update({ name: name.trim(), description: description.trim() || null })
          .eq('id', id);
        if (err) throw err;
      }

      const { error: delErr } = await supabase
        .from('session_plan_items')
        .delete()
        .eq('session_plan_id', id);
      if (delErr) throw delErr;

      const rows = draftItems.map((item, i) => ({
        session_plan_id: id,
        pose_id: item.pose.id,
        position: i,
        prep_seconds: item.prepSeconds,
        hold_seconds: item.holdSeconds,
      }));
      const { error: insErr } = await supabase.from('session_plan_items').insert(rows);
      if (insErr) throw insErr;

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zapis nie powiódł się');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!planId) return;
    if (!confirm('Usunąć ten plan?')) return;
    await supabase.from('session_plans').delete().eq('id', planId);
    onSaved();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-zinc-500 text-sm">Ładowanie…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 text-xl transition-colors"
        >
          ←
        </button>
        <h1 className="text-xl font-black text-zinc-100 tracking-tight flex-1">
          {isNew ? 'Nowy plan' : 'Edytuj plan'}
        </h1>
        {!isNew && (
          <button
            onClick={handleDelete}
            className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Usuń
          </button>
        )}
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          Nazwa *
        </label>
        <input
          type="text"
          placeholder="np. Poranna sesja"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-lime-400 transition-colors"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          Opis
        </label>
        <input
          type="text"
          placeholder="Opcjonalna notatka…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-lime-400 transition-colors"
        />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          Pozycje ({draftItems.length})
        </p>
        <div className="flex flex-col gap-2">
          {draftItems.map((item, i) => (
            <Fragment key={item.localId}>
              {dragging !== null && over === i && over < dragging && (
                <div className="h-1 mx-2 rounded-full bg-lime-400 shadow-[0_0_8px_4px_rgba(163,230,53,0.5)]" />
              )}
              <DraftItemRow
                index={i}
                item={item}
                onChange={(patch) => updateItem(item.localId, patch)}
                onRemove={() => removeItem(item.localId)}
                dragHandleProps={handleProps(i)}
                isDragging={dragging === i}
              />
              {dragging !== null && over === i && over > dragging && (
                <div className="h-1 mx-2 rounded-full bg-lime-400 shadow-[0_0_8px_4px_rgba(163,230,53,0.5)]" />
              )}
            </Fragment>
          ))}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-sm font-medium"
        >
          + Dodaj pozycję
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Zapisywanie…' : 'Zapisz plan'}
      </button>

      {showPicker && (
        <PosePicker onSelect={addPose} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
