import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import type { Pose } from './types';

interface Props {
  onSelect: (pose: Pose) => void;
  onClose: () => void;
}

export default function PosePicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [poses, setPoses] = useState<Pose[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const kbOffset = useKeyboardOffset();

  useEffect(() => {
    supabase
      .from('poses')
      .select('*')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        setPoses((data as Pose[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = poses.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end" style={{ paddingBottom: kbOffset }}>
      <div className="bg-surface rounded-t-2xl flex flex-col max-h-[82dvh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-heading font-semibold text-ink">Dodaj pozycję</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-3">
          <input
            autoFocus
            type="search"
            placeholder="Szukaj pozycji…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-accent transition-colors"
          />
        </div>

        <ul className="overflow-y-auto flex-1 divide-y divide-border">
          {loading && (
            <li className="py-10 text-center text-ink-muted text-sm">Ładowanie…</li>
          )}
          {!loading && error && (
            <li className="py-10 text-center text-danger text-sm px-4">{error}</li>
          )}
          {!loading && !error && filtered.length === 0 && (
            <li className="py-10 text-center text-ink-muted text-sm">Brak pozycji.</li>
          )}
          {filtered.map((pose) => (
            <li key={pose.id}>
              <button
                onClick={() => { onSelect(pose); onClose(); }}
                className="w-full flex items-center gap-3 text-left px-4 py-2.5 hover:bg-surface-hover transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-hover shrink-0">
                  {pose.image_url ? (
                    <img src={pose.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-muted text-lg">🧘</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{pose.name}</div>
                  {pose.description && (
                    <div className="text-xs text-ink-muted mt-0.5 truncate">{pose.description}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
