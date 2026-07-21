import { create } from 'zustand';
import { countdownBeep, finishChime, transitionTone } from '../../lib/audio';
import { advance, buildSteps, initialPhaseForStep, phaseDurationMs } from './trainingEngine';
import type { PlanStep, StepPhase } from './trainingEngine';
import type { SessionPlan } from '../plans/types';
import type { TrainingPhase } from './types';

// Deliberately NOT wrapped in Zustand's `persist` middleware — unlike PowerLog's
// workoutStore, a live prep/hold countdown has no sensible "resume after an
// unknown-length gap" semantics. If the tab reloads mid-session, restarting
// from the plan-select screen is simpler and correct.

interface TrainingState {
  planId: string | null;
  planName: string | null;
  steps: PlanStep[];
  stepIndex: number;
  phase: TrainingPhase;
  phaseEndAt: number | null;        // epoch ms — drift-corrected countdown target
  isPaused: boolean;
  pausedRemainingMs: number | null; // captured at pause, re-based at resume
  lastAnnouncedSecond: number | null; // dedupes the 3/2/1 beep within a 250ms tick

  loadPlan: (plan: SessionPlan) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (now: number) => void;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  planId: null,
  planName: null,
  steps: [],
  stepIndex: 0,
  phase: 'idle',
  phaseEndAt: null,
  isPaused: false,
  pausedRemainingMs: null,
  lastAnnouncedSecond: null,

  loadPlan(plan) {
    set({
      planId: plan.id,
      planName: plan.name,
      steps: buildSteps(plan),
      stepIndex: 0,
      phase: 'idle',
      phaseEndAt: null,
      isPaused: false,
      pausedRemainingMs: null,
      lastAnnouncedSecond: null,
    });
  },

  start() {
    const { steps } = get();
    if (steps.length === 0) return;
    const first = steps[0];
    const phase = initialPhaseForStep(first);
    set({
      stepIndex: 0,
      phase,
      phaseEndAt: Date.now() + phaseDurationMs(first, phase),
      isPaused: false,
      pausedRemainingMs: null,
      lastAnnouncedSecond: null,
    });
    transitionTone();
  },

  pause() {
    const { phase, phaseEndAt } = get();
    if (phase === 'idle' || phase === 'finished' || phaseEndAt === null) return;
    set({ isPaused: true, pausedRemainingMs: phaseEndAt - Date.now(), phaseEndAt: null });
  },

  resume() {
    const { isPaused, pausedRemainingMs } = get();
    if (!isPaused || pausedRemainingMs === null) return;
    set({ isPaused: false, phaseEndAt: Date.now() + pausedRemainingMs, pausedRemainingMs: null });
  },

  reset() {
    set({
      planId: null,
      planName: null,
      steps: [],
      stepIndex: 0,
      phase: 'idle',
      phaseEndAt: null,
      isPaused: false,
      pausedRemainingMs: null,
      lastAnnouncedSecond: null,
    });
  },

  tick(now) {
    const state = get();
    if (state.isPaused || state.phase === 'idle' || state.phase === 'finished') return;
    if (state.phaseEndAt === null) return;

    let phase = state.phase as StepPhase;
    let stepIndex = state.stepIndex;
    let phaseEndAt = state.phaseEndAt;
    let lastAnnouncedSecond = state.lastAnnouncedSecond;
    let changed = false;

    // Catch-up loop: if the tab was backgrounded through one or more phase
    // boundaries, step through each missed boundary instead of freezing.
    while (now >= phaseEndAt) {
      const result = advance(state.steps, phase, stepIndex);
      if (result.finished) {
        finishChime();
        set({ phase: 'finished', phaseEndAt: null, lastAnnouncedSecond: null });
        return;
      }
      phase = result.phase;
      stepIndex = result.stepIndex;
      const step = state.steps[stepIndex];
      phaseEndAt = phaseEndAt + phaseDurationMs(step, phase);
      lastAnnouncedSecond = null;
      changed = true;
      transitionTone();
    }

    const remainingSec = Math.ceil((phaseEndAt - now) / 1000);
    if (remainingSec >= 1 && remainingSec <= 3 && remainingSec !== lastAnnouncedSecond) {
      countdownBeep();
      lastAnnouncedSecond = remainingSec;
      changed = true;
    }

    if (changed) set({ phase, stepIndex, phaseEndAt, lastAnnouncedSecond });
  },
}));
