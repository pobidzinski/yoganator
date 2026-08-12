export type KegelStepKind =
  | 'tension'
  | 'relax'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'elevatorRelax'
  | 'setRest'
  | 'exerciseRest';

export type KegelExerciseId = 'warmup' | 'fast' | 'long' | 'elevator';

export interface KegelStep {
  exerciseId: KegelExerciseId;
  exerciseLabel: string;
  kind: KegelStepKind;
  setIndex: number;
  totalSets: number;
  repIndex: number;
  totalReps: number;
  durationMs: number;
  index: number;
  total: number;
}

export interface KegelLevelConfig {
  level: number;
  fast: { sets: number; reps: number };
  long: { sets: number; reps: number; tensionSec: number };
  elevator: { sets: number; reps: number; stageHoldSec: number };
}

export interface KegelLog {
  id: string;
  level: number;
  completed_at: string;
}
