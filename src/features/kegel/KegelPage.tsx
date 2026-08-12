import { useEffect, useState } from 'react';
import { unlockAudio } from '../../lib/audio';
import { supabase } from '../../lib/supabase';
import { getLevelForSessionCount, getNextSessionType, KEGEL_LEVELS, sessionsUntilNextLevel } from './kegelEngine';
import { useKegelStore } from './kegelStore';
import KegelRunnerScreen from './KegelRunnerScreen';
import type { KegelSessionType } from './types';

interface LogRow {
  session_type: KegelSessionType;
  completed_at: string;
}

export default function KegelPage() {
  const status = useKegelStore((s) => s.status);
  const start = useKegelStore((s) => s.start);

  const [logs, setLogs] = useState<LogRow[] | null>(null);

  useEffect(() => {
    if (status !== 'idle') return;
    let cancelled = false;
    supabase
      .from('kegel_logs')
      .select('session_type, completed_at')
      .order('completed_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setLogs((data as LogRow[]) ?? []); });
    return () => { cancelled = true; };
  }, [status]);

  if (status !== 'idle') return <KegelRunnerScreen />;

  if (logs === null) {
    return <p className="text-center text-ink-muted text-sm py-10">Ładowanie…</p>;
  }

  const completedSessions = logs.length;
  const level = getLevelForSessionCount(completedSessions);
  const untilNext = sessionsUntilNextLevel(completedSessions);
  const isMaxLevel = level.level === KEGEL_LEVELS.length;
  const nextType = getNextSessionType(logs[0]?.session_type ?? null);
  const isStrength = nextType === 'strength';

  function handleStart() {
    unlockAudio();
    start(level, nextType);
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

      <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center justify-between">
        <p className="text-sm text-ink-muted">Dziś trening</p>
        <span
          className={[
            'text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full',
            isStrength ? 'bg-accent/15 text-accent' : 'bg-accent-2/15 text-accent-2',
          ].join(' ')}
        >
          {isStrength ? 'Siła' : 'Endurance'}
        </span>
      </div>

      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <ExercisePreviewRow label="Rozgrzewka — reverse Kegel" detail="10 powt. · 3s / 3s" />
        {isStrength ? (
          <>
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
          </>
        ) : (
          <ExercisePreviewRow
            label="Skurcze wytrzymałościowe (~50% siły)"
            detail={`${level.endurance.sets} serie × trzymanie ${level.endurance.holdSec}s`}
          />
        )}
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
