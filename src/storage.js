/**
 * Storage adapter for Quest Board.
 *
 * In the Claude artifact environment this used window.storage (a key-value
 * persistence API). This module swaps it for localStorage so the app runs
 * in any browser. The async interface is preserved so the rest of the
 * codebase stays unchanged.
 *
 * TODO: Replace with a real backend (Supabase, Firebase, etc.) when you're
 * ready to go multi-device.
 */

export async function storageGet(key) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return null;
    return { key: key, value: raw };
  } catch (e) {
    console.error('storageGet error:', e);
    return null;
  }
}

export async function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return { key: key, value: value };
  } catch (e) {
    console.error('storageSet error:', e);
    return null;
  }
}

export async function storageDelete(key) {
  try {
    localStorage.removeItem(key);
    return { key: key, deleted: true };
  } catch (e) {
    console.error('storageDelete error:', e);
    return null;
  }
}
