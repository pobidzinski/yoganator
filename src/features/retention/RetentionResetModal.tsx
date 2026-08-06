import { useState } from 'react';
import { toDatetimeLocalValue } from '../../lib/time';

interface Props {
  initialValue: Date;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (date: Date) => void;
}

export default function RetentionResetModal({ initialValue, saving, error, onClose, onSave }: Props) {
  const [value, setValue] = useState(() => toDatetimeLocalValue(initialValue));

  function handleNow() {
    setValue(toDatetimeLocalValue(new Date()));
  }

  function handleSave() {
    if (!value) return;
    onSave(new Date(value));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end">
      <div className="bg-surface rounded-t-2xl flex flex-col max-h-[92dvh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
          <h2 className="text-base font-heading font-semibold text-ink">Ostatni wytrysk</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">
              Data i godzina
            </label>
            <input
              type="datetime-local"
              value={value}
              max={toDatetimeLocalValue(new Date())}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={handleNow}
              className="text-xs text-accent hover:text-accent/80 transition-colors self-start"
            >
              Ustaw na teraz
            </button>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !value}
            className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
