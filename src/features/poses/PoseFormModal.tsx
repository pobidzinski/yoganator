import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import type { Pose } from './types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

interface FormState {
  name: string;
  description: string;
  imageFile: File | null;          // newly picked, not yet uploaded
  imagePreviewUrl: string | null;  // existing pose.image_url OR local object URL, or null if removed
  removeExisting: boolean;
}

function initialForm(pose?: Pose): FormState {
  return {
    name: pose?.name ?? '',
    description: pose?.description ?? '',
    imageFile: null,
    imagePreviewUrl: pose?.image_url ?? null,
    removeExisting: false,
  };
}

interface Props {
  mode: 'add' | 'edit';
  pose?: Pose;
  onClose: () => void;
  onSaved: () => void;
}

export default function PoseFormModal({ mode, pose, onClose, onSaved }: Props) {
  const kbOffset = useKeyboardOffset();
  const [form, setForm] = useState<FormState>(() => initialForm(pose));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function patch(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Nieobsługiwany format pliku. Użyj PNG, JPEG, WEBP lub GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Zdjęcie jest za duże (max 5 MB).');
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setError(null);
    patch({ imageFile: file, imagePreviewUrl: url, removeExisting: false });
  }

  function handleRemovePhoto() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    patch({ imageFile: null, imagePreviewUrl: null, removeExisting: true });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nazwa jest wymagana.'); return; }
    setSaving(true);
    setError(null);

    let imageUrl = pose?.image_url ?? null;

    if (form.imageFile) {
      const path = `${crypto.randomUUID()}-${form.imageFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('pose-images')
        .upload(path, form.imageFile);
      if (uploadErr) { setSaving(false); setError(uploadErr.message); return; }
      const { data } = supabase.storage.from('pose-images').getPublicUrl(path);
      imageUrl = data.publicUrl;
    } else if (form.removeExisting) {
      imageUrl = null;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: imageUrl,
    };

    let err;
    if (mode === 'edit' && pose) {
      ({ error: err } = await supabase.from('poses').update(payload).eq('id', pose.id));
    } else {
      ({ error: err } = await supabase.from('poses').insert(payload));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-lime-400 transition-colors';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end" style={{ paddingBottom: kbOffset }}>
      <div className="bg-zinc-900 rounded-t-2xl flex flex-col max-h-[92dvh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
          <h2 className="text-base font-bold text-zinc-100">
            {mode === 'edit' ? 'Edytuj pozycję' : 'Nowa pozycja'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-5">

          {/* Photo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              Zdjęcie
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="relative w-full aspect-square max-w-[220px] rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
              {form.imagePreviewUrl ? (
                <img src={form.imagePreviewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">
                  🧘
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 text-transparent hover:text-white text-sm font-semibold transition-colors"
              >
                Zmień zdjęcie
              </button>
            </div>
            {form.imagePreviewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs text-red-400 hover:text-red-300 transition-colors self-start"
              >
                Usuń zdjęcie
              </button>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              Nazwa *
            </label>
            <input
              type="text"
              placeholder="np. Pies z głową w dół"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              autoFocus
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              Opis
            </label>
            <textarea
              placeholder="Krótki opis pozycji, wskazówki wykonania…"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Zapisywanie…' : mode === 'edit' ? 'Zapisz zmiany' : 'Zapisz pozycję'}
          </button>
        </div>
      </div>
    </div>
  );
}
