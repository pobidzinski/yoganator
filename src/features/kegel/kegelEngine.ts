// Pure functions for the Kegel trainer — no I/O, mirrors the trainingEngine.ts
// / retentionEngine.ts pattern. Unlike trainingEngine (user-authored plans),
// a level's program is fully deterministic, so the whole session is expanded
// up front into a flat step list instead of a per-step state machine.
import type { KegelExerciseId, KegelLevelConfig, KegelSessionType, KegelStep, KegelStepKind } from './types';

export const SESSIONS_PER_LEVEL = 3;

const WARMUP_REPS = 10;
const WARMUP_TENSION_SEC = 3;
const WARMUP_RELAX_SEC = 3;
const SET_REST_SEC = 15;
const EXERCISE_REST_SEC = 60;
const LONG_RELAX_SEC = 10;
const ELEVATOR_RELAX_SEC = 5;
const FAST_TENSION_SEC = 1;
const FAST_RELAX_SEC = 1;
const ENDURANCE_RELAX_SEC = 5;
const ENDURANCE_SET_REST_SEC = 60;

/**
 * Progression toward the target program (level 6). Sets/reps/hold times ramp
 * up; rest durations and the warm-up stay fixed at every level. `strength`
 * (fast + long + elevator) and `endurance` (long submaximal holds) are
 * separate session types that alternate automatically — see
 * `getNextSessionType` — but share this single level/progression table.
 */
export const KEGEL_LEVELS: KegelLevelConfig[] = [
  { level: 1, fast: { sets: 2, reps: 10 }, long: { sets: 2, reps: 6, tensionSec: 5 }, elevator: { sets: 1, reps: 4, stageHoldSec: 1.5 }, endurance: { sets: 2, holdSec: 20 } },
  { level: 2, fast: { sets: 2, reps: 12 }, long: { sets: 2, reps: 7, tensionSec: 5 }, elevator: { sets: 1, reps: 5, stageHoldSec: 2 }, endurance: { sets: 2, holdSec: 30 } },
  { level: 3, fast: { sets: 3, reps: 13 }, long: { sets: 2, reps: 8, tensionSec: 6 }, elevator: { sets: 1, reps: 6, stageHoldSec: 2 }, endurance: { sets: 2, holdSec: 40 } },
  { level: 4, fast: { sets: 3, reps: 15 }, long: { sets: 3, reps: 8, tensionSec: 7 }, elevator: { sets: 2, reps: 6, stageHoldSec: 2.5 }, endurance: { sets: 3, holdSec: 45 } },
  { level: 5, fast: { sets: 3, reps: 17 }, long: { sets: 3, reps: 9, tensionSec: 8 }, elevator: { sets: 2, reps: 7, stageHoldSec: 2.5 }, endurance: { sets: 3, holdSec: 50 } },
  { level: 6, fast: { sets: 3, reps: 20 }, long: { sets: 3, reps: 10, tensionSec: 10 }, elevator: { sets: 2, reps: 8, stageHoldSec: 3 }, endurance: { sets: 3, holdSec: 60 } },
];

export const KEGEL_STEP_KIND_LABELS: Record<KegelStepKind, string> = {
  tension: 'Napięcie',
  relax: 'Rozluźnienie',
  stage1: 'Etap 1 (25%)',
  stage2: 'Etap 2 (50%)',
  stage3: 'Etap 3 (100%)',
  elevatorRelax: 'Powolne rozluźnienie',
  setRest: 'Przerwa między seriami',
  exerciseRest: 'Przerwa między ćwiczeniami',
};

/** Level for the number of already-completed Kegel sessions (both types combined); caps at (and stays on) the max level. */
export function getLevelForSessionCount(completedSessions: number): KegelLevelConfig {
  const index = Math.min(KEGEL_LEVELS.length - 1, Math.floor(completedSessions / SESSIONS_PER_LEVEL));
  return KEGEL_LEVELS[index];
}

/** Sessions left to reach the next level; null once at the max level. */
export function sessionsUntilNextLevel(completedSessions: number): number | null {
  const index = Math.min(KEGEL_LEVELS.length - 1, Math.floor(completedSessions / SESSIONS_PER_LEVEL));
  if (index >= KEGEL_LEVELS.length - 1) return null;
  return (index + 1) * SESSIONS_PER_LEVEL - completedSessions;
}

/** Strength and endurance are distinct training stimuli, so sessions alternate automatically rather than being combined or user-picked. Defaults to 'strength' with no history. */
export function getNextSessionType(lastType: KegelSessionType | null): KegelSessionType {
  return lastType === 'strength' ? 'endurance' : 'strength';
}

type RawStep = Omit<KegelStep, 'index' | 'total'>;

function restStep(
  exerciseId: KegelExerciseId,
  exerciseLabel: string,
  kind: 'setRest' | 'exerciseRest',
  setIndex: number,
  totalSets: number,
  durationSec: number
): RawStep {
  return { exerciseId, exerciseLabel, kind, setIndex, totalSets, repIndex: 0, totalReps: 0, durationMs: durationSec * 1000 };
}

function pushSets(
  raw: RawStep[],
  exerciseId: KegelExerciseId,
  exerciseLabel: string,
  totalSets: number,
  totalReps: number,
  repKinds: { kind: KegelStepKind; durationMs: number }[],
  setRestSec: number = SET_REST_SEC
): void {
  for (let set = 1; set <= totalSets; set++) {
    for (let rep = 1; rep <= totalReps; rep++) {
      for (const { kind, durationMs } of repKinds) {
        raw.push({ exerciseId, exerciseLabel, kind, setIndex: set, totalSets, repIndex: rep, totalReps, durationMs });
      }
    }
    if (set < totalSets) {
      raw.push(restStep(exerciseId, exerciseLabel, 'setRest', set + 1, totalSets, setRestSec));
    }
  }
}

const WARMUP_LABEL = 'Rozgrzewka — reverse Kegel';

function pushWarmup(raw: RawStep[]): void {
  for (let rep = 1; rep <= WARMUP_REPS; rep++) {
    raw.push({ exerciseId: 'warmup', exerciseLabel: WARMUP_LABEL, kind: 'tension', setIndex: 1, totalSets: 1, repIndex: rep, totalReps: WARMUP_REPS, durationMs: WARMUP_TENSION_SEC * 1000 });
    raw.push({ exerciseId: 'warmup', exerciseLabel: WARMUP_LABEL, kind: 'relax', setIndex: 1, totalSets: 1, repIndex: rep, totalReps: WARMUP_REPS, durationMs: WARMUP_RELAX_SEC * 1000 });
  }
  raw.push(restStep('warmup', WARMUP_LABEL, 'exerciseRest', 1, 1, EXERCISE_REST_SEC));
}

function buildStrengthSteps(level: KegelLevelConfig): RawStep[] {
  const raw: RawStep[] = [];
  pushWarmup(raw);

  const fastLabel = 'Szybkie skurcze';
  pushSets(raw, 'fast', fastLabel, level.fast.sets, level.fast.reps, [
    { kind: 'tension', durationMs: FAST_TENSION_SEC * 1000 },
    { kind: 'relax', durationMs: FAST_RELAX_SEC * 1000 },
  ]);
  raw.push(restStep('fast', fastLabel, 'exerciseRest', level.fast.sets, level.fast.sets, EXERCISE_REST_SEC));

  const longLabel = 'Skurcze długie';
  pushSets(raw, 'long', longLabel, level.long.sets, level.long.reps, [
    { kind: 'tension', durationMs: level.long.tensionSec * 1000 },
    { kind: 'relax', durationMs: LONG_RELAX_SEC * 1000 },
  ]);
  raw.push(restStep('long', longLabel, 'exerciseRest', level.long.sets, level.long.sets, EXERCISE_REST_SEC));

  const elevatorLabel = 'Skurcze progresywne (elevator)';
  pushSets(raw, 'elevator', elevatorLabel, level.elevator.sets, level.elevator.reps, [
    { kind: 'stage1', durationMs: level.elevator.stageHoldSec * 1000 },
    { kind: 'stage2', durationMs: level.elevator.stageHoldSec * 1000 },
    { kind: 'stage3', durationMs: level.elevator.stageHoldSec * 1000 },
    { kind: 'elevatorRelax', durationMs: ELEVATOR_RELAX_SEC * 1000 },
  ]);
  // No rest after the last exercise — the session ends here.

  return raw;
}

function buildEnduranceSteps(level: KegelLevelConfig): RawStep[] {
  const raw: RawStep[] = [];
  pushWarmup(raw);

  const enduranceLabel = 'Skurcze wytrzymałościowe (~50% siły)';
  pushSets(
    raw,
    'endurance',
    enduranceLabel,
    level.endurance.sets,
    1, // one long hold per set, not a rep loop
    [
      { kind: 'tension', durationMs: level.endurance.holdSec * 1000 },
      { kind: 'relax', durationMs: ENDURANCE_RELAX_SEC * 1000 },
    ],
    ENDURANCE_SET_REST_SEC
  );
  // No rest after the last set — the session ends here.

  return raw;
}

/** Expands a level config + session type into the full ordered list of steps for one session. */
export function buildSteps(level: KegelLevelConfig, sessionType: KegelSessionType): KegelStep[] {
  const raw = sessionType === 'endurance' ? buildEnduranceSteps(level) : buildStrengthSteps(level);
  return raw.map((step, i) => ({ ...step, index: i, total: raw.length }));
}
