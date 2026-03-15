/**
 * Authentication module for LootBound.
 *
 * Uses Firebase Email/Password auth for parents.
 * Kids do not use Firebase Auth — they connect via family code.
 *
 * Parent UIDs map to a familyId via /parentMembers/{uid}.
 * The original creator's UID is the familyId. Additional
 * parents who join via family code get their own UID but
 * share the same familyId.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import {
  generateFamilyCode,
  registerFamilyCode,
  lookupFamilyCode,
} from './familyCode.ts';

export interface AuthUser {
  familyId: string;
  email: string;
}

/**
 * Resolve the familyId for a given auth UID.
 * Checks /parentMembers/{uid} first, falls back to uid.
 */
async function resolveFamilyId(uid: string): Promise<string> {
  var snap = await getDoc(doc(db, 'parentMembers', uid));
  if (snap.exists()) {
    var data = snap.data();
    if (data.familyId) return data.familyId;
  }
  return uid;
}

/**
 * Sign up a new family. Creates auth user, generates family code,
 * registers the parent member mapping.
 * Returns the AuthUser and the generated family code.
 */
export async function signUpFamily(
  email: string,
  password: string
): Promise<{ user: AuthUser; familyCode: string }> {
  var cred = await createUserWithEmailAndPassword(auth, email, password);
  var familyId = cred.user.uid;

  // Register parent member mapping
  await setDoc(doc(db, 'parentMembers', familyId), {
    familyId: familyId,
  });

  // Generate and register family code
  var code = await generateFamilyCode();
  await registerFamilyCode(code, familyId);

  return {
    user: { familyId: familyId, email: cred.user.email ?? email },
    familyCode: code,
  };
}

/**
 * Join an existing family by code. Creates auth user for a second
 * parent and maps them to the existing family.
 */
export async function joinFamilyByCode(
  email: string,
  password: string,
  code: string
): Promise<{ user: AuthUser; familyCode: string }> {
  var familyId = await lookupFamilyCode(code);
  if (!familyId) throw { code: 'auth/invalid-family-code' };

  var cred = await createUserWithEmailAndPassword(auth, email, password);

  // Map this parent to the existing family
  await setDoc(doc(db, 'parentMembers', cred.user.uid), {
    familyId: familyId,
  });

  return {
    user: { familyId: familyId, email: cred.user.email ?? email },
    familyCode: code,
  };
}

/**
 * Sign in an existing parent. Resolves their familyId from
 * the parentMembers mapping.
 */
export async function signInFamily(
  email: string,
  password: string
): Promise<AuthUser> {
  var cred = await signInWithEmailAndPassword(auth, email, password);
  var familyId = await resolveFamilyId(cred.user.uid);
  return { familyId: familyId, email: cred.user.email ?? email };
}

export async function signOutFamily(): Promise<void> {
  return signOut(auth);
}

/**
 * Listen for auth state changes. Resolves familyId from
 * parentMembers mapping for authenticated users.
 */
export function onAuthChange(
  callback: (user: AuthUser | null) => void
): () => void {
  return onAuthStateChanged(auth, function (user) {
    if (user && !user.isAnonymous) {
      resolveFamilyId(user.uid).then(function (familyId) {
        callback({ familyId: familyId, email: user.email ?? '' });
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Send a password reset email via Firebase Auth.
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export function getCurrentFamilyId(): string | null {
  var user = auth.currentUser;
  return user ? user.uid : null;
}

/**
 * Sign in anonymously for kid sessions.
 * Gives kids a Firebase Auth token so they can upload photos
 * to Firebase Storage without requiring email/password.
 */
export async function signInAnonymousKid(): Promise<void> {
  if (auth.currentUser) return; // already signed in
  await signInAnonymously(auth);
}
