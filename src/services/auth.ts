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

import * as Sentry from '@sentry/react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  linkWithCredential,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  uid: string;
  familyId: string;
  email: string;
  emailVerified: boolean;
}

const appActionCodeSettings = () => {
  return {
    url:
      (import.meta.env.VITE_APP_URL as string) || 'https://app.lootbound.com',
    handleCodeInApp: true,
  };
};

/**
 * Resolve the familyId for a given auth UID.
 * Checks /parentMembers/{uid} first, falls back to uid.
 */
async function resolveFamilyId(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, 'parentMembers', uid));
  if (snap.exists()) {
    const data = snap.data();
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
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const familyId = cred.user.uid;

  // Register parent member mapping
  await setDoc(
    doc(db, 'parentMembers', familyId),
    {
      familyId,
    },
    { merge: true }
  );

  // Generate and register family code
  const code = await generateFamilyCode();
  await registerFamilyCode(code, familyId);

  // Send verification email (fire-and-forget)
  sendEmailVerification(cred.user, appActionCodeSettings()).catch(err => {
    console.warn('Verification email failed:', err);
    Sentry.captureException(err, { level: 'warning', tags: { action: 'send-email-verification' } });
  });

  return {
    user: {
      uid: cred.user.uid,
      familyId,
      email: cred.user.email ?? email,
      emailVerified: false,
    },
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
  const familyId = await lookupFamilyCode(code);
  if (!familyId) throw { code: 'auth/invalid-family-code' };

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Map this parent to the existing family
  await setDoc(
    doc(db, 'parentMembers', cred.user.uid),
    {
      familyId,
    },
    { merge: true }
  );

  // Send verification email (fire-and-forget)
  sendEmailVerification(cred.user, appActionCodeSettings()).catch(err => {
    console.warn('Verification email failed:', err);
    Sentry.captureException(err, { level: 'warning', tags: { action: 'send-email-verification' } });
  });

  return {
    user: {
      uid: cred.user.uid,
      familyId,
      email: cred.user.email ?? email,
      emailVerified: false,
    },
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
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const familyId = await resolveFamilyId(cred.user.uid);
  return {
    uid: cred.user.uid,
    familyId,
    email: cred.user.email ?? email,
    emailVerified: cred.user.emailVerified,
  };
}

/**
 * Start Google sign-in via redirect (works on iPads and avoids COOP issues).
 */
export async function startGoogleSignIn(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

/**
 * Handle the Google redirect result after the page reloads.
 * Sets up parentMembers and family code for new users.
 *
 * With Firebase's "One account per email" setting (the default),
 * signing in with Google using an email that already has an
 * email/password account automatically links the providers under
 * the same UID. So the existing parentMembers mapping is preserved
 * and this function returns null (returning user).
 *
 * Returns the family code if a new family was created, null otherwise.
 */
export async function handleGoogleRedirectResult(): Promise<string | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const user = result.user;
  const uid = user.uid;

  // Check if this user already has a parentMembers mapping
  // (returning user, or email/password account that was auto-linked with Google)
  const snap = await getDoc(doc(db, 'parentMembers', uid));
  if (snap.exists()) return null;

  // New user — create family
  await setDoc(
    doc(db, 'parentMembers', uid),
    { familyId: uid },
    { merge: true }
  );
  const code = await generateFamilyCode();
  await registerFamilyCode(code, uid);
  return code;
}

export async function signOutFamily(): Promise<void> {
  var { removeStorage } = await import('./platform.ts');
  await removeStorage('qb-parent-session');
  await removeStorage('qb-kid-session');
  return signOut(auth);
}

/**
 * Listen for auth state changes. Resolves familyId from
 * parentMembers mapping for authenticated users.
 */
export function onAuthChange(
  callback: (user: AuthUser | null) => void
): () => void {
  var seq = 0;
  var unsub = onAuthStateChanged(auth, user => {
    var token = ++seq;
    if (user && !user.isAnonymous) {
      resolveFamilyId(user.uid)
        .then(familyId => {
          if (token !== seq) return;
          callback({
            uid: user.uid,
            familyId,
            email: user.email ?? '',
            emailVerified: user.emailVerified,
          });
        })
        .catch(err => {
          if (token !== seq) return;
          console.error('resolveFamilyId failed:', err);
          Sentry.captureException(err, { tags: { action: 'resolve-familyid-authchange' } });
          callback(null);
        });
    } else {
      callback(null);
    }
  });
  return () => {
    seq++;
    unsub();
  };
}

/**
 * Send a password reset email via Firebase Auth.
 * Links back to the app so users reset their password on a branded page.
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email, appActionCodeSettings());
}

/**
 * Verify a password reset code from a Firebase action URL.
 * Returns the email address associated with the code.
 */
export async function verifyResetCode(code: string): Promise<string> {
  return verifyPasswordResetCode(auth, code);
}

/**
 * Complete a password reset using the action code and new password.
 */
export async function completePasswordReset(
  code: string,
  newPassword: string
): Promise<void> {
  await confirmPasswordReset(auth, code, newPassword);
}

/**
 * Send a verification email to the current user.
 */
export async function sendVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await sendEmailVerification(user, appActionCodeSettings());
}

/**
 * Apply a Firebase action code (e.g. email verification).
 * This confirms the action server-side before refreshing local state.
 */
export async function applyVerificationCode(oobCode: string): Promise<void> {
  await applyActionCode(auth, oobCode);
  // Reload user to pick up the verified status
  if (auth.currentUser) {
    await auth.currentUser.reload();
  }
}

/**
 * Reload the current user's profile to pick up emailVerified changes.
 * Returns the updated verified status.
 */
export async function refreshEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
}

/**
 * Change the current user's password. Requires re-authentication first.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not signed in');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

/**
 * Set a password for a Google-only user, adding the email/password provider.
 * Uses linkWithCredential to add the password provider, falling back to
 * updatePassword if already linked.
 */
export async function setPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not signed in');
  if (!hasPasswordProvider()) {
    const cred = EmailAuthProvider.credential(user.email, newPassword);
    await linkWithCredential(user, cred);
  } else {
    await updatePassword(user, newPassword);
  }
}

/**
 * Update the current user's email. Sends a verification link to the new
 * address — the email only changes after the user clicks the link.
 */
export async function changeEmail(newEmail: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await verifyBeforeUpdateEmail(user, newEmail, appActionCodeSettings());
}

/**
 * Re-authenticate the current user with their password.
 * Call before destructive operations to ensure the session is fresh.
 */
export async function reauthenticate(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not signed in');
  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
}

/**
 * Re-authenticate the current user via Google popup.
 * Used for Google-only users before destructive operations.
 */
export async function reauthenticateWithGoogle(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const provider = new GoogleAuthProvider();
  await reauthenticateWithPopup(user, provider);
}

/**
 * Check if the current user has a Google provider.
 */
export function hasGoogleProvider(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  return user.providerData.some(p => p.providerId === 'google.com');
}

/**
 * Delete the current user's Firebase Auth account.
 * If the session is stale, re-authenticates with the provided password
 * and retries the deletion.
 */
export async function deleteAuthAccount(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  try {
    await user.delete();
  } catch (err: any) {
    if (err.code === 'auth/requires-recent-login') {
      if (!password || !user.email) throw err;
      try {
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
        await user.delete();
      } catch (retryErr) {
        Sentry.captureException(retryErr, { tags: { action: 'delete-auth-retry' } });
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
}

/**
 * Get the current Firebase Auth UID.
 * Note: for the family creator, uid === familyId. For joined parents,
 * the familyId is resolved via /parentMembers/{uid} (see resolveFamilyId).
 */
export function getCurrentUid(): string | null {
  const user = auth.currentUser;
  return user ? user.uid : null;
}

/**
 * Check if the current user has a password (email/password) provider.
 * Google-only users won't have this until they set a password.
 */
export function hasPasswordProvider(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  return user.providerData.some(p => p.providerId === 'password');
}

/** @deprecated Use getCurrentUid — familyId resolution requires async lookup via resolveFamilyId. */
export const getCurrentFamilyId = getCurrentUid;

/**
 * Sign in anonymously for kid sessions.
 * Gives kids a Firebase Auth token so they can upload photos
 * to Firebase Storage without requiring email/password.
 */
export async function signInAnonymousKid(): Promise<void> {
  if (auth.currentUser) return; // already signed in
  await signInAnonymously(auth);
}
