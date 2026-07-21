// Web Audio–generated tones for the training runner — no static sound assets.
// The AudioContext must be created/resumed from inside a user-gesture handler
// (the Start button's click) to satisfy iOS/Chrome autoplay policies.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Unlocks the AudioContext — call once from the Start button's click handler. */
export function unlockAudio(): void {
  getCtx();
}

function beep(frequency: number, durationMs: number, volume = 0.2): void {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durationMs / 1000);
}

/** Short tick played on the last 3 seconds ("3, 2, 1") of a phase. */
export function countdownBeep(): void {
  beep(880, 100, 0.2);
}

/** Two-tone chime played on prep→hold and hold→next-prep transitions. */
export function transitionTone(): void {
  beep(440, 200, 0.25);
  setTimeout(() => beep(660, 200, 0.25), 150);
}

/** Ascending chord played when the whole plan is finished. */
export function finishChime(): void {
  [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 220, 0.25), i * 160));
}
