/**
 * Notification sound service for LootBound.
 *
 * Uses Web Audio API to synthesize short sound effects at runtime.
 * The victory sound is loaded from a file since it's a longer,
 * more complex sound effect.
 *
 * iOS Safari requires one Audio.play() call inside a user gesture
 * to activate the audio session. After that, non-gesture plays
 * (like Firestore listener callbacks) work while the page is
 * in the foreground.
 */

const SOUND_KEYS = ['success', 'error', 'approval', 'levelup', 'streak', 'victory'] as const;
export type SoundKey = (typeof SOUND_KEYS)[number];

let audioCtx: AudioContext | null = null;
let unlocked = false;
let victoryAudio: HTMLAudioElement | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(freq: number, duration: number, startTime: number, type: OscillatorType = 'sine', gain = 0.3) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

const SYNTHS: Record<string, () => void> = {
  success() {
    const ctx = getCtx();
    const t = ctx.currentTime;
    tone(523, 0.12, t, 'sine', 0.25);        // C5
    tone(659, 0.12, t + 0.1, 'sine', 0.25);  // E5
    tone(784, 0.2, t + 0.2, 'sine', 0.3);    // G5
  },
  error() {
    const ctx = getCtx();
    const t = ctx.currentTime;
    tone(330, 0.15, t, 'square', 0.15);       // E4
    tone(262, 0.25, t + 0.15, 'square', 0.15); // C4
  },
  approval() {
    const ctx = getCtx();
    const t = ctx.currentTime;
    tone(440, 0.1, t, 'sine', 0.2);           // A4
    tone(554, 0.1, t + 0.08, 'sine', 0.2);    // C#5
    tone(659, 0.15, t + 0.16, 'sine', 0.25);  // E5
  },
  levelup() {
    const ctx = getCtx();
    const t = ctx.currentTime;
    tone(523, 0.1, t, 'sine', 0.25);          // C5
    tone(659, 0.1, t + 0.08, 'sine', 0.25);   // E5
    tone(784, 0.1, t + 0.16, 'sine', 0.25);   // G5
    tone(1047, 0.3, t + 0.24, 'sine', 0.3);   // C6
  },
  streak() {
    const ctx = getCtx();
    const t = ctx.currentTime;
    tone(392, 0.1, t, 'triangle', 0.2);       // G4
    tone(494, 0.1, t + 0.1, 'triangle', 0.2); // B4
    tone(587, 0.1, t + 0.2, 'triangle', 0.25);// D5
    tone(784, 0.2, t + 0.3, 'triangle', 0.3); // G5
  },
};

const SILENT_MP3 =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhgFJSdkAAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhgFJSdkAAAAAAAAAAAAAAAAAAAAA';

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  try {
    // Unlock HTML Audio for iOS Safari
    const silent = new Audio(SILENT_MP3);
    silent.volume = 0.01;
    silent.play().catch(() => {});
    // Create and/or resume AudioContext (may not exist yet if preloadSounds hasn't run)
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (_e) {
    /* ignore */
  }
}

export function preloadSounds(): void {
  // Initialize AudioContext early
  getCtx();
  // Preload the victory file
  if (!victoryAudio) {
    victoryAudio = new Audio('/sounds/victory.mp3');
    victoryAudio.preload = 'auto';
    victoryAudio.load();
  }
}

export function playSound(key: SoundKey): void {
  if (key === 'victory') {
    if (!victoryAudio) {
      victoryAudio = new Audio('/sounds/victory.mp3');
    }
    victoryAudio.currentTime = 0;
    victoryAudio.volume = 1;
    victoryAudio.play().catch(() => {});
    return;
  }

  // Resume AudioContext if suspended (iOS Safari)
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const synth = SYNTHS[key];
  if (synth) synth();
}

export function notifTypeToSound(type: string): SoundKey {
  if (type === 'mission_complete') return 'success';
  if (type === 'mission_rejected') return 'error';
  if (type === 'loot_request' || type === 'loot_approved' || type === 'loot_denied') return 'approval';
  if (type === 'level_up') return 'levelup';
  if (type === 'streak') return 'streak';
  return 'success';
}
