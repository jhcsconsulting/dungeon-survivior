/**
 * Tiny procedural chiptune loop built on the Web Audio API.
 * No audio assets: a square-wave melody over a triangle bass line.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let step = 0;
let started = false;
let muted = false;

const NOTES: Record<string, number> = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
};

const BPM = 132;
const BEAT = 60 / BPM;

type Note = [string, number];

const MELODY: Note[] = [
  ['G4', 1], ['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1], ['G5', 1], ['E5', 1], ['C5', 1],
  ['G4', 1], ['C5', 1], ['E5', 1], ['G5', 1], ['C5', 1.5], ['G4', 0.5], ['C5', 2],
  ['A4', 1], ['C5', 1], ['E5', 1], ['F5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1],
  ['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1], ['G4', 2], ['C5', 2],
];

const BASS: Note[] = [
  ['C3', 2], ['G3', 2], ['C3', 2], ['G3', 2], ['F3', 2], ['C3', 2], ['G3', 2], ['C3', 2],
];

function ensureContext(): boolean {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.15;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return true;
}

function playTone(freq: number, at: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master || muted || !freq) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(1e-4, at);
  gain.gain.linearRampToValueAtTime(vol, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(8e-4, at + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function tick() {
  if (!started) return;
  if (!ensureContext() || !ctx) {
    setTimeout(tick, 200);
    return;
  }
  const at = ctx.currentTime + 0.06;
  const [note, len] = MELODY[step % MELODY.length];
  playTone(NOTES[note], at, len * BEAT * 0.92, 'square', 0.09);
  if (step % 2 === 0) {
    const [bassNote, bassLen] = BASS[(step / 2) % BASS.length];
    playTone(NOTES[bassNote], at, bassLen * BEAT * 0.95, 'triangle', 0.085);
  }
  step++;
  setTimeout(tick, len * BEAT * 1000);
}

/** Starts the loop (idempotent). Must be called from a user gesture for autoplay policies. */
export function startMusic() {
  if (started) return;
  if (ensureContext()) {
    started = true;
    step = 0;
    tick();
  }
}

/** Toggles mute. Returns the new muted state. */
export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.15;
  return muted;
}
