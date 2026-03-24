import React, { useState, useEffect, createContext, useContext } from 'react';
import * as Sentry from '@sentry/react';
import type { AuthUser } from '../services/auth.ts';
import {
  onAuthChange,
  signInFamily,
  signUpFamily,
  signOutFamily,
  joinFamilyByCode,
  startGoogleSignIn,
  handleGoogleRedirectResult,
  resetPassword,
  sendVerification,
  refreshEmailVerified,
  resolveFamilyId,
  getCurrentUid,
} from '../services/auth.ts';

interface AuthContextValue {
  authUser: AuthUser | null;
  authLoading: boolean;
  authError: string | null;
  lastFamilyCode: string | null;
  justSignedIn: boolean;
  isNewUser: boolean;
  doSignIn: (email: string, password: string) => Promise<void>;
  doSignUp: (email: string, password: string) => Promise<string | null>;
  doJoinFamily: (
    email: string,
    password: string,
    code: string
  ) => Promise<string | null>;
  doGoogleSignIn: () => Promise<void>;
  doSignOut: () => Promise<void>;
  doResetPassword: (email: string) => Promise<boolean>;
  doSendVerification: () => Promise<boolean>;
  doRefreshVerification: () => Promise<boolean>;
  clearAuthError: () => void;
  clearLastFamilyCode: () => void;
  clearJustSignedIn: () => void;
  clearIsNewUser: () => void;
  refreshAuthUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastFamilyCode, setLastFamilyCode] = useState<string | null>(null);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Wait for Google redirect result before listening to auth state.
  // Without this, onAuthStateChanged fires with null before the
  // redirect credential is resolved, causing a flash of the role selector.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let disposed = false;

    const startAuthListener = () => {
      if (disposed) return;
      unsub = onAuthChange(user => {
        if (disposed) return;
        setAuthUser(user);
        setAuthLoading(false);
        if (user) {
          Sentry.setUser({ id: user.familyId });
        } else {
          Sentry.setUser(null);
        }
      });
    };

    handleGoogleRedirectResult()
      .then(result => {
        if (result) {
          setJustSignedIn(true);
          if (result.isNew && result.familyCode) {
            setLastFamilyCode(result.familyCode);
            setIsNewUser(true);
          }
        }
      })
      .catch((err: any) => {
        if (err.code !== 'auth/popup-closed-by-user') {
          setAuthError(err.message || 'Google sign-in failed');
          Sentry.captureException(err, { tags: { action: 'google-redirect-result' } });
        }
      })
      .finally(() => {
        startAuthListener();
      });

    return () => {
      disposed = true;
      if (unsub) unsub();
    };
  }, []);

  const mapError = (err: any): string => {
    const msg = err.code || err.message || 'Something went wrong';
    if (msg === 'auth/invalid-credential' || msg === 'auth/wrong-password') {
      return 'Invalid email or password';
    }
    if (msg === 'auth/user-not-found') {
      return 'No account found with that email';
    }
    if (msg === 'auth/too-many-requests') {
      return 'Too many attempts. Try again later.';
    }
    if (msg === 'auth/invalid-email') {
      return 'Invalid email address';
    }
    if (msg === 'auth/email-already-in-use') {
      return 'An account with that email already exists. Try signing in with Google instead.';
    }
    if (msg === 'auth/weak-password') {
      return 'Password must be at least 6 characters';
    }
    if (msg === 'auth/invalid-family-code') {
      return 'Invalid family code';
    }
    if (msg === 'auth/account-exists-with-different-credential') {
      return 'An account with that email exists using a different sign-in method. Try email/password or Google.';
    }
    if (msg === 'auth/credential-already-in-use') {
      return 'This credential is already linked to another account.';
    }
    return msg;
  };

  const doSignIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInFamily(email, password);
      setJustSignedIn(true);
    } catch (err: any) {
      setAuthError(mapError(err));
    }
  };

  const doSignUp = async (
    email: string,
    password: string
  ): Promise<string | null> => {
    setAuthError(null);
    setIsNewUser(true);
    try {
      const result = await signUpFamily(email, password);
      setLastFamilyCode(result.familyCode);
      setJustSignedIn(true);
      return result.user.familyId;
    } catch (err: any) {
      setIsNewUser(false);
      setAuthError(mapError(err));
      return null;
    }
  };

  const doJoinFamily = async (
    email: string,
    password: string,
    code: string
  ): Promise<string | null> => {
    setAuthError(null);
    try {
      const result = await joinFamilyByCode(email, password, code);
      setLastFamilyCode(result.familyCode);
      setJustSignedIn(true);
      setIsNewUser(true);
      return result.user.familyId;
    } catch (err: any) {
      setAuthError(mapError(err));
      return null;
    }
  };

  const doResetPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await resetPassword(email);
      return true;
    } catch (err: any) {
      setAuthError(mapError(err));
      return false;
    }
  };

  const doGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await startGoogleSignIn();
    } catch (err: any) {
      setAuthError(mapError(err));
    }
  };

  const doSendVerification = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      await sendVerification();
      return true;
    } catch (err: any) {
      setAuthError(mapError(err));
      return false;
    }
  };

  const doRefreshVerification = async (): Promise<boolean> => {
    try {
      const verified = await refreshEmailVerified();
      if (verified && authUser) {
        setAuthUser({ ...authUser, emailVerified: true });
      }
      return verified;
    } catch (err: any) {
      console.warn('Failed to refresh verification status:', err);
      throw err;
    }
  };

  const doSignOut = async () => {
    setAuthError(null);
    setLastFamilyCode(null);
    try {
      await signOutFamily();
    } catch (err: any) {
      setAuthError(err.message || 'Sign out failed');
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const clearLastFamilyCode = () => {
    setLastFamilyCode(null);
  };

  const clearJustSignedIn = () => {
    setJustSignedIn(false);
  };

  const clearIsNewUser = () => {
    setIsNewUser(false);
  };

  const refreshAuthUser = async () => {
    const uid = getCurrentUid();
    if (!uid || !authUser) return;
    const familyId = await resolveFamilyId(uid);
    if (familyId !== authUser.familyId) {
      setAuthUser({ ...authUser, familyId });
    }
  };

  const value: AuthContextValue = {
    authUser,
    authLoading,
    authError,
    lastFamilyCode,
    justSignedIn,
    isNewUser,
    doSignIn,
    doSignUp,
    doJoinFamily,
    doGoogleSignIn,
    doSignOut,
    doResetPassword,
    doSendVerification,
    doRefreshVerification,
    clearAuthError,
    clearLastFamilyCode,
    clearJustSignedIn,
    clearIsNewUser,
    refreshAuthUser,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
