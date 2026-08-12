import { create } from 'zustand';
import { countdownBeep, finishChime, transitionTone } from '../../lib/audio';
import { buildSteps } from './kegelEngine';
import type { KegelLevelConfig, KegelSessionType, KegelStep } from './types';

// Deliberately NOT wrapped in Zustand's `persist` — same reasoning as
// trainingStore: a live countdown has no sensible "resume after an
// unknown-length gap" semantics, so a reload just restarts from the start screen.

export type KegelStatus = 'idle' | 'active' | 'finished';

interface KegelState {
  levelNumber: number | null;
  sessionType: KegelSessionType | null;
  steps: KegelStep[];
  stepIndex: number;
  status: KegelStatus;
  phaseEndAt: number | null; // epoch ms — drift-corrected countdown target
  isPaused: boolean;
  pausedRemainingMs: number | null; // captured at pause, re-based at resume
  lastAnnouncedSecond: number | null; // dedupes the 3/2/1 beep within a 250ms tick

  start: (level: KegelLevelConfig, sessionType: KegelSessionType) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (now: number) => void;
}

export const useKegelStore = create<KegelState>((set, get) => ({
  levelNumber: null,
  sessionType: null,
  steps: [],
  stepIndex: 0,
  status: 'idle',
  phaseEndAt: null,
  isPaused: false,
  pausedRemainingMs: null,
  lastAnnouncedSecond: null,

  start(level, sessionType) {
    const steps = buildSteps(level, sessionType);
    if (steps.length === 0) return;
    set({
      levelNumber: level.level,
      sessionType,
      steps,
      stepIndex: 0,
      status: 'active',
      phaseEndAt: Date.now() + steps[0].durationMs,
      isPaused: false,
      pausedRemainingMs: null,
      lastAnnouncedSecond: null,
    });
    transitionTone();
  },

  pause() {
    const { status, phaseEndAt } = get();
    if (status !== 'active' || phaseEndAt === null) return;
    set({ isPaused: true, pausedRemainingMs: phaseEndAt - Date.now(), phaseEndAt: null });
  },

  resume() {
    const { isPaused, pausedRemainingMs } = get();
    if (!isPaused || pausedRemainingMs === null) return;
    set({ isPaused: false, phaseEndAt: Date.now() + pausedRemainingMs, pausedRemainingMs: null });
  },

  reset() {
    set({
      levelNumber: null,
      sessionType: null,
      steps: [],
      stepIndex: 0,
      status: 'idle',
      phaseEndAt: null,
      isPaused: false,
      pausedRemainingMs: null,
      lastAnnouncedSecond: null,
    });
  },

  tick(now) {
    const state = get();
    if (state.isPaused || state.status !== 'active' || state.phaseEndAt === null) return;

    let stepIndex = state.stepIndex;
    let phaseEndAt = state.phaseEndAt;
    let lastAnnouncedSecond = state.lastAnnouncedSecond;
    let changed = false;

    // Catch-up loop: if the tab was backgrounded through one or more step
    // boundaries, step through each missed boundary instead of freezing.
    while (now >= phaseEndAt) {
      const nextIndex = stepIndex + 1;
      if (nextIndex >= state.steps.length) {
        finishChime();
        set({ status: 'finished', phaseEndAt: null, lastAnnouncedSecond: null });
        return;
      }
      stepIndex = nextIndex;
      phaseEndAt = phaseEndAt + state.steps[stepIndex].durationMs;
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

    if (changed) set({ stepIndex, phaseEndAt, lastAnnouncedSecond });
  },
}));
