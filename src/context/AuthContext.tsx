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
} from '../services/auth.ts';

interface AuthContextValue {
  authUser: AuthUser | null;
  authLoading: boolean;
  authError: string | null;
  lastFamilyCode: string | null;
  justSignedIn: boolean;
  doSignIn: (email: string, password: string) => Promise<void>;
  doSignUp: (email: string, password: string) => Promise<void>;
  doJoinFamily: (
    email: string,
    password: string,
    code: string
  ) => Promise<void>;
  doGoogleSignIn: () => Promise<void>;
  doSignOut: () => Promise<void>;
  doResetPassword: (email: string) => Promise<boolean>;
  doSendVerification: () => Promise<boolean>;
  doRefreshVerification: () => Promise<void>;
  clearAuthError: () => void;
  clearLastFamilyCode: () => void;
  clearJustSignedIn: () => void;
}

var AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider(props: { children: React.ReactNode }) {
  var _user = useState<AuthUser | null>(null),
    authUser = _user[0],
    setAuthUser = _user[1];
  var _loading = useState(true),
    authLoading = _loading[0],
    setAuthLoading = _loading[1];
  var _error = useState<string | null>(null),
    authError = _error[0],
    setAuthError = _error[1];
  var _familyCode = useState<string | null>(null),
    lastFamilyCode = _familyCode[0],
    setLastFamilyCode = _familyCode[1];
  var _justSignedIn = useState(false),
    justSignedIn = _justSignedIn[0],
    setJustSignedIn = _justSignedIn[1];

  // Wait for Google redirect result before listening to auth state.
  // Without this, onAuthStateChanged fires with null before the
  // redirect credential is resolved, causing a flash of the role selector.
  useEffect(function () {
    var unsub: (() => void) | null = null;

    function startAuthListener() {
      unsub = onAuthChange(function (user) {
        setAuthUser(user);
        setAuthLoading(false);
        if (user) {
          Sentry.setUser({ id: user.familyId });
        } else {
          Sentry.setUser(null);
        }
      });
    }

    handleGoogleRedirectResult().then(function (code) {
      if (code) {
        setLastFamilyCode(code);
        setJustSignedIn(true);
      }
    }).catch(function (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google sign-in failed');
      }
    }).finally(function () {
      startAuthListener();
    });

    return function () {
      if (unsub) unsub();
    };
  }, []);

  function mapError(err: any): string {
    var msg = err.code || err.message || 'Something went wrong';
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
      return 'An account with that email already exists';
    }
    if (msg === 'auth/weak-password') {
      return 'Password must be at least 6 characters';
    }
    if (msg === 'auth/invalid-family-code') {
      return 'Invalid family code';
    }
    return msg;
  }

  async function doSignIn(email: string, password: string) {
    setAuthError(null);
    try {
      await signInFamily(email, password);
      setJustSignedIn(true);
    } catch (err: any) {
      setAuthError(mapError(err));
    }
  }

  async function doSignUp(email: string, password: string) {
    setAuthError(null);
    try {
      var result = await signUpFamily(email, password);
      setLastFamilyCode(result.familyCode);
      setJustSignedIn(true);
    } catch (err: any) {
      setAuthError(mapError(err));
    }
  }

  async function doJoinFamily(
    email: string,
    password: string,
    code: string
  ) {
    setAuthError(null);
    try {
      var result = await joinFamilyByCode(email, password, code);
      setLastFamilyCode(result.familyCode);
      setJustSignedIn(true);
    } catch (err: any) {
      setAuthError(mapError(err));
    }
  }

  async function doResetPassword(email: string): Promise<boolean> {
    setAuthError(null);
    try {
      await resetPassword(email);
      return true;
    } catch (err: any) {
      setAuthError(mapError(err));
      return false;
    }
  }

  async function doGoogleSignIn() {
    setAuthError(null);
    try {
      await startGoogleSignIn();
    } catch (err: any) {
      setAuthError(mapError(err));
    }
  }

  async function doSendVerification(): Promise<boolean> {
    setAuthError(null);
    try {
      await sendVerification();
      return true;
    } catch (err: any) {
      setAuthError(mapError(err));
      return false;
    }
  }

  async function doRefreshVerification() {
    try {
      var verified = await refreshEmailVerified();
      if (verified && authUser) {
        setAuthUser(Object.assign({}, authUser, { emailVerified: true }));
      }
    } catch (err: any) {
      console.warn('Failed to refresh verification status:', err);
    }
  }

  async function doSignOut() {
    setAuthError(null);
    try {
      await signOutFamily();
    } catch (err: any) {
      setAuthError(err.message || 'Sign out failed');
    }
  }

  function clearAuthError() {
    setAuthError(null);
  }

  function clearLastFamilyCode() {
    setLastFamilyCode(null);
  }

  function clearJustSignedIn() {
    setJustSignedIn(false);
  }

  var value: AuthContextValue = {
    authUser: authUser,
    authLoading: authLoading,
    authError: authError,
    lastFamilyCode: lastFamilyCode,
    justSignedIn: justSignedIn,
    doSignIn: doSignIn,
    doSignUp: doSignUp,
    doJoinFamily: doJoinFamily,
    doGoogleSignIn: doGoogleSignIn,
    doSignOut: doSignOut,
    doResetPassword: doResetPassword,
    doSendVerification: doSendVerification,
    doRefreshVerification: doRefreshVerification,
    clearAuthError: clearAuthError,
    clearLastFamilyCode: clearLastFamilyCode,
    clearJustSignedIn: clearJustSignedIn,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
