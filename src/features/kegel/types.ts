export type KegelStepKind =
  | 'tension'
  | 'relax'
  | 'reverse' // reverse Kegel: inhale, release and "drop" the perineum
  | 'exhale' // easy exhale back to neutral after a reverse rep
  | 'setRest';

export type KegelExerciseId = 'slow' | 'fast' | 'reverse';

export type KegelPosition = 'lying' | 'sitting' | 'standing' | 'walking' | 'squat';

export interface KegelStep {
  exerciseId: KegelExerciseId;
  exerciseLabel: string;
  kind: KegelStepKind;
  position: KegelPosition;
  setIndex: number;
  totalSets: number;
  repIndex: number;
  totalReps: number;
  durationMs: number;
  index: number;
  total: number;
}

export interface KegelPhaseConfig {
  phase: number;
  name: string;
  /** Series per session — the report's "3× daily" folded into one daily session. */
  seriesCount: number;
  slow: { reps: number; tensionSec: number };
  /** Fast 1s contractions per series (0 = none). */
  fastReps: number;
  /** Position for each series, length === seriesCount. */
  positions: KegelPosition[];
}

export interface KegelLog {
  id: string;
  /** Phase number (1–4) the session was run at; legacy rows hold old levels 1–6. */
  level: number;
  completed_at: string;
}
