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
      <div className="bg-zinc-900 rounded-t-2xl flex flex-col max-h-[82dvh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-semibold text-zinc-100">Dodaj pozycję</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors text-xl leading-none"
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
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-lime-400 transition-colors"
          />
        </div>

        <ul className="overflow-y-auto flex-1 divide-y divide-zinc-800">
          {loading && (
            <li className="py-10 text-center text-zinc-500 text-sm">Ładowanie…</li>
          )}
          {!loading && error && (
            <li className="py-10 text-center text-red-400 text-sm px-4">{error}</li>
          )}
          {!loading && !error && filtered.length === 0 && (
            <li className="py-10 text-center text-zinc-500 text-sm">Brak pozycji.</li>
          )}
          {filtered.map((pose) => (
            <li key={pose.id}>
              <button
                onClick={() => { onSelect(pose); onClose(); }}
                className="w-full flex items-center gap-3 text-left px-4 py-2.5 hover:bg-zinc-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                  {pose.image_url ? (
                    <img src={pose.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg">🧘</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{pose.name}</div>
                  {pose.description && (
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">{pose.description}</div>
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
