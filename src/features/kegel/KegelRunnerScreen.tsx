import { useEffect, useRef, useState } from 'react';
import { useWakeLock } from '../../hooks/useWakeLock';
import { supabase } from '../../lib/supabase';
import { formatSeconds } from '../../lib/time';
import { KEGEL_STEP_KIND_LABELS } from './kegelEngine';
import { useKegelStore } from './kegelStore';

const TICK_MS = 250;

const REST_KINDS = new Set(['setRest', 'exerciseRest']);
const RELAX_KINDS = new Set(['relax', 'elevatorRelax']);

export default function KegelRunnerScreen() {
  const levelNumber = useKegelStore((s) => s.levelNumber);
  const sessionType = useKegelStore((s) => s.sessionType);
  const steps = useKegelStore((s) => s.steps);
  const stepIndex = useKegelStore((s) => s.stepIndex);
  const status = useKegelStore((s) => s.status);
  const phaseEndAt = useKegelStore((s) => s.phaseEndAt);
  const isPaused = useKegelStore((s) => s.isPaused);
  const pausedRemainingMs = useKegelStore((s) => s.pausedRemainingMs);
  const pause = useKegelStore((s) => s.pause);
  const resume = useKegelStore((s) => s.resume);
  const reset = useKegelStore((s) => s.reset);

  const [now, setNow] = useState(() => Date.now());
  const isRunning = status === 'active' && !isPaused;

  useWakeLock(isRunning);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const t = Date.now();
      useKegelStore.getState().tick(t);
      setNow(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        const t = Date.now();
        useKegelStore.getState().tick(t);
        setNow(t);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Logs one row per finished session, for level progression — guarded by a
  // ref since `status` stays 'finished' across re-renders until reset().
  const loggedFinishRef = useRef(false);
  useEffect(() => {
    if (status !== 'finished') {
      loggedFinishRef.current = false;
      return;
    }
    if (loggedFinishRef.current) return;
    loggedFinishRef.current = true;
    supabase
      .from('kegel_logs')
      .insert({ level: levelNumber, session_type: sessionType, completed_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error(error); });
  }, [status, levelNumber, sessionType]);

  if (status === 'finished') {
    return (
      <div className="flex flex-col min-h-full p-4 max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-10">
          <p className="text-5xl">🎉</p>
          <p className="text-xl font-heading font-semibold text-ink">Trening ukończony!</p>
          <p className="text-sm text-ink-muted">
            {sessionType === 'strength' ? 'Trening siłowy' : 'Trening endurance'} — poziom {levelNumber} zaliczony.
          </p>
          <button
            onClick={reset}
            className="w-full py-3.5 rounded-2xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Wróć
          </button>
        </div>
      </div>
    );
  }

  const currentStep = steps[stepIndex];
  if (!currentStep) return null;

  const remainingMs = isPaused
    ? pausedRemainingMs ?? 0
    : phaseEndAt !== null
    ? Math.max(0, phaseEndAt - now)
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const totalStepMs = currentStep.durationMs;
  const progress = totalStepMs > 0 ? 1 - remainingMs / totalStepMs : 0;

  const isRest = REST_KINDS.has(currentStep.kind);
  const isRelax = RELAX_KINDS.has(currentStep.kind);
  const badgeClass = isRest
    ? 'bg-orange-400/15 text-orange-300'
    : isRelax
    ? 'bg-surface-hover text-ink-muted'
    : 'bg-accent/15 text-accent';
  const barClass = isRest ? 'h-full bg-orange-400' : 'h-full bg-accent';

  return (
    <div className="flex flex-col min-h-full p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-2 mb-4">
        <button
          onClick={reset}
          className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink text-xl transition-colors"
        >
          ←
        </button>
        <h1 className="text-lg font-heading font-semibold text-ink tracking-tight truncate flex-1">
          Kegel — {sessionType === 'strength' ? 'Siła' : 'Endurance'} — poziom {levelNumber}
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-6">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
          Krok {stepIndex + 1} / {steps.length}
        </p>

        <div>
          <p className="text-lg font-bold text-ink">{currentStep.exerciseLabel}</p>
          {currentStep.repIndex > 0 && (
            <p className="text-xs text-ink-muted mt-1">
              Seria {currentStep.setIndex}/{currentStep.totalSets}
              {currentStep.totalReps > 1 ? ` · Powt. ${currentStep.repIndex}/${currentStep.totalReps}` : ''}
            </p>
          )}
        </div>

        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${badgeClass}`}>
          {KEGEL_STEP_KIND_LABELS[currentStep.kind]}
        </span>

        {isPaused && <p className="text-sm font-bold text-ink-muted">PAUZA</p>}

        <p className="text-6xl font-heading font-semibold tabular-nums text-ink">{formatSeconds(remainingSeconds)}</p>

        <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden">
          <div className={barClass} style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={isPaused ? resume : pause}
            className="flex-1 py-3.5 rounded-2xl bg-surface-hover text-ink font-semibold text-sm hover:bg-border transition-colors"
          >
            {isPaused ? 'Wznów' : 'Pauza'}
          </button>
          <button
            onClick={reset}
            className="flex-1 py-3.5 rounded-2xl bg-danger text-white font-semibold text-sm hover:bg-danger/90 transition-colors"
          >
            Zakończ
          </button>
        </div>
      </div>
    </div>
  );
}
