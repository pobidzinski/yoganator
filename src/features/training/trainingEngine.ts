import type { Pose } from '../poses/types';
import type { SessionPlan } from '../plans/types';

export type StepPhase = 'prep' | 'hold';

export interface PlanStep {
  itemId: string;
  pose: Pose;
  prepSeconds: number;
  holdSeconds: number;
  index: number;
  total: number;
}

export function buildSteps(plan: SessionPlan): PlanStep[] {
  const items = [...plan.session_plan_items].sort((a, b) => a.position - b.position);
  return items.map((item, i) => ({
    itemId: item.id,
    pose: item.pose,
    prepSeconds: item.prep_seconds,
    holdSeconds: item.hold_seconds,
    index: i,
    total: items.length,
  }));
}

/** A step with prep_seconds = 0 skips straight to the hold phase. */
export function initialPhaseForStep(step: PlanStep): StepPhase {
  return step.prepSeconds > 0 ? 'prep' : 'hold';
}

export function phaseDurationMs(step: PlanStep, phase: StepPhase): number {
  return (phase === 'prep' ? step.prepSeconds : step.holdSeconds) * 1000;
}

export interface AdvanceResult {
  finished: boolean;
  phase: StepPhase;
  stepIndex: number;
}

/** What comes after the current phase's time is up: the next sub-phase, the next pose, or done. */
export function advance(steps: PlanStep[], phase: StepPhase, stepIndex: number): AdvanceResult {
  if (phase === 'prep') {
    return { finished: false, phase: 'hold', stepIndex };
  }
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) {
    return { finished: true, phase: 'hold', stepIndex };
  }
  const nextStep = steps[nextIndex];
  return { finished: false, phase: initialPhaseForStep(nextStep), stepIndex: nextIndex };
}
