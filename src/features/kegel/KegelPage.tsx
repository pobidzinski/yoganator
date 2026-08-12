import { useEffect, useState } from 'react';
import { unlockAudio } from '../../lib/audio';
import { supabase } from '../../lib/supabase';
import { getLevelForSessionCount, KEGEL_LEVELS, sessionsUntilNextLevel } from './kegelEngine';
import { useKegelStore } from './kegelStore';
import KegelRunnerScreen from './KegelRunnerScreen';

export default function KegelPage() {
  const status = useKegelStore((s) => s.status);
  const start = useKegelStore((s) => s.start);

  const [completedSessions, setCompletedSessions] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'idle') return;
    let cancelled = false;
    supabase
      .from('kegel_logs')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (!cancelled) setCompletedSessions(count ?? 0); });
    return () => { cancelled = true; };
  }, [status]);

  if (status !== 'idle') return <KegelRunnerScreen />;

  if (completedSessions === null) {
    return <p className="text-center text-ink-muted text-sm py-10">Ładowanie…</p>;
  }

  const level = getLevelForSessionCount(completedSessions);
  const untilNext = sessionsUntilNextLevel(completedSessions);
  const isMaxLevel = level.level === KEGEL_LEVELS.length;

  function handleStart() {
    unlockAudio();
    start(level);
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight pt-2">Kegel</h1>

      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Poziom {level.level} / {KEGEL_LEVELS.length}
            </p>
            <p className="text-base font-heading font-semibold text-ink mt-0.5">
              {isMaxLevel ? 'Program docelowy' : 'W trakcie progresji'}
            </p>
          </div>
          <span className="text-xs font-semibold text-ink-muted shrink-0">
            {completedSessions} {completedSessions === 1 ? 'trening' : 'treningów'}
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          {isMaxLevel
            ? 'Osiągnięto docelowy program — trzymaj ten poziom.'
            : `Jeszcze ${untilNext} ${untilNext === 1 ? 'trening' : 'treningi'} do poziomu ${level.level + 1}.`}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <ExercisePreviewRow label="Rozgrzewka — reverse Kegel" detail="10 powt. · 3s / 3s" />
        <ExercisePreviewRow
          label="Szybkie skurcze"
          detail={`${level.fast.sets} serie × ${level.fast.reps} powt. · 1s / 1s`}
        />
        <ExercisePreviewRow
          label="Skurcze długie"
          detail={`${level.long.sets} serie × ${level.long.reps} powt. · ${level.long.tensionSec}s / 10s`}
        />
        <ExercisePreviewRow
          label="Skurcze progresywne (elevator)"
          detail={`${level.elevator.sets} serie × ${level.elevator.reps} powt. · ${level.elevator.stageHoldSec}s / etap`}
        />
      </div>

      <button
        onClick={handleStart}
        className="w-full py-4 rounded-2xl bg-accent text-accent-contrast font-semibold text-base hover:bg-accent/90 transition-colors"
      >
        Start
      </button>
    </div>
  );
}

function ExercisePreviewRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-muted shrink-0">{detail}</p>
    </div>
  );
}
