import { useEffect, useState } from 'react';
import { useWakeLock } from '../../hooks/useWakeLock';
import { unlockAudio } from '../../lib/audio';
import { formatSeconds } from '../../lib/time';
import { useTrainingStore } from './trainingStore';

const TICK_MS = 250;

export default function TrainingRunnerScreen() {
  const planName = useTrainingStore((s) => s.planName);
  const steps = useTrainingStore((s) => s.steps);
  const stepIndex = useTrainingStore((s) => s.stepIndex);
  const phase = useTrainingStore((s) => s.phase);
  const phaseEndAt = useTrainingStore((s) => s.phaseEndAt);
  const isPaused = useTrainingStore((s) => s.isPaused);
  const pausedRemainingMs = useTrainingStore((s) => s.pausedRemainingMs);
  const start = useTrainingStore((s) => s.start);
  const pause = useTrainingStore((s) => s.pause);
  const resume = useTrainingStore((s) => s.resume);
  const reset = useTrainingStore((s) => s.reset);

  const [now, setNow] = useState(() => Date.now());
  const isRunning = (phase === 'prep' || phase === 'hold') && !isPaused;

  useWakeLock(isRunning);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const t = Date.now();
      useTrainingStore.getState().tick(t);
      setNow(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        const t = Date.now();
        useTrainingStore.getState().tick(t);
        setNow(t);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  function handleStart() {
    unlockAudio();
    start();
    setNow(Date.now());
  }

  const currentStep = steps[stepIndex];
  const remainingMs = isPaused
    ? pausedRemainingMs ?? 0
    : phaseEndAt !== null
    ? Math.max(0, phaseEndAt - now)
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const totalPhaseMs = currentStep
    ? (phase === 'prep' ? currentStep.prepSeconds : currentStep.holdSeconds) * 1000
    : 0;
  const progress = totalPhaseMs > 0 ? 1 - remainingMs / totalPhaseMs : 0;

  return (
    <div className="flex flex-col min-h-full p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-2 mb-4">
        <button
          onClick={reset}
          className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink text-xl transition-colors"
        >
          ←
        </button>
        <h1 className="text-lg font-heading font-semibold text-ink tracking-tight truncate flex-1">{planName}</h1>
      </div>

      {phase === 'idle' && currentStep && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-10">
          <div className="w-48 h-48 rounded-2xl overflow-hidden bg-surface border border-border">
            {currentStep.pose.image_url ? (
              <img src={currentStep.pose.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-muted text-5xl">🧘</div>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-muted mb-1">
              {steps.length} {steps.length === 1 ? 'pozycja' : 'pozycji'} w planie
            </p>
            <p className="text-lg font-bold text-ink">{currentStep.pose.name}</p>
          </div>
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-accent text-accent-contrast font-semibold text-base hover:bg-accent/90 transition-colors"
          >
            Start
          </button>
        </div>
      )}

      {(phase === 'prep' || phase === 'hold') && currentStep && (
        <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-6">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
            Pozycja {stepIndex + 1} / {steps.length}
          </p>

          <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-surface border border-border">
            {currentStep.pose.image_url ? (
              <img src={currentStep.pose.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-muted text-6xl">🧘</div>
            )}
            {isPaused && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-sm font-bold text-white">
                PAUZA
              </div>
            )}
          </div>

          <p className="text-xl font-bold text-ink">{currentStep.pose.name}</p>

          <span
            className={[
              'text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full',
              phase === 'prep' ? 'bg-orange-400/15 text-orange-300' : 'bg-accent/15 text-accent',
            ].join(' ')}
          >
            {phase === 'prep' ? 'Przygotowanie' : 'Trzymaj pozycję'}
          </span>

          <p className="text-6xl font-heading font-semibold tabular-nums text-ink">{formatSeconds(remainingSeconds)}</p>

          <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden">
            <div
              className={phase === 'prep' ? 'h-full bg-orange-400' : 'h-full bg-accent'}
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
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
      )}

      {phase === 'finished' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-10">
          <p className="text-5xl">🎉</p>
          <p className="text-xl font-heading font-semibold text-ink">Trening zakończony!</p>
          <p className="text-sm text-ink-muted">
            Ukończono {steps.length} {steps.length === 1 ? 'pozycję' : 'pozycji'}.
          </p>
          <button
            onClick={reset}
            className="w-full py-3.5 rounded-2xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Wróć do planów
          </button>
        </div>
      )}
    </div>
  );
}
