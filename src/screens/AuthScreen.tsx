import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPartyHorn, faAngleLeft } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import { saveConfig } from '../services/firestoreStorage.ts';

var REFERRAL_OPTIONS = [
  '',
  'Friend or family',
  'Social media',
  'Search engine',
  'App store',
  'Blog or article',
  'YouTube',
  'Podcast',
  'School or teacher',
  'Other',
];

interface AuthScreenProps {
  onBack: () => void;
}

export default function AuthScreen(props: AuthScreenProps): React.ReactElement {
  var _mode = useState<'signin' | 'signup'>('signin'),
    mode = _mode[0],
    setMode = _mode[1];
  var _email = useState(''),
    email = _email[0],
    setEmail = _email[1];
  var _pass = useState(''),
    pass = _pass[0],
    setPass = _pass[1];
  var _confirm = useState(''),
    confirm = _confirm[0],
    setConfirm = _confirm[1];
  var _joinCode = useState(''),
    joinCode = _joinCode[0],
    setJoinCode = _joinCode[1];
  var _busy = useState(false),
    busy = _busy[0],
    setBusy = _busy[1];
  var _localErr = useState<string | null>(null),
    localErr = _localErr[0],
    setLocalErr = _localErr[1];
  var _resetSent = useState(false),
    resetSent = _resetSent[0],
    setResetSent = _resetSent[1];
  var _showReset = useState(false),
    showReset = _showReset[0],
    setShowReset = _showReset[1];
  var _parentName = useState(''),
    parentName = _parentName[0],
    setParentName = _parentName[1];
  var _referral = useState(''),
    referral = _referral[0],
    setReferral = _referral[1];

  var auth = useAuthContext();

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setLocalErr(null);
    setJoinCode('');
    setParentName('');
    setReferral('');
    setShowReset(false);
    setResetSent(false);
    auth.clearAuthError();
  }

  async function handleResetPassword() {
    setLocalErr(null);
    auth.clearAuthError();
    if (!email.trim()) {
      setLocalErr('Enter your email address');
      return;
    }
    setBusy(true);
    var ok = await auth.doResetPassword(email.trim());
    if (ok) setResetSent(true);
    setBusy(false);
  }

  async function handleSubmit() {
    setLocalErr(null);
    auth.clearAuthError();

    if (!email.trim()) {
      setLocalErr('Email is required');
      return;
    }
    if (!pass) {
      setLocalErr('Password is required');
      return;
    }
    if (mode === 'signup' && pass !== confirm) {
      setLocalErr('Passwords do not match');
      return;
    }
    if (mode === 'signup' && pass.length < 6) {
      setLocalErr('Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    if (mode === 'signin') {
      await auth.doSignIn(email.trim(), pass);
    } else if (joinCode.trim()) {
      await auth.doJoinFamily(email.trim(), pass, joinCode.trim());
    } else {
      await auth.doSignUp(email.trim(), pass);
    }
    // Save parent name and referral source to family doc after signup
    if (mode === 'signup' && (parentName.trim() || referral) && auth.lastFamilyCode) {
      try {
        var uid = auth.authUser ? auth.authUser.familyId : null;
        if (uid) {
          var extra: Record<string, string> = {};
          if (parentName.trim()) extra.parentName = parentName.trim();
          if (referral) extra.referralSource = referral;
          await saveConfig(uid, extra as any);
        }
      } catch (_e) {
        // Non-critical — don't block signup
      }
    }
    setBusy(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !busy) {
      handleSubmit();
    }
  }

  function handleJoinCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    var val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= 6) setJoinCode(val);
  }

  // Show family code after successful signup
  if (auth.lastFamilyCode && auth.authUser) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='text-5xl mb-5'>
          <FontAwesomeIcon icon={faPartyHorn} style={FA_ICON_STYLE} />
        </div>
        <div className='font-display text-2xl font-bold mb-3'>
          Family Created!
        </div>
        <div className='text-sm text-qmuted text-center mb-8 max-w-[300px]'>
          Share this code with your kids' devices so they can connect to your
          family
        </div>

        <div className='bg-qmint rounded-card py-5 px-8 mb-8'>
          <div className='font-display text-4xl font-bold text-qteal tracking-[8px] text-center'>
            {auth.lastFamilyCode}
          </div>
        </div>

        <div className='text-[13px] text-qdim text-center mb-8 max-w-[300px]'>
          You can also find this code later in Settings
        </div>

        <button
          onClick={function () {
            auth.clearLastFamilyCode();
          }}
          className='btn-primary'
        >
          Get Started
        </button>
      </div>
    );
  }

  // Password reset view
  if (showReset) {
    var resetError = localErr || auth.authError;
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
          LOOTBOUND
        </div>
        <div className='text-sm text-qmuted mb-5'>Reset your password</div>
        <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
          {resetSent ? (
            <div className='text-center'>
              <div className='text-[32px] mb-3'>
                <FontAwesomeIcon icon={faPartyHorn} style={FA_ICON_STYLE} />
              </div>
              <div className='font-display text-lg font-bold text-qslate mb-2'>
                Check your email
              </div>
              <div className='text-sm text-qmuted mb-4'>
                We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to set a new password.
              </div>
              <button
                onClick={function () {
                  setShowReset(false);
                  setResetSent(false);
                  setLocalErr(null);
                  auth.clearAuthError();
                }}
                className='btn-primary w-full'
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className='text-sm text-qmuted'>
                Enter your email and we'll send you a link to reset your password.
              </div>
              <div>
                <label className='block text-qslate font-semibold mb-1 tracking-wide'>
                  Email
                </label>
                <input
                  type='email'
                  placeholder='family@example.com'
                  value={email}
                  onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                    setEmail(e.target.value);
                  }}
                  onKeyDown={function (e: React.KeyboardEvent) {
                    if (e.key === 'Enter' && !busy) handleResetPassword();
                  }}
                  className='quest-input'
                  autoComplete='email'
                  autoFocus
                />
              </div>
              {resetError && (
                <div className='text-qcoral text-[13px] text-center py-1.5'>
                  {resetError}
                </div>
              )}
              <button
                onClick={handleResetPassword}
                disabled={busy}
                className='btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed'
              >
                {busy ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                onClick={function () {
                  setShowReset(false);
                  setLocalErr(null);
                  auth.clearAuthError();
                }}
                disabled={busy}
                className='btn-ghost'
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  var error = localErr || auth.authError;

  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
        LOOTBOUND
      </div>
      <div className='text-sm text-qmuted mb-5'>
        {mode === 'signin'
          ? 'Sign in with your family account'
          : 'Create a new family account'}
      </div>

      <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
        {mode === 'signup' && (
          <div>
            <label className='block text-qslate font-semibold mb-1 tracking-wide'>
              First Name
            </label>
            <input
              type='text'
              placeholder='Your first name'
              value={parentName}
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                setParentName(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className='quest-input'
              autoComplete='given-name'
            />
          </div>
        )}
        <div>
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Email
          </label>
          <input
            type='email'
            placeholder='family@example.com'
            value={email}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setEmail(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className='quest-input'
            autoComplete='email'
          />
        </div>

        <div>
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Password
          </label>
          <input
            type='password'
            placeholder='Enter password'
            value={pass}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setPass(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className='quest-input'
            autoComplete={
              mode === 'signin' ? 'current-password' : 'new-password'
            }
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label className='block text-qslate font-semibold mb-1 tracking-wide'>
              Confirm Password
            </label>
            <input
              type='password'
              placeholder='Confirm password'
              value={confirm}
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                setConfirm(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className='quest-input'
              autoComplete='new-password'
            />
          </div>
        )}

        {mode === 'signup' && (
          <div>
            <label className='block text-qslate font-semibold mb-1 tracking-wide'>
              Family Code{' '}
            </label>
            <input
              type='text'
              placeholder='e.g. ABC123'
              value={joinCode}
              onChange={handleJoinCodeChange}
              onKeyDown={handleKeyDown}
              maxLength={6}
              autoCapitalize='characters'
              autoComplete='off'
              className='quest-input tracking-[4px] font-semibold'
            />
            <span className='text-qmuted text-xs font-normal'>
              (optional — enter to join an existing family)
            </span>
          </div>
        )}

        {mode === 'signup' && (
          <div>
            <label className='block text-qslate font-semibold mb-1 tracking-wide'>
              How did you hear about us?
            </label>
            <select
              value={referral}
              onChange={function (e: React.ChangeEvent<HTMLSelectElement>) {
                setReferral(e.target.value);
              }}
              className='quest-input'
            >
              <option value=''>Select one (optional)</option>
              {REFERRAL_OPTIONS.filter(function (o) { return o !== ''; }).map(function (o) {
                return (
                  <option key={o} value={o}>
                    {o}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {error && (
          <div className='text-qcoral text-[13px] text-center py-1.5'>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className='btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed'
        >
          {busy
            ? 'Please wait...'
            : mode === 'signin'
              ? 'Sign In'
              : joinCode.trim()
                ? 'Join Family'
                : 'Create Family'}
        </button>

        <div className='flex items-center gap-3'>
          <div className='flex-1 h-px bg-qslate/20'></div>
          <span className='text-xs text-qmuted'>or</span>
          <div className='flex-1 h-px bg-qslate/20'></div>
        </div>

        <button
          onClick={function () {
            if (!busy) auth.doGoogleSignIn();
          }}
          disabled={busy}
          className='w-full flex items-center justify-center gap-2 bg-white text-qslate font-semibold rounded-badge px-5 py-2.5 border border-qslate/20 cursor-pointer font-body disabled:opacity-60 hover:bg-gray-50 transition-colors'
        >
          <svg width='18' height='18' viewBox='0 0 48 48'>
            <path fill='#EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/>
            <path fill='#4285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/>
            <path fill='#FBBC05' d='M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z'/>
            <path fill='#34A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/>
          </svg>
          Continue with Google
        </button>

        {mode === 'signin' && (
          <button
            onClick={function () {
              setLocalErr(null);
              auth.clearAuthError();
              setShowReset(true);
            }}
            disabled={busy}
            className='text-qteal text-[13px] bg-transparent border-none cursor-pointer font-body hover:underline'
          >
            Forgot password?
          </button>
        )}

        <button onClick={switchMode} disabled={busy} className='btn-ghost'>
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>

        <button onClick={props.onBack} disabled={busy} className='btn-ghost'>
          <FontAwesomeIcon icon={faAngleLeft} />
          Back
        </button>
      </div>
    </div>
  );
}
