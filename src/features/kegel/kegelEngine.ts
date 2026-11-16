// Pure functions for the Kegel trainer — no I/O, mirrors the trainingEngine.ts
// / retentionEngine.ts pattern. A phase's program is fully deterministic, so
// the whole session is expanded up front into a flat step list instead of a
// per-step state machine.
//
// Protocol: 12-week progressive PFMT (learning → strength → function →
// maintenance). Relaxation is always at least as long as the contraction and
// every series ends with reverse Kegel, to avoid pelvic-floor hypertonia
// (relevant with heavy bracing / Valsalva in strength training). One session
// per day, capped at MAX_DAILY_CONTRACTIONS.
import { dateKey, startOfDay } from '../calendar/calendarEngine';
import type { KegelExerciseId, KegelPhaseConfig, KegelPosition, KegelStep, KegelStepKind } from './types';

export const MAX_DAILY_CONTRACTIONS = 45;

const SLOW_RELAX_SEC = 10;
const FAST_TENSION_SEC = 1;
const FAST_RELAX_SEC = 2;
const REVERSE_REPS = 5;
const REVERSE_INHALE_SEC = 6;
const REVERSE_EXHALE_SEC = 4;
const SERIES_REST_SEC = 20;

export const KEGEL_PHASES: KegelPhaseConfig[] = [
  { phase: 1, name: 'Nauka', seriesCount: 3, slow: { reps: 10, tensionSec: 5 }, fastReps: 0, positions: ['lying', 'lying', 'lying'] },
  { phase: 2, name: 'Siła', seriesCount: 3, slow: { reps: 10, tensionSec: 8 }, fastReps: 5, positions: ['lying', 'sitting', 'standing'] },
  { phase: 3, name: 'Funkcja', seriesCount: 3, slow: { reps: 10, tensionSec: 10 }, fastReps: 5, positions: ['standing', 'walking', 'squat'] },
  { phase: 4, name: 'Utrzymanie', seriesCount: 1, slow: { reps: 10, tensionSec: 10 }, fastReps: 5, positions: ['standing'] },
];

/**
 * Entry conditions per phase: both the calendar week (counted from the first
 * logged session) AND the number of distinct training days must be reached,
 * so a break in training holds the phase instead of skipping ahead.
 */
export const KEGEL_PHASE_GATES: { phase: number; minWeek: number; minDays: number }[] = [
  { phase: 2, minWeek: 3, minDays: 10 },
  { phase: 3, minWeek: 7, minDays: 30 },
  { phase: 4, minWeek: 13, minDays: 60 },
];

export const KEGEL_STEP_KIND_LABELS: Record<KegelStepKind, string> = {
  tension: 'Napięcie',
  relax: 'Rozluźnienie',
  reverse: 'Wdech — opuść krocze',
  exhale: 'Swobodny wydech',
  setRest: 'Zmień pozycję',
};

export const KEGEL_POSITION_LABELS: Record<KegelPosition, string> = {
  lying: '🛌 Leżenie na plecach',
  sitting: '🪑 Siad',
  standing: '🧍 Stanie',
  walking: '🚶 Chód',
  squat: '🏋️ Przysiad z masą ciała',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface KegelProgress {
  phase: KegelPhaseConfig;
  /** 1-based week since the first logged session; 0 with no history. */
  week: number;
  trainingDays: number;
  nextGate: { phase: number; minWeek: number; minDays: number } | null;
}

/** Derives the current phase from the completion log (any order). */
export function getProgress(logs: { completed_at: string }[], now: Date): KegelProgress {
  const days = new Set(logs.map((l) => dateKey(new Date(l.completed_at))));
  const trainingDays = days.size;

  let week = 0;
  if (logs.length > 0) {
    const firstMs = Math.min(...logs.map((l) => new Date(l.completed_at).getTime()));
    const elapsedDays = Math.round((startOfDay(now).getTime() - startOfDay(new Date(firstMs)).getTime()) / DAY_MS);
    week = Math.floor(elapsedDays / 7) + 1;
  }

  let phaseNumber = 1;
  for (const gate of KEGEL_PHASE_GATES) {
    if (week >= gate.minWeek && trainingDays >= gate.minDays) phaseNumber = gate.phase;
    else break;
  }

  return {
    phase: KEGEL_PHASES[phaseNumber - 1],
    week,
    trainingDays,
    nextGate: KEGEL_PHASE_GATES.find((g) => g.phase === phaseNumber + 1) ?? null,
  };
}

/** One session per day — true when a session is already logged for today's local date. */
export function hasSessionOn(logs: { completed_at: string }[], day: Date): boolean {
  const key = dateKey(day);
  return logs.some((l) => dateKey(new Date(l.completed_at)) === key);
}

export function contractionsPerSession(phase: KegelPhaseConfig): number {
  return phase.seriesCount * (phase.slow.reps + phase.fastReps);
}

export function slowLabel(phase: KegelPhaseConfig): string {
  return phase.phase === 1 ? 'Skurcze wolne' : 'Skurcze maksymalne';
}
export const FAST_LABEL = 'Szybkie skurcze';
export const REVERSE_LABEL = 'Reverse Kegel — rozluźnienie';

type RawStep = Omit<KegelStep, 'index' | 'total'>;

function pushReps(
  raw: RawStep[],
  base: { exerciseId: KegelExerciseId; exerciseLabel: string; position: KegelPosition; setIndex: number; totalSets: number },
  totalReps: number,
  repKinds: { kind: KegelStepKind; durationSec: number }[]
): void {
  for (let rep = 1; rep <= totalReps; rep++) {
    for (const { kind, durationSec } of repKinds) {
      raw.push({ ...base, kind, repIndex: rep, totalReps, durationMs: durationSec * 1000 });
    }
  }
}

/** Expands a phase config into the full ordered list of steps for one session. */
export function buildSteps(phase: KegelPhaseConfig): KegelStep[] {
  const raw: RawStep[] = [];
  const totalSets = phase.seriesCount;

  for (let set = 1; set <= totalSets; set++) {
    const position = phase.positions[set - 1];
    const base = { position, setIndex: set, totalSets };

    pushReps(raw, { ...base, exerciseId: 'slow', exerciseLabel: slowLabel(phase) }, phase.slow.reps, [
      { kind: 'tension', durationSec: phase.slow.tensionSec },
      { kind: 'relax', durationSec: SLOW_RELAX_SEC },
    ]);

    if (phase.fastReps > 0) {
      pushReps(raw, { ...base, exerciseId: 'fast', exerciseLabel: FAST_LABEL }, phase.fastReps, [
        { kind: 'tension', durationSec: FAST_TENSION_SEC },
        { kind: 'relax', durationSec: FAST_RELAX_SEC },
      ]);
    }

    pushReps(raw, { ...base, exerciseId: 'reverse', exerciseLabel: REVERSE_LABEL }, REVERSE_REPS, [
      { kind: 'reverse', durationSec: REVERSE_INHALE_SEC },
      { kind: 'exhale', durationSec: REVERSE_EXHALE_SEC },
    ]);

    if (set < totalSets) {
      // Rest step carries the NEXT series' position so the runner can say where to move.
      raw.push({
        exerciseId: 'reverse',
        exerciseLabel: 'Przerwa między seriami',
        kind: 'setRest',
        position: phase.positions[set],
        setIndex: set + 1,
        totalSets,
        repIndex: 0,
        totalReps: 0,
        durationMs: SERIES_REST_SEC * 1000,
      });
    }
  }

  return raw.map((step, i) => ({ ...step, index: i, total: raw.length }));
}
