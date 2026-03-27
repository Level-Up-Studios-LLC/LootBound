/**
 * Platform abstraction layer for LootBound.
 *
 * Uses Capacitor plugins on native (iOS/Android),
 * falls back to browser APIs on web.
 */

import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Clipboard } from '@capacitor/clipboard';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// ---------------------------------------------------------------------------
// Storage — Preferences on native, sessionStorage on web
// ---------------------------------------------------------------------------

export async function getStorage(key: string): Promise<string | null> {
  if (isNative()) {
    try {
      var result = await Preferences.get({ key: key });
      return result.value;
    } catch (_e) {
      return null;
    }
  }
  try {
    return sessionStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

export async function setStorage(key: string, val: string): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.set({ key: key, value: val });
    } catch (e) {
      Sentry.captureException(e, {
        level: 'warning',
        tags: { action: 'set-storage', key },
      });
    }
    return;
  }
  try {
    sessionStorage.setItem(key, val);
  } catch (e) {
    Sentry.captureException(e, {
      level: 'warning',
      tags: { action: 'set-storage', key },
    });
  }
}

export async function removeStorage(key: string): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.remove({ key: key });
    } catch (_e) {
      /* ignore */
    }
    return;
  }
  try {
    sessionStorage.removeItem(key);
  } catch (_e) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Persistent storage — Preferences on native, localStorage on web
// ---------------------------------------------------------------------------

export async function getPersistentStorage(
  key: string
): Promise<string | null> {
  if (isNative()) {
    try {
      var result = await Preferences.get({ key: key });
      return result.value;
    } catch (_e) {
      return null;
    }
  }
  try {
    return localStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

export async function setPersistentStorage(
  key: string,
  val: string
): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.set({ key: key, value: val });
    } catch (e) {
      Sentry.captureException(e, {
        level: 'warning',
        tags: { action: 'set-persistent-storage', key },
      });
    }
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    Sentry.captureException(e, {
      level: 'warning',
      tags: { action: 'set-persistent-storage', key },
    });
  }
}

export async function removePersistentStorage(key: string): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.remove({ key: key });
    } catch (_e) {
      /* ignore */
    }
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (_e) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

export async function copyToClipboard(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch (_e) {
      return false;
    }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_e) {
      /* fall through */
    }
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_e) {
    document.body.removeChild(ta);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export async function capturePhoto(): Promise<string | null> {
  if (isNative()) {
    try {
      var photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 800,
        height: 800,
      });
      return photo.dataUrl || null;
    } catch (_e) {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

export async function triggerHaptic(
  type: 'light' | 'medium' | 'success' | 'error'
): Promise<void> {
  if (!isNative()) return;
  try {
    if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (_e) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Biometric authentication
// ---------------------------------------------------------------------------

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    var { NativeBiometric } = await import('capacitor-native-biometric');
    var result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch (_e) {
    return false;
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    var { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock LootBound',
      title: 'LootBound',
    });
    return true;
  } catch (_e) {
    return false;
  }
}
