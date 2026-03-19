import { useState, useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faCircleCheck } from './fa.ts';
import { FA_ICON_STYLE } from './constants.ts';
import { AuthProvider, useAuthContext } from './context/AuthContext.tsx';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import { getParentMember, saveParentMember } from './services/firestoreStorage.ts';
import {
  getStoredFamilyCode,
  clearStoredFamilyCode,
  lookupFamilyCode,
} from './services/familyCode.ts';
import { signInAnonymousKid, getCurrentUid, applyVerificationCode } from './services/auth.ts';
import NotificationToast from './components/NotificationToast.tsx';
import HamburgerMenu from './components/HamburgerMenu.tsx';
import PhotoViewer from './components/PhotoViewer.tsx';
import RoleSelectScreen from './screens/RoleSelectScreen.tsx';
import AuthScreen from './screens/AuthScreen.tsx';
import ParentPinScreen from './screens/ParentPinScreen.tsx';
import KidCodeScreen from './screens/KidCodeScreen.tsx';
import LoginScreen from './screens/LoginScreen.tsx';
import DashboardScreen from './screens/DashboardScreen.tsx';
import TasksScreen from './screens/TasksScreen.tsx';
import ScoresScreen from './screens/ScoresScreen.tsx';
import StoreScreen from './screens/StoreScreen.tsx';
import AdminScreen from './screens/admin/AdminScreen.tsx';
import CreatePinPrompt from './screens/CreatePinPrompt.tsx';
import ResetPasswordScreen from './screens/ResetPasswordScreen.tsx';

const DISCUSSIONS_URL = 'https://github.com/Level-Up-Studios-LLC/LootBound/discussions';

const SESSION_KEY_PARENT = 'qb-parent-session';
const SESSION_KEY_KID = 'qb-kid-session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getSession = (key: string): string | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.val !== 'string' || !Number.isFinite(data.ts)) {
      sessionStorage.removeItem(key);
      return null;
    }
    if (Date.now() - data.ts > SESSION_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data.val;
  } catch (_e) {
    try { sessionStorage.removeItem(key); } catch (_e2) { /* ignore */ }
    return null;
  }
};

const setSession = (key: string, val: string): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ val, ts: Date.now() }));
  } catch (_e) { /* ignore */ }
};

const clearSession = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (_e) { /* ignore */ }
};

/**
 * Parse Firebase action URL parameters from the current URL.
 * Firebase sends links like: ?mode=resetPassword&oobCode=ABC123
 */
const getFirebaseActionParams = (): { mode: string; oobCode: string } | null => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');
  if (mode && oobCode) {
    return { mode, oobCode };
  }
  return null;
};

function VerifyEmailScreen(props: { oobCode: string; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!props.oobCode) return;
    applyVerificationCode(props.oobCode).then(() => {
      setDone(true);
    }).catch((e: any) => {
      console.error('Email verification failed:', e);
      setErr(e.message || 'Verification failed');
      setDone(true);
    });
  }, [props.oobCode]);

  if (!done) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='font-display text-2xl text-qteal animate-pulse rounded-card px-6 py-3'>
          Verifying email...
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper page-centered'>
      <div className='text-5xl mb-5'>
        <FontAwesomeIcon icon={faCircleCheck} style={FA_ICON_STYLE} />
      </div>
      <div className='font-display text-2xl font-bold mb-3'>
        {err ? 'Verification Failed' : 'Email Verified!'}
      </div>
      <div className='text-sm text-qmuted text-center mb-8 max-w-[300px]'>
        {err || 'Your email has been verified. You\'re all set.'}
      </div>
      <button onClick={props.onDone} className='btn-primary'>
        Continue
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className='flex items-center justify-center h-screen'>
      <div className='font-display text-2xl text-qteal animate-pulse rounded-card px-6 py-3'>
        Loading LootBound...
      </div>
    </div>
  );
}

function AppInner(props: { onSwitchFamily?: () => void }) {
  const ctx = useAppContext();
  if (ctx.loading) {
    return <LoadingScreen />;
  }

  const showFab = ctx.screen === 'admin';

  return (
    <div className='page-wrapper relative'>
      <input
        ref={ctx.fileRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={ctx.handlePhoto}
      />
      <NotificationToast notif={ctx.notif} />
      <PhotoViewer
        photo={ctx.viewPhoto}
        canSave={ctx.curUser === 'parent'}
        onClose={() => {
          ctx.setViewPhoto(null);
        }}
      />

      {ctx.screen !== 'login' &&
        ctx.screen !== 'admin' &&
        ctx.curUser &&
        ctx.curUser !== 'parent' && (
          <div className='fixed top-3 right-3 z-[100]'>
            <HamburgerMenu
              items={[
                {
                  id: 'logout',
                  icon: 'left-from-bracket',
                  label: 'Logout',
                  onClick: () => {
                    if (ctx.onLogout) {
                      ctx.onLogout();
                    } else {
                      ctx.setCurUser(null);
                      ctx.setScreen('login');
                    }
                  },
                },
              ]}
            />
          </div>
        )}

      {ctx.screen === 'login' && (
        <LoginScreen onSwitchFamily={props.onSwitchFamily} />
      )}
      {ctx.screen === 'dashboard' && <DashboardScreen />}
      {ctx.screen === 'tasks' && <TasksScreen />}
      {ctx.screen === 'scores' && <ScoresScreen />}
      {ctx.screen === 'store' && <StoreScreen />}
      {ctx.screen === 'admin' && <AdminScreen />}

      {showFab && (
        <a
          href={DISCUSSIONS_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='fixed bottom-[100px] right-5 w-12 h-12 rounded-full bg-qteal text-white shadow-lg flex items-center justify-center border-none cursor-pointer z-[101] hover:scale-110 transition-transform no-underline'
          aria-label='Open Discussions'
        >
          <FontAwesomeIcon icon={faCommentDots} className='text-lg' />
        </a>
      )}
    </div>
  );
}

/**
 * AppRouter manages the top-level state machine:
 *
 * 1. role-select  → RoleSelectScreen
 * 2. parent-auth  → AuthScreen (login/signup)
 * 3. parent-pin   → ParentPinScreen (returning parent enters PIN)
 * 4. parent-app   → AppProvider → AppInner (parent mode)
 * 5. kid-code     → KidCodeScreen (enter family code)
 * 6. kid-app      → AppProvider → AppInner (kid mode, profile selection)
 */
function AppRouter() {
  const auth = useAuthContext();

  const [actionParams, setActionParams] = useState(getFirebaseActionParams);
  const [role, setRole] = useState<'parent' | 'kid' | null>(null);
  const [kidFamilyId, setKidFamilyId] = useState<string | null>(null);
  const [parentVerified, setParentVerifiedRaw] = useState(false);

  // Restore parent session only if the stored UID matches the current auth user
  useEffect(() => {
    if (auth.authLoading) return;
    if (auth.authUser) {
      const stored = getSession(SESSION_KEY_PARENT);
      if (stored === auth.authUser.uid) {
        setParentVerifiedRaw(true);
      } else if (stored) {
        // Stored session belongs to a different user — clear it
        clearSession(SESSION_KEY_PARENT);
        setParentVerifiedRaw(false);
      }
    } else {
      // No user — clear any stale session from memory and storage
      clearSession(SESSION_KEY_PARENT);
      setParentVerifiedRaw(false);
    }
  }, [auth.authUser, auth.authLoading]);

  const setParentVerified = (val: boolean) => {
    setParentVerifiedRaw(val);
    if (val && auth.authUser) {
      setSession(SESSION_KEY_PARENT, auth.authUser.uid);
    } else {
      clearSession(SESSION_KEY_PARENT);
    }
  };

  const [parentPin, setParentPin] = useState<string | null>(null);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [initDone, setInitDone] = useState(false);

  // On mount, check for stored family code (kid device persistence)
  // or persisted Firebase session (parent device persistence)
  useEffect(() => {
    const storedCode = getStoredFamilyCode();
    if (storedCode) {
      lookupFamilyCode(storedCode).then((fid) => {
        if (fid) {
          signInAnonymousKid().then(() => {
            setRole('kid');
            setKidFamilyId(fid);
          }).catch((err) => {
            console.error('Kid sign-in failed:', err);
          }).finally(() => {
            setInitDone(true);
          });
        } else {
          // Stored code is no longer valid
          clearStoredFamilyCode();
          setInitDone(true);
        }
      }).catch((err) => {
        console.error('Family code lookup failed:', err);
        setInitDone(true);
      });
    } else {
      setInitDone(true);
    }
  }, []);

  // Auto-detect persisted parent session
  useEffect(
    () => {
      if (!auth.authLoading && auth.authUser && !role && initDone) {
        const storedCode = getStoredFamilyCode();
        if (!storedCode) {
          setRole('parent');
        }
      }
    },
    [auth.authLoading, auth.authUser, role, initDone]
  );

  // When parent authenticates, load their PIN from their own parentMembers doc
  // An empty string means no custom PIN has been set
  useEffect(
    () => {
      if (auth.authUser && role === 'parent') {
        const actualUid = getCurrentUid();
        if (!actualUid) return;
        getParentMember(actualUid).then((member) => {
          const pin = member ? member.parentPin || '' : '';
          setParentPin(pin);
        }).catch((err) => {
          console.error('Failed to load parent PIN:', err);
          Sentry.captureException(err, { tags: { action: 'load-parent-pin' } });
          setParentPin('');
        });
      }
    },
    [auth.authUser, role]
  );

  // Auto-verify is handled inline in the render flow below to avoid
  // a flash of the PIN screen when no PIN is set.

  // Auto-refresh email verification status once per user
  const verifyRefreshedRef = useRef<string | null>(null);
  useEffect(() => {
    if (auth.authUser && !auth.authUser.emailVerified) {
      const userKey = auth.authUser.email;
      if (verifyRefreshedRef.current !== userKey) {
        verifyRefreshedRef.current = userKey;
        auth.doRefreshVerification();
      }
    } else if (!auth.authUser) {
      verifyRefreshedRef.current = null;
    }
  }, [auth.authUser]);

  // Handle Firebase action URLs (password reset, email verification)
  if (actionParams && actionParams.mode === 'verifyEmail') {
    return (
      <VerifyEmailScreen
        oobCode={actionParams.oobCode}
        onDone={() => {
          auth.doRefreshVerification();
          window.history.replaceState({}, '', window.location.pathname);
          setActionParams(null);
        }}
      />
    );
  }

  if (actionParams && actionParams.mode === 'resetPassword') {
    return (
      <ResetPasswordScreen
        oobCode={actionParams.oobCode}
        onDone={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setActionParams(null);
        }}
      />
    );
  }

  if (auth.authLoading || !initDone) {
    return <LoadingScreen />;
  }

  // --- Role Selection ---
  if (!role) {
    return (
      <RoleSelectScreen
        onSelectRole={(r) => {
          setRole(r);
        }}
      />
    );
  }

  // --- Parent Flow ---
  if (role === 'parent') {
    // Not authenticated → show auth screen
    if (!auth.authUser) {
      return (
        <AuthScreen
          onBack={() => {
            setRole(null);
          }}
        />
      );
    }

    // Wait for PIN to load from Firestore before making any decisions
    if (parentPin === null) {
      return <LoadingScreen />;
    }

    // Just signed in/signed up → show create PIN prompt if no PIN
    if (auth.justSignedIn && !parentVerified) {
      if (parentPin) {
        // Already has a custom PIN → go straight to dashboard
        auth.clearJustSignedIn();
        setParentVerified(true);
      } else if (!showCreatePin) {
        setShowCreatePin(true);
        return <LoadingScreen />;
      }
    }

    // Create PIN prompt after fresh sign-in/sign-up (skippable)
    if (showCreatePin && !parentVerified) {
      return (
        <CreatePinPrompt
          onCreated={(newPin) => {
            const pinUid = getCurrentUid();
            if (!pinUid) return;
            saveParentMember(pinUid, { parentPin: newPin }).then(() => {
              setParentPin(newPin);
              setShowCreatePin(false);
              setParentVerified(true);
              auth.clearJustSignedIn();
            }).catch((err) => {
              console.error('Failed to save PIN:', err);
              Sentry.captureException(err, { tags: { action: 'save-parent-pin' } });
            });
          }}
          onSkip={() => {
            setShowCreatePin(false);
            setParentVerified(true);
            auth.clearJustSignedIn();
          }}
        />
      );
    }

    // Returning from persisted session (not a fresh sign-in/sign-up)
    if (!parentVerified && !auth.justSignedIn) {
      if (parentPin) {
        // Has PIN, session persisted → enter PIN
        return (
          <ParentPinScreen
            email={auth.authUser.email}
            familyId={auth.authUser.familyId}
            parentPin={parentPin}
            onSuccess={() => {
              setParentVerified(true);
            }}
            onSignOut={() => {
              auth.doSignOut();
              setParentVerified(false);
              setParentPin(null);
              setRole(null);
            }}
          />
        );
      }

      // No PIN set — auto-verify immediately (no flash)
      setParentVerified(true);
      return <LoadingScreen />;
    }

    // Verified → full app in parent mode
    return (
      <AppProvider
        familyId={auth.authUser.familyId}
        initialScreen='admin'
        initialUser='parent'
        onLogout={() => {
          auth.doSignOut();
          setParentVerified(false);
          setParentPin(null);
          setShowCreatePin(false);
          setRole(null);
        }}
      >
        <AppInner />
      </AppProvider>
    );
  }

  // --- Kid Flow ---
  if (role === 'kid') {
    // No family code yet → enter code screen
    if (!kidFamilyId) {
      return (
        <KidCodeScreen
          onSuccess={(fid) => {
            setKidFamilyId(fid);
          }}
          onBack={() => {
            setRole(null);
          }}
        />
      );
    }

    // Family code resolved → show app
    // Pass stored kid as initialUser but start at 'login' — AppContext will
    // validate the child ID against cfg.children and promote to 'dashboard'
    const storedKid = getSession(SESSION_KEY_KID);
    return (
      <AppProvider
        familyId={kidFamilyId}
        initialUser={storedKid || null}
      >
        <AppInner
          onSwitchFamily={() => {
            clearStoredFamilyCode();
            clearSession(SESSION_KEY_KID);
            setKidFamilyId(null);
            setRole(null);
          }}
        />
      </AppProvider>
    );
  }

  return <LoadingScreen />;
}

function ErrorFallback(props: { resetError: () => void }) {
  return (
    <div className='page-wrapper page-centered'>
      <div className='bg-qyellow w-full max-w-[360px] p-8 rounded-card text-center'>
        <div className='font-display text-2xl font-bold text-qslate mb-3'>
          Something went wrong
        </div>
        <div className='text-sm text-qmuted mb-6'>
          An unexpected error occurred. Try reloading the app.
        </div>
        <button
          onClick={() => {
            props.resetError();
            window.location.reload();
          }}
          className='btn-primary w-full'
        >
          Reload App
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={(errorProps) => {
        return <ErrorFallback resetError={errorProps.resetError} />;
      }}
    >
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
