import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from './fa.ts';
import { AuthProvider, useAuthContext } from './context/AuthContext.tsx';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import { getConfig as fsGetConfig } from './services/firestoreStorage.ts';
import {
  getStoredFamilyCode,
  clearStoredFamilyCode,
  lookupFamilyCode,
} from './services/familyCode.ts';
import { signInAnonymousKid } from './services/auth.ts';
import NotificationToast from './components/NotificationToast.tsx';
import HamburgerMenu from './components/HamburgerMenu.tsx';
import PhotoViewer from './components/PhotoViewer.tsx';
import FeedbackForm from './components/forms/FeedbackForm.tsx';
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
import { saveConfig as fsSaveConfig } from './services/firestoreStorage.ts';

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
  var ctx = useAppContext();
  var _showFeedback = useState(false),
    showFeedback = _showFeedback[0],
    setShowFeedback = _showFeedback[1];

  if (ctx.loading) {
    return <LoadingScreen />;
  }

  var showFab = ctx.screen === 'admin';

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
        onClose={function () {
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
                  onClick: function () {
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
        <button
          onClick={function () {
            setShowFeedback(true);
          }}
          className='fixed bottom-[100px] right-5 w-12 h-12 rounded-full bg-qteal text-white shadow-lg flex items-center justify-center border-none cursor-pointer z-[101] hover:scale-110 transition-transform'
          aria-label='Send Feedback'
        >
          <FontAwesomeIcon icon={faCommentDots} className='text-lg' />
          <span className='sr-only'>Send Feedback</span>
        </button>
      )}

      {showFeedback && (
        <FeedbackForm
          familyId={ctx.familyId}
          userRole={ctx.curUser || 'unknown'}
          userName={
            ctx.curUser === 'parent'
              ? 'Parent'
              : ctx.curUser && ctx.getChild(ctx.curUser)
                ? ctx.getChild(ctx.curUser)!.name
                : 'Kid'
          }
          onClose={function () {
            setShowFeedback(false);
          }}
          onSuccess={function () {
            setShowFeedback(false);
            ctx.notify('Feedback sent! Thank you.');
          }}
        />
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
  var auth = useAuthContext();

  var _role = useState<'parent' | 'kid' | null>(null),
    role = _role[0],
    setRole = _role[1];
  var _kidFamilyId = useState<string | null>(null),
    kidFamilyId = _kidFamilyId[0],
    setKidFamilyId = _kidFamilyId[1];
  var _parentVerified = useState(false),
    parentVerified = _parentVerified[0],
    setParentVerified = _parentVerified[1];
  var _parentPin = useState<string | null>(null),
    parentPin = _parentPin[0],
    setParentPin = _parentPin[1];
  var _showCreatePin = useState(false),
    showCreatePin = _showCreatePin[0],
    setShowCreatePin = _showCreatePin[1];
  var _initDone = useState(false),
    initDone = _initDone[0],
    setInitDone = _initDone[1];

  // On mount, check for stored family code (kid device persistence)
  // or persisted Firebase session (parent device persistence)
  useEffect(function () {
    var storedCode = getStoredFamilyCode();
    if (storedCode) {
      lookupFamilyCode(storedCode).then(function (fid) {
        if (fid) {
          signInAnonymousKid().then(function () {
            setRole('kid');
            setKidFamilyId(fid);
            setInitDone(true);
          });
        } else {
          // Stored code is no longer valid
          clearStoredFamilyCode();
          setInitDone(true);
        }
      });
    } else {
      setInitDone(true);
    }
  }, []);

  // Auto-detect persisted parent session
  useEffect(
    function () {
      if (!auth.authLoading && auth.authUser && !role && initDone) {
        var storedCode = getStoredFamilyCode();
        if (!storedCode) {
          setRole('parent');
        }
      }
    },
    [auth.authLoading, auth.authUser, role, initDone]
  );

  // When parent authenticates, load their parent PIN from Firestore
  // An empty string means no custom PIN has been set
  useEffect(
    function () {
      if (auth.authUser && role === 'parent') {
        fsGetConfig(auth.authUser.familyId).then(function (cfg) {
          var pin = cfg ? cfg.parentPin || '' : '';
          setParentPin(pin);
        }).catch(function (err) {
          console.error('Failed to load parent PIN:', err);
          setParentPin('');
        });
      }
    },
    [auth.authUser, role]
  );

  // Auto-verify parent when no PIN is set (persisted session, not fresh sign-in)
  useEffect(function () {
    if (
      auth.authUser &&
      role === 'parent' &&
      parentPin === '' &&
      !parentVerified &&
      !auth.justSignedIn
    ) {
      setParentVerified(true);
    }
  }, [auth.authUser, role, parentPin, parentVerified, auth.justSignedIn]);

  if (auth.authLoading || !initDone) {
    return <LoadingScreen />;
  }

  // --- Role Selection ---
  if (!role) {
    return (
      <RoleSelectScreen
        onSelectRole={function (r) {
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
          onBack={function () {
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
      }
    }

    // Create PIN prompt after fresh sign-in/sign-up (skippable)
    if (showCreatePin && !parentVerified) {
      return (
        <CreatePinPrompt
          onCreated={function (newPin) {
            fsSaveConfig(auth.authUser!.familyId, { parentPin: newPin }).then(function () {
              setParentPin(newPin);
              setShowCreatePin(false);
              setParentVerified(true);
              auth.clearJustSignedIn();
            }).catch(function (err) {
              console.error('Failed to save PIN:', err);
            });
          }}
          onSkip={function () {
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
            onSuccess={function () {
              setParentVerified(true);
            }}
            onSignOut={function () {
              auth.doSignOut();
              setParentVerified(false);
              setParentPin(null);
              setRole(null);
            }}
          />
        );
      }

      // No PIN — will be auto-verified via useEffect below
      return <LoadingScreen />;
    }

    // Verified → full app in parent mode
    return (
      <AppProvider
        familyId={auth.authUser.familyId}
        initialScreen='admin'
        initialUser='parent'
        onLogout={function () {
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
          onSuccess={function (fid) {
            setKidFamilyId(fid);
          }}
          onBack={function () {
            setRole(null);
          }}
        />
      );
    }

    // Family code resolved → show app (starts at profile selection)
    return (
      <AppProvider familyId={kidFamilyId}>
        <AppInner
          onSwitchFamily={function () {
            clearStoredFamilyCode();
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
          onClick={function () {
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
      fallback={function (errorProps) {
        return <ErrorFallback resetError={errorProps.resetError} />;
      }}
    >
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
