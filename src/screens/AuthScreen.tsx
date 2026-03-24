import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPartyHorn, faAngleLeft, faArrowLeft } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import PasswordInput from '../components/ui/PasswordInput.tsx';

interface AuthScreenProps {
  onBack: () => void;
}

export default function AuthScreen(props: AuthScreenProps): React.ReactElement {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const auth = useAuthContext();

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setStep(1);
    setLocalErr(null);
    setPass('');
    setShowReset(false);
    setResetSent(false);
    auth.clearAuthError();
  };

  const handleResetPassword = async () => {
    setLocalErr(null);
    auth.clearAuthError();
    if (!email.trim()) {
      setLocalErr('Enter your email address');
      return;
    }
    setBusy(true);
    try {
      const ok = await auth.doResetPassword(email.trim());
      if (ok) setResetSent(true);
    } finally {
      setBusy(false);
    }
  };

  const handleSigninSubmit = async () => {
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

    setBusy(true);
    await auth.doSignIn(email.trim(), pass);
    setBusy(false);
  };

  const handleSignupSubmit = async () => {
    setLocalErr(null);
    auth.clearAuthError();

    if (!email.trim()) {
      setLocalErr('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalErr('Enter a valid email address');
      return;
    }
    if (!pass) {
      setLocalErr('Password is required');
      return;
    }
    if (pass.length < 6) {
      setLocalErr('Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    await auth.doSignUp(email.trim(), pass);
    setBusy(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) {
      if (mode === 'signin' && step === 1) {
        handleSigninStep1();
      } else if (mode === 'signin' && step === 2) {
        handleSigninSubmit();
      } else {
        handleSignupSubmit();
      }
    }
  };

  // Password reset view
  if (showReset) {
    const resetError = localErr || auth.authError;
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
                We sent a password reset link to <strong>{email}</strong>. Check
                your inbox and follow the link to set a new password.
              </div>
              <button
                onClick={() => {
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
                Enter your email and we'll send you a link to reset your
                password.
              </div>
              <div>
                <label className='block text-qslate font-semibold mb-1 tracking-wide'>
                  Email
                </label>
                <input
                  type='email'
                  placeholder='family@example.com'
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
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
                onClick={() => {
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

  const error = localErr || auth.authError;

  const handleSigninStep1 = () => {
    setLocalErr(null);
    auth.clearAuthError();
    if (!email.trim()) {
      setLocalErr('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalErr('Enter a valid email address');
      return;
    }
    setStep(2);
  };

  // --- Sign In Step 1: Email + Google ---
  if (mode === 'signin' && step === 1) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
          LOOTBOUND
        </div>
        <div className='text-sm text-qmuted mb-5'>
          Sign in with your family account
        </div>

        <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
          <div>
            <label className='block text-qslate font-semibold mb-1 tracking-wide'>
              Email
            </label>
            <input
              type='email'
              placeholder='family@example.com'
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
                setLocalErr(null);
              }}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleSigninStep1();
              }}
              className='quest-input'
              autoComplete='email'
              autoFocus
            />
          </div>

          {error && (
            <div className='text-qcoral text-[13px] text-center py-1.5'>
              {error}
            </div>
          )}

          <button
            onClick={handleSigninStep1}
            className='btn-primary w-full mt-2'
          >
            Continue
          </button>

          <div className='flex items-center gap-3'>
            <div className='flex-1 h-px bg-qslate/20'></div>
            <span className='text-xs text-qmuted'>or</span>
            <div className='flex-1 h-px bg-qslate/20'></div>
          </div>

          <button
            onClick={() => {
              if (!busy) auth.doGoogleSignIn();
            }}
            disabled={busy}
            className='w-full flex items-center justify-center gap-2 bg-white text-qslate font-semibold rounded-badge px-5 py-2.5 border border-qslate/20 cursor-pointer font-body disabled:opacity-60 hover:bg-gray-50 transition-colors'
          >
            <svg width='18' height='18' viewBox='0 0 48 48'>
              <path
                fill='#EA4335'
                d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'
              />
              <path
                fill='#4285F4'
                d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'
              />
              <path
                fill='#FBBC05'
                d='M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z'
              />
              <path
                fill='#34A853'
                d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'
              />
            </svg>
            Continue with Google
          </button>

          <button onClick={switchMode} disabled={busy} className='btn-ghost'>
            Don't have an account? Create one
          </button>

          <button onClick={props.onBack} disabled={busy} className='btn-ghost'>
            <FontAwesomeIcon icon={faAngleLeft} />
            Back
          </button>
        </div>
      </div>
    );
  }

  // --- Sign In Step 2: Password ---
  if (mode === 'signin' && step === 2) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
          LOOTBOUND
        </div>
        <div className='text-sm text-qmuted mb-1'>Welcome back</div>
        <div className='text-xs text-qmuted mb-5'>{email}</div>

        <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
          <div>
            <label className='block text-qslate font-semibold mb-1 tracking-wide'>
              Password
            </label>
            <PasswordInput
              placeholder='Enter password'
              value={pass}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPass(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className='quest-input'
              autoComplete='current-password'
              autoFocus
            />
          </div>

          {error && (
            <div className='text-qcoral text-[13px] text-center py-1.5'>
              {error}
            </div>
          )}

          <button
            onClick={handleSigninSubmit}
            disabled={busy}
            className='btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed'
          >
            {busy ? 'Please wait...' : 'Sign In'}
          </button>

          <button
            onClick={() => {
              setLocalErr(null);
              auth.clearAuthError();
              setShowReset(true);
            }}
            disabled={busy}
            className='text-qteal text-[13px] bg-transparent border-none cursor-pointer font-body hover:underline'
          >
            Forgot password?
          </button>

          <button
            onClick={() => {
              setStep(1);
              setPass('');
              setLocalErr(null);
              auth.clearAuthError();
            }}
            disabled={busy}
            className='btn-ghost'
          >
            <FontAwesomeIcon icon={faArrowLeft} className='mr-1' />
            Back
          </button>
        </div>
      </div>
    );
  }

  // --- Sign Up: Single step — Email + Password + Google ---
  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
        LOOTBOUND
      </div>
      <div className='text-sm text-qmuted mb-5'>
        Create a new family account
      </div>

      <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
        <div>
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Email
          </label>
          <input
            type='email'
            placeholder='family@example.com'
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              setLocalErr(null);
            }}
            onKeyDown={handleKeyDown}
            className='quest-input'
            autoComplete='email'
            autoFocus
          />
        </div>

        <div>
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Password
          </label>
          <PasswordInput
            placeholder='At least 6 characters'
            value={pass}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPass(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className='quest-input'
            autoComplete='new-password'
          />
        </div>

        {error && (
          <div className='text-qcoral text-[13px] text-center py-1.5'>
            {error}
          </div>
        )}

        <button
          onClick={handleSignupSubmit}
          disabled={busy}
          className='btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed'
        >
          {busy ? 'Please wait...' : 'Create Account'}
        </button>

        <div className='flex items-center gap-3'>
          <div className='flex-1 h-px bg-qslate/20'></div>
          <span className='text-xs text-qmuted'>or</span>
          <div className='flex-1 h-px bg-qslate/20'></div>
        </div>

        <button
          onClick={() => {
            if (!busy) auth.doGoogleSignIn();
          }}
          disabled={busy}
          className='w-full flex items-center justify-center gap-2 bg-white text-qslate font-semibold rounded-badge px-5 py-2.5 border border-qslate/20 cursor-pointer font-body disabled:opacity-60 hover:bg-gray-50 transition-colors'
        >
          <svg width='18' height='18' viewBox='0 0 48 48'>
            <path
              fill='#EA4335'
              d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'
            />
            <path
              fill='#4285F4'
              d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'
            />
            <path
              fill='#FBBC05'
              d='M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z'
            />
            <path
              fill='#34A853'
              d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'
            />
          </svg>
          Continue with Google
        </button>

        <button onClick={switchMode} disabled={busy} className='btn-ghost'>
          Already have an account? Sign in
        </button>

        <button onClick={props.onBack} disabled={busy} className='btn-ghost'>
          <FontAwesomeIcon icon={faAngleLeft} />
          Back
        </button>
      </div>
    </div>
  );
}
