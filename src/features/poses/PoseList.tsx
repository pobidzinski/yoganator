import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PoseFormModal from './PoseFormModal';
import type { Pose } from './types';

export default function PoseList() {
  const [poses, setPoses]           = useState<Pose[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery]           = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [editPose, setEditPose]     = useState<Pose | null>(null);
  const [deletingPose, setDeletingPose] = useState<Pose | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErr, setDeleteErr]   = useState<string | null>(null);

  async function fetchPoses() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('poses').select('*').order('name');
    if (error) setError(error.message);
    else setPoses(data as Pose[]);
    setLoading(false);
  }

  useEffect(() => { fetchPoses(); }, []);

  const filtered = poses.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  async function handleDeletePose(id: string) {
    setIsDeleting(true);
    setDeleteErr(null);
    const { error } = await supabase.from('poses').delete().eq('id', id);
    if (error) {
      setIsDeleting(false);
      setDeleteErr(
        error.code === '23503'
          ? 'Ta pozycja jest użyta w planie sesji — usuń ją najpierw z planu.'
          : error.message
      );
      return;
    }
    setDeletingPose(null);
    setIsDeleting(false);
    fetchPoses();
  }

  function handleSaved() {
    setShowAdd(false);
    setEditPose(null);
    fetchPoses();
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pt-2 mb-4">
        <h1 className="text-2xl font-black text-zinc-100 tracking-tight">Katalog ćwiczeń</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-colors"
        >
          + Dodaj
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Szukaj pozycji…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-lime-400 transition-colors mb-5"
      />

      {/* States */}
      {loading && <p className="text-zinc-500 text-sm text-center py-10">Ładowanie…</p>}
      {error   && <p className="text-red-400 text-sm text-center py-10">{error}</p>}

      {/* List */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-10">Brak pozycji.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((pose) => (
              <li
                key={pose.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-square bg-zinc-800">
                  {pose.image_url ? (
                    <img src={pose.image_url} alt={pose.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-3xl">
                      🧘
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <span className="text-sm font-semibold text-zinc-100 truncate" title={pose.name}>
                    {pose.name}
                  </span>
                  {pose.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2">{pose.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-auto pt-1">
                    <button
                      onClick={() => setEditPose(pose)}
                      className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => { setDeletingPose(pose); setDeleteErr(null); }}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 transition-colors"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {/* Add modal */}
      {showAdd && (
        <PoseFormModal mode="add" onClose={() => setShowAdd(false)} onSaved={handleSaved} />
      )}

      {/* Edit modal */}
      {editPose && (
        <PoseFormModal mode="edit" pose={editPose} onClose={() => setEditPose(null)} onSaved={handleSaved} />
      )}

      {/* Delete confirm modal */}
      {deletingPose && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xs w-full">
            <p className="text-sm font-semibold text-zinc-100 mb-1">Usunąć pozycję?</p>
            <p className="text-xs text-zinc-500 mb-3">
              <span className="text-zinc-300">"{deletingPose.name}"</span> zostanie trwale usunięta.
            </p>
            {deleteErr && <p className="text-xs text-red-400 mb-3">{deleteErr}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletingPose(null); setDeleteErr(null); }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDeletePose(deletingPose.id)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isDeleting ? 'Usuwanie…' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
