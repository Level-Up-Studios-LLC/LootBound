import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCircleCheck, faTriangleExclamation } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import { verifyResetCode, completePasswordReset } from '../services/auth.ts';

interface ResetPasswordScreenProps {
  oobCode: string;
  onDone: () => void;
}

export default function ResetPasswordScreen(
  props: ResetPasswordScreenProps
): React.ReactElement {
  const [email, setEmail] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);
  const [retryable, setRetryable] = useState(false);

  const verifyCode = () => {
    setRetryable(false);
    setInvalidCode(false);
    setEmail(null);
    verifyResetCode(props.oobCode)
      .then(resolvedEmail => {
        setEmail(resolvedEmail);
      })
      .catch((err: any) => {
        const code = err.code || '';
        if (
          code === 'auth/expired-action-code' ||
          code === 'auth/invalid-action-code'
        ) {
          setInvalidCode(true);
        } else {
          setRetryable(true);
        }
      });
  };

  useEffect(() => {
    verifyCode();
  }, [props.oobCode]);

  const handleSubmit = async () => {
    setError(null);
    if (newPass.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(props.oobCode, newPass);
      setSuccess(true);
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new one.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    }
    setBusy(false);
  };

  // Invalid or expired code
  if (invalidCode) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
          LOOTBOUND
        </div>
        <div className='w-full max-w-[360px] rounded-card p-6 bg-qcoral-dim flex flex-col gap-4 items-center'>
          <div className='text-[32px]'>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              style={FA_ICON_STYLE}
            />
          </div>
          <div className='font-display text-lg font-bold text-qslate'>
            Invalid Reset Link
          </div>
          <div className='text-sm text-qmuted text-center'>
            This password reset link is invalid or has expired. Please request a
            new one from the sign-in page.
          </div>
          <button onClick={props.onDone} className='btn-primary w-full'>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Transient error — offer retry
  if (retryable) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
          LOOTBOUND
        </div>
        <div className='w-full max-w-[360px] rounded-card p-6 bg-qcoral-dim flex flex-col gap-4 items-center'>
          <div className='text-[32px]'>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              style={FA_ICON_STYLE}
            />
          </div>
          <div className='font-display text-lg font-bold text-qslate'>
            Connection Error
          </div>
          <div className='text-sm text-qmuted text-center'>
            Could not verify the reset link. Check your connection and try
            again.
          </div>
          <button onClick={verifyCode} className='btn-primary w-full'>
            Retry
          </button>
          <button onClick={props.onDone} className='btn-secondary w-full'>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Still verifying the code
  if (!email && !invalidCode) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-2xl text-qteal animate-pulse rounded-card px-6 py-3'>
          Verifying reset link...
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className='page-wrapper page-centered'>
        <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
          LOOTBOUND
        </div>
        <div className='w-full max-w-[360px] rounded-card p-6 bg-qmint flex flex-col gap-4 items-center'>
          <div className='text-[32px] text-qteal'>
            <FontAwesomeIcon icon={faCircleCheck} style={FA_ICON_STYLE} />
          </div>
          <div className='font-display text-lg font-bold text-qslate'>
            Password Updated
          </div>
          <div className='text-sm text-qmuted text-center'>
            Your password has been reset successfully. You can now sign in with
            your new password.
          </div>
          <button onClick={props.onDone} className='btn-primary w-full'>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
        LOOTBOUND
      </div>
      <div className='text-sm text-qmuted mb-5'>Set a new password</div>
      <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
        <div className='text-sm text-qmuted text-center'>
          Resetting password for <strong>{email}</strong>
        </div>
        <div className='flex items-center gap-2 text-qslate font-bold'>
          <FontAwesomeIcon icon={faLock} style={FA_ICON_STYLE} />
          New Password
        </div>
        <input
          type='password'
          placeholder='New password (6+ characters)'
          value={newPass}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setNewPass(e.target.value);
            setError(null);
          }}
          className='quest-input'
          autoFocus
        />
        <input
          type='password'
          placeholder='Confirm new password'
          value={confirmPass}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setConfirmPass(e.target.value);
            setError(null);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !busy) handleSubmit();
          }}
          className='quest-input'
        />
        {error && (
          <div className='text-qcoral text-[13px] text-center'>{error}</div>
        )}
        <button
          onClick={handleSubmit}
          disabled={busy}
          className='btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed'
        >
          {busy ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}
