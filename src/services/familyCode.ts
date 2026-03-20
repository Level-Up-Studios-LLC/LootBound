/**
 * Family code utilities for LootBound.
 *
 * Generates, looks up, and persists short alphanumeric codes
 * that kids use to connect to their family on shared devices.
 *
 * Codes are 6 characters from a kid-friendly charset that
 * excludes confusing characters (O/0, I/1/L).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.ts';
import {
  getPersistentStorage,
  setPersistentStorage,
  removePersistentStorage,
} from './platform.ts';

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
const STORAGE_KEY = 'qb-family-code';

const randomCode = (): string => {
  let code = '';
  for (let i = 0; i < CODE_LEN; i++) {
    code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return code;
};

/**
 * Generate a unique family code. Retries on collision.
 */
export async function generateFamilyCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = randomCode();
    const snap = await getDoc(doc(db, 'familyCodes', code));
    if (!snap.exists()) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique family code after 10 attempts');
}

/**
 * Register a family code in Firestore.
 * Writes to /familyCodes/{code} and updates the family doc.
 */
export async function registerFamilyCode(
  code: string,
  familyId: string
): Promise<void> {
  await setDoc(doc(db, 'familyCodes', code), { familyId });
  await setDoc(
    doc(db, 'families', familyId),
    { familyCode: code },
    { merge: true }
  );
}

/**
 * Look up a family code. Returns familyId or null.
 */
export async function lookupFamilyCode(
  code: string
): Promise<string | null> {
  const snap = await getDoc(doc(db, 'familyCodes', code.toUpperCase()));
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.familyId || null;
}

/**
 * Get stored family code from localStorage (kid device persistence).
 */
export function getStoredFamilyCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (_e) {
    return null;
  }
}

export async function getStoredFamilyCodeAsync(): Promise<string | null> {
  return getPersistentStorage(STORAGE_KEY);
}

export async function setStoredFamilyCode(code: string): Promise<void> {
  await setPersistentStorage(STORAGE_KEY, code.toUpperCase());
}

export async function clearStoredFamilyCode(): Promise<void> {
  await removePersistentStorage(STORAGE_KEY);
}
