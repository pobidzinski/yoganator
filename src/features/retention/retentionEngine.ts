// Pure functions for the semen retention phase model — no I/O, easy to test
// in isolation, mirroring the trainingEngine.ts pattern used for the workout
// sequencer.

export interface RetentionPhase {
  key: 'recovery' | 'balance' | 'power-up' | 'effortless' | 'ascension';
  label: string;
  dayRangeLabel: string;
  startDay: number; // inclusive, 0-indexed elapsed days
  endDay: number | null; // exclusive; null = open-ended (no upper bound)
  description: string;
}

export const RETENTION_PHASES: RetentionPhase[] = [
  {
    key: 'recovery',
    label: 'Faza regeneracji',
    dayRangeLabel: 'Dni 1–4',
    startDay: 0,
    endDay: 4,
    description:
      'Organizm regeneruje energię i składniki odżywcze zużyte na produkcję nasienia. To normalne, że pojawia się spadek motywacji, lekki niepokój i „mgła mózgowa” — mózg sygnalizuje, że misja została wykonana, więc łatwo o bezmyślne scrollowanie zamiast działania.',
  },
  {
    key: 'balance',
    label: 'Faza równowagi',
    dayRangeLabel: 'Dni 5–9',
    startDay: 4,
    endDay: 9,
    description:
      'Ciało wraca do homeostazy, energia i napęd wracają do normy. To zarazem okres najwyższego ryzyka nawrotu — silne pokusy wymagają świadomej dyscypliny.',
  },
  {
    key: 'power-up',
    label: 'Faza doładowania',
    dayRangeLabel: 'Dni 10–14',
    startDay: 9,
    endDay: 14,
    description:
      'Poziom energii wyraźnie rośnie — łatwiej wstać rano, głos i pewność siebie stają się bardziej wyraziste, rośnie testosteron. Dzień 14 to punkt zwrotny — uważaj na nadmierną pewność siebie, wskazana jest pokora.',
  },
  {
    key: 'effortless',
    label: 'Faza bezwysiłkowa',
    dayRangeLabel: 'Dni 15–90',
    startDay: 14,
    endDay: 90,
    description:
      'Wysoka energia, ale już pod kontrolą, bez napięcia. Spada lęk społeczny, rośnie wewnętrzny spokój i docenianie prostych rzeczy — energia zaczyna być cenną wewnętrzną walutą.',
  },
  {
    key: 'ascension',
    label: 'Faza wzniesienia',
    dayRangeLabel: 'Powyżej 90 dni',
    startDay: 90,
    endDay: null,
    description:
      'Poczucie nowej tożsamości — dawna, niepewna wersja siebie odchodzi. Samokontrola ułatwia rzucanie innych nałogów, a życie staje się lżejsze i bardziej klarowne w swoim kierunku.',
  },
];

export interface ElapsedDuration {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
}

/** Never negative — a picked time in the future clamps to a zero duration. */
export function getElapsed(now: number, lastResetAt: number): ElapsedDuration {
  const totalMs = Math.max(0, now - lastResetAt);
  const totalMinutes = Math.floor(totalMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { totalMs, days, hours, minutes };
}

export function getPhaseForElapsedDays(elapsedDays: number): RetentionPhase {
  return (
    RETENTION_PHASES.find((p) => elapsedDays >= p.startDay && (p.endDay === null || elapsedDays < p.endDay)) ??
    RETENTION_PHASES[RETENTION_PHASES.length - 1]
  );
}

/** Fraction (0–1) of the current phase elapsed so far; 0 for an open-ended phase. */
export function getPhaseProgress(elapsedDaysFractional: number, phase: RetentionPhase): number {
  if (phase.endDay === null) return 0;
  const span = phase.endDay - phase.startDay;
  return Math.min(1, Math.max(0, (elapsedDaysFractional - phase.startDay) / span));
}

/** Days + hours left until the phase ends; null for an open-ended phase. */
export function getPhaseRemaining(
  elapsedDaysFractional: number,
  phase: RetentionPhase
): { days: number; hours: number } | null {
  if (phase.endDay === null) return null;
  const remainingDaysFractional = Math.max(0, phase.endDay - elapsedDaysFractional);
  const days = Math.floor(remainingDaysFractional);
  const hours = Math.round((remainingDaysFractional - days) * 24);
  return { days, hours };
}
