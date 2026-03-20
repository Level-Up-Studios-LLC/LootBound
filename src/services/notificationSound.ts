/**
 * Notification sound service for LootBound.
 *
 * iOS Safari requires one Audio.play() call inside a user gesture
 * to activate the audio session. After that, non-gesture plays
 * (like Firestore listener callbacks) work while the page is
 * in the foreground.
 */

var SOUND_KEYS = ['success', 'error', 'approval', 'levelup', 'streak'] as const;
export type SoundKey = typeof SOUND_KEYS[number];

var SOUND_URLS: Record<SoundKey, string> = {
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  approval: '/sounds/approval.mp3',
  levelup: '/sounds/levelup.mp3',
  streak: '/sounds/streak.mp3',
};

var audioElements: Record<string, HTMLAudioElement> = {};
var unlocked = false;

var SILENT_MP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhgFJSdkAAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhgFJSdkAAAAAAAAAAAAAAAAAAAAA';

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  try {
    var silent = new Audio(SILENT_MP3);
    silent.volume = 0.01;
    silent.play().catch(function () { /* ignore */ });
  } catch (_e) { /* ignore */ }
}

export function preloadSounds(): void {
  var keys = SOUND_KEYS.slice();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (audioElements[key]) continue;
    var audio = new Audio(SOUND_URLS[key]);
    audio.preload = 'auto';
    audio.load();
    audioElements[key] = audio;
  }
}

export function playSound(key: SoundKey): void {
  var audio = audioElements[key];
  if (!audio) {
    audio = new Audio(SOUND_URLS[key]);
    audioElements[key] = audio;
  }
  audio.currentTime = 0;
  audio.volume = 1;
  audio.play().catch(function () { /* ignore */ });
}

export function notifTypeToSound(type: string): SoundKey {
  if (type === 'mission_complete') return 'success';
  if (type === 'mission_rejected') return 'error';
  if (type === 'loot_request' || type === 'loot_approved' || type === 'loot_denied') return 'approval';
  if (type === 'level_up') return 'levelup';
  if (type === 'streak') return 'streak';
  return 'success';
}
