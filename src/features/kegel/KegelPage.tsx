import { useEffect, useState } from 'react';
import { unlockAudio } from '../../lib/audio';
import { supabase } from '../../lib/supabase';
import {
  contractionsPerSession,
  FAST_LABEL,
  getProgress,
  hasSessionOn,
  KEGEL_PHASES,
  KEGEL_POSITION_LABELS,
  REVERSE_LABEL,
  slowLabel,
} from './kegelEngine';
import { useKegelStore } from './kegelStore';
import KegelRunnerScreen from './KegelRunnerScreen';

interface LogRow {
  completed_at: string;
}

export default function KegelPage() {
  const status = useKegelStore((s) => s.status);
  const start = useKegelStore((s) => s.start);

  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [identificationAck, setIdentificationAck] = useState(false);
  const [showIdentification, setShowIdentification] = useState(false);

  useEffect(() => {
    if (status !== 'idle') return;
    let cancelled = false;
    supabase
      .from('kegel_logs')
      .select('completed_at')
      .order('completed_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setLogs((data as LogRow[]) ?? []); });
    return () => { cancelled = true; };
  }, [status]);

  if (status !== 'idle') return <KegelRunnerScreen />;

  if (logs === null) {
    return <p className="text-center text-ink-muted text-sm py-10">Ładowanie…</p>;
  }

  const now = new Date();
  const { phase, week, trainingDays, nextGate } = getProgress(logs, now);
  const doneToday = hasSessionOn(logs, now);
  const isFirstSession = logs.length === 0;
  const needsIdentification = isFirstSession && !identificationAck;

  function handleStart() {
    unlockAudio();
    start(phase);
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight pt-2">Kegel</h1>

      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Faza {phase.phase} / {KEGEL_PHASES.length}
            </p>
            <p className="text-base font-heading font-semibold text-ink mt-0.5">{phase.name}</p>
          </div>
          <span className="text-xs font-semibold text-ink-muted shrink-0 text-right">
            {week > 0 ? `Tydzień ${week}` : 'Start'}
            <br />
            {trainingDays} {trainingDays === 1 ? 'dzień' : 'dni'} treningu
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          {nextGate
            ? `Faza ${nextGate.phase}: od tygodnia ${nextGate.minWeek} i po ${nextGate.minDays} dniach treningu (masz ${trainingDays}/${nextGate.minDays}).`
            : 'Program 12-tygodniowy ukończony — 1 sesja dziennie na utrzymanie.'}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">Dzisiejsza sesja</p>
          <p className="text-xs text-ink-muted">{contractionsPerSession(phase)} skurczów</p>
        </div>
        {phase.positions.map((position, i) => (
          <div key={i} className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
              Seria {i + 1} · {KEGEL_POSITION_LABELS[position]}
            </p>
            <ExercisePreviewRow label={slowLabel(phase)} detail={`${phase.slow.reps} × ${phase.slow.tensionSec}s / 10s`} />
            {phase.fastReps > 0 && <ExercisePreviewRow label={FAST_LABEL} detail={`${phase.fastReps} × 1s / 2s`} />}
            <ExercisePreviewRow label={REVERSE_LABEL} detail="5 × wdech 6s / wydech 4s" />
          </div>
        ))}
        {phase.phase === 3 && (
          <p className="text-xs text-ink-muted border-t border-border pt-3">
            Poza aplikacją: 3–5 świadomych skurczów IC po 5 s podczas erekcji.
          </p>
        )}
      </div>

      <TechniqueCard />

      {needsIdentification ? (
        <IdentificationCard onAck={() => setIdentificationAck(true)} />
      ) : (
        <>
          {!isFirstSession && (
            <button
              onClick={() => setShowIdentification((v) => !v)}
              className="text-xs text-ink-muted underline underline-offset-4 self-start"
            >
              {showIdentification ? 'Ukryj instrukcję' : 'Jak wyizolować mięsień?'}
            </button>
          )}
          {showIdentification && <IdentificationCard />}

          <p className="text-xs text-ink-muted text-center">Przed startem: opróżnij pęcherz.</p>
          <button
            onClick={handleStart}
            disabled={doneToday}
            className="w-full py-4 rounded-2xl bg-accent text-accent-contrast font-semibold text-base hover:bg-accent/90 transition-colors disabled:bg-surface-hover disabled:text-ink-muted"
          >
            {doneToday ? 'Dziś zrobione ✓ — wróć jutro' : 'Start'}
          </button>
        </>
      )}
    </div>
  );
}

function ExercisePreviewRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-muted shrink-0">{detail}</p>
    </div>
  );
}

function TechniqueCard() {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Technika</p>
      <ul className="text-sm text-ink flex flex-col gap-1 list-disc pl-5">
        <li>Pośladki, brzuch i przywodziciele luźne.</li>
        <li>Oddychaj swobodnie — bez wstrzymywania oddechu (Valsalvy).</li>
        <li>Rozluźnienie jest tak samo ważne jak skurcz.</li>
        <li>Po treningu siłowym: same rozluźnienia i oddech przeponowy.</li>
      </ul>
    </div>
  );
}

function IdentificationCard({ onAck }: { onAck?: () => void }) {
  return (
    <div className="bg-surface border border-accent/40 rounded-xl px-4 py-4 flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-accent">Identyfikacja mięśnia</p>
      <ol className="text-sm text-ink flex flex-col gap-1.5 list-decimal pl-5">
        <li>Zatrzymaj strumień moczu tylko raz, jako test. Nie rób tego jako ćwiczenia.</li>
        <li>Test w staniu: przy prawidłowym skurczu prącie się unosi, a jądra „wciągają”.</li>
        <li>Pośladki, przywodziciele i brzuch zostają luźne, oddech swobodny.</li>
        <li>Jeśli w ciągu 2 tygodni nie wyczujesz izolowanego skurczu albo pojawi się ból krocza, jąder lub przy wytrysku, przerwij skurcze i idź do fizjoterapeuty urologicznego.</li>
      </ol>
      {onAck && (
        <button
          onClick={onAck}
          className="w-full py-3.5 rounded-2xl bg-accent text-accent-contrast font-semibold text-sm hover:bg-accent/90 transition-colors"
        >
          Rozumiem, zaczynam
        </button>
      )}
    </div>
  );
}
