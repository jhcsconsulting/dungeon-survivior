let audioContext: AudioContext | undefined;
let masterGain: GainNode | undefined;
let step = 0;

const melody = [196, 233, 262, 311, 262, 233, 175, 208, 196, 233, 294, 349, 294, 233, 175, 147];

function playTone(frequency: number, duration: number, when: number, type: OscillatorType, volume: number): void {
  if (!audioContext || !masterGain) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.03);
}

function playStep(): void {
  if (!audioContext) return;
  const when = audioContext.currentTime + 0.02;
  const note = melody[step % melody.length];
  playTone(note, 0.32, when, 'triangle', 0.16);
  if (step % 4 === 0) playTone(note / 2, 0.7, when, 'sine', 0.1);
  step += 1;
}

export function startBackgroundMusic(): void {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(audioContext.destination);
    playStep();
    window.setInterval(playStep, 420);
  }
  void audioContext.resume();
}
