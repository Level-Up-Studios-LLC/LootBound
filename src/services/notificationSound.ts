/**
 * Notification sound service for LootBound.
 *
 * Plays MP3 sound effects from /sounds/ directory.
 *
 * iOS Safari requires one Audio.play() call inside a user gesture
 * to activate the audio session. After that, non-gesture plays
 * (like Firestore listener callbacks) work while the page is
 * in the foreground.
 */

const SOUND_KEYS = [
  'success',
  'error',
  'approval',
  'levelup',
  'streak',
  'victory',
  'notification',
] as const;
export type SoundKey = (typeof SOUND_KEYS)[number];

let unlocked = false;
const audioCache: Partial<Record<SoundKey, HTMLAudioElement>> = {};

const SILENT_MP3 =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhgFJSdkAAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhgFJSdkAAAAAAAAAAAAAAAAAAAAA';

function getAudio(key: SoundKey): HTMLAudioElement {
  let el = audioCache[key];
  if (!el) {
    el = new Audio(`/sounds/${key}.mp3`);
    el.preload = 'auto';
    audioCache[key] = el;
  }
  return el;
}

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  try {
    // Unlock HTML Audio for iOS Safari
    const silent = new Audio(SILENT_MP3);
    silent.volume = 0.01;
    silent.play().catch(() => {});
  } catch (_e) {
    /* ignore */
  }
}

export function preloadSounds(): void {
  for (const key of SOUND_KEYS) {
    const el = getAudio(key);
    el.load();
  }
}

export function playSound(key: SoundKey): void {
  const el = getAudio(key);
  el.currentTime = 0;
  el.volume = 1;
  el.play().catch(() => {});
}

export function notifTypeToSound(type: string): SoundKey {
  if (type === 'mission_complete') return 'success';
  if (type === 'mission_rejected') return 'error';
  if (type === 'loot_request' || type === 'loot_approved') return 'approval';
  if (type === 'loot_denied') return 'error';
  if (type === 'level_up') return 'levelup';
  if (type === 'streak') return 'streak';
  // Co-op notification sounds
  if (type === 'coop_complete') return 'success';
  if (type === 'coop_approved' || type === 'coop_accepted') return 'approval';
  if (
    type === 'coop_denied' ||
    type === 'coop_declined' ||
    type === 'coop_cancelled' ||
    type === 'coop_expired'
  )
    return 'error';
  if (type === 'coop_request') return 'approval';
  if (type === 'coop_partner_done') return 'success';
  return 'notification';
}
