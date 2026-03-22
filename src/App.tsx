import { useState, useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faCircleCheck } from './fa.ts';
import { FA_ICON_STYLE, FEEDBACK_URL } from './constants.ts';
import { AuthProvider, useAuthContext } from './context/AuthContext.tsx';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import {
  getParentMember,
  saveParentMember,
} from './services/firestoreStorage.ts';
import {
  getStoredFamilyCodeAsync,
  clearStoredFamilyCode,
  lookupFamilyCode,
} from './services/familyCode.ts';
import {
  signInAnonymousKid,
  getCurrentUid,
  hasPasswordProvider,
  applyVerificationCode,
} from './services/auth.ts';
import { getStorage, setStorage, removeStorage } from './services/platform.ts';
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

const SESSION_KEY_PARENT = 'qb-parent-session';
const SESSION_KEY_KID = 'qb-kid-session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const parseSessionValue = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (typeof data.val !== 'string' || !Number.isFinite(data.ts)) return null;
    if (Date.now() - data.ts > SESSION_TTL) return null;
    return data.val;
  } catch (_e) {
    return null;
  }
};

const getSessionAsync = async (key: string): Promise<string | null> => {
  const raw = await getStorage(key);
  const val = parseSessionValue(raw);
  if (raw && !val) await removeStorage(key);
  return val;
};

const setSession = (key: string, val: string): void => {
  setStorage(key, JSON.stringify({ val, ts: Date.now() }));
};

const clearSession = (key: string): void => {
  removeStorage(key);
};

/**
 * Parse Firebase action URL parameters from the current URL.
 * Firebase sends links like: ?mode=resetPassword&oobCode=ABC123
 */
const getFirebaseActionParams = (): {
  mode: string;
  oobCode: string;
} | null => {
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
    applyVerificationCode(props.oobCode)
      .then(() => {
        setDone(true);
      })
      .catch((e: any) => {
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
        {err || "Your email has been verified. You're all set."}
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
          href={FEEDBACK_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='fixed bottom-[100px] right-5 w-12 h-12 rounded-full bg-qteal text-white shadow-lg flex items-center justify-center border-none cursor-pointer z-[101] hover:scale-110 transition-transform no-underline'
          aria-label='Open feedback board'
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
      getSessionAsync(SESSION_KEY_PARENT).then(stored => {
        if (stored === auth.authUser!.uid) {
          setParentVerifiedRaw(true);
        } else {
          if (stored) clearSession(SESSION_KEY_PARENT);
          setParentVerifiedRaw(false);
        }
      });
    } else {
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
  const [storedKid, setStoredKid] = useState<string | null | undefined>(
    undefined
  );

  // On mount, check for stored family code (kid device persistence)
  // or persisted Firebase session (parent device persistence)
  useEffect(() => {
    (async () => {
      try {
        const kidSession = await getSessionAsync(SESSION_KEY_KID);
        setStoredKid(kidSession);
        const storedCode = await getStoredFamilyCodeAsync();
        if (storedCode) {
          const fid = await lookupFamilyCode(storedCode);
          if (fid) {
            await signInAnonymousKid();
            setRole('kid');
            setKidFamilyId(fid);
          } else {
            // Stored code is no longer valid
            await clearStoredFamilyCode();
            setStoredKid(null);
          }
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        setInitDone(true);
      }
    })();
  }, []);

  // Auto-detect persisted parent session
  var roleRef = useRef(role);
  roleRef.current = role;
  useEffect(() => {
    if (!auth.authLoading && auth.authUser && !role && initDone) {
      getStoredFamilyCodeAsync().then(storedCode => {
        if (!storedCode && !roleRef.current) {
          setRole('parent');
        }
      });
    }
  }, [auth.authLoading, auth.authUser, role, initDone]);

  // When parent authenticates, load their PIN from their own parentMembers doc
  // An empty string means no custom PIN has been set
  useEffect(() => {
    if (auth.authUser && role === 'parent') {
      const actualUid = getCurrentUid();
      if (!actualUid) return;
      getParentMember(actualUid)
        .then(member => {
          const pin = member ? member.parentPin || '' : '';
          setParentPin(pin);
        })
        .catch((err: any) => {
          // permission-denied is expected during account deletion — don't report
          if (err?.code !== 'permission-denied') {
            console.error('Failed to load parent PIN:', err);
            Sentry.captureException(err, {
              tags: { action: 'load-parent-pin' },
            });
          }
          setParentPin('');
        });
    }
  }, [auth.authUser, role]);

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
        onSelectRole={r => {
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

    // Email verification gate — block unverified email+password users
    if (
      hasPasswordProvider() &&
      !auth.authUser.emailVerified
    ) {
      return (
        <div className='page-wrapper page-centered'>
          <div className='text-5xl mb-5'>
            <FontAwesomeIcon icon={faCircleCheck} style={FA_ICON_STYLE} />
          </div>
          <div className='font-display text-2xl font-bold mb-3 text-qslate'>
            Verify Your Email
          </div>
          <div className='text-sm text-qmuted text-center mb-6 max-w-[300px]'>
            We sent a verification link to <strong>{auth.authUser.email}</strong>.
            Please check your inbox and click the link to continue.
          </div>
          <div className='flex flex-col gap-3 w-full max-w-[260px]'>
            <button
              onClick={async () => {
                const ok = await auth.doSendVerification();
                if (ok) {
                  // Show brief confirmation
                  const el = document.getElementById('resend-status');
                  if (el) el.textContent = 'Email sent!';
                }
              }}
              className='btn-primary'
            >
              Resend Verification Email
            </button>
            <div id='resend-status' className='text-qteal text-[13px] text-center min-h-[20px]'></div>
            <button
              onClick={() => {
                auth.doRefreshVerification();
              }}
              className='btn-ghost'
            >
              I've Verified My Email
            </button>
            <button
              onClick={() => {
                auth.doSignOut();
                setRole(null);
              }}
              className='btn-ghost text-qmuted'
            >
              Sign Out
            </button>
          </div>
        </div>
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
          onCreated={newPin => {
            const pinUid = getCurrentUid();
            if (!pinUid) return;
            saveParentMember(pinUid, { parentPin: newPin })
              .then(() => {
                setParentPin(newPin);
                setShowCreatePin(false);
                setParentVerified(true);
                auth.clearJustSignedIn();
              })
              .catch(err => {
                console.error('Failed to save PIN:', err);
                Sentry.captureException(err, {
                  tags: { action: 'save-parent-pin' },
                });
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
          onSuccess={fid => {
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
    return (
      <AppProvider familyId={kidFamilyId} initialUser={storedKid || null}>
        <AppInner
          onSwitchFamily={() => {
            clearStoredFamilyCode().catch(() => {
              /* ignore */
            });
            clearSession(SESSION_KEY_KID);
            setStoredKid(null);
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
      fallback={errorProps => {
        return <ErrorFallback resetError={errorProps.resetError} />;
      }}
    >
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
