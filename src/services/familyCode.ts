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

/**
 * Store family code in localStorage for kid device persistence.
 */
export function setStoredFamilyCode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code.toUpperCase());
  } catch (_e) {
    /* ignore */
  }
}

/**
 * Clear stored family code from localStorage.
 */
export function clearStoredFamilyCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {
    /* ignore */
  }
}
