import React, { useState, useEffect } from 'react';
import { signInFamily, getCurrentUid } from '../services/auth.ts';
import { saveParentMember } from '../services/firestoreStorage.ts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import {
  isBiometricAvailable,
  authenticateWithBiometric,
  isNative,
} from '../services/platform.ts';
import PasswordInput from '../components/ui/PasswordInput.tsx';

interface ParentPinScreenProps {
  email: string;
  familyId: string;
  parentPin: string;
  onSuccess: () => void;
  onSignOut: () => void;
}

export default function ParentPinScreen(
  props: ParentPinScreenProps
): React.ReactElement {
  const hasPin = !!props.parentPin;

  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [forgot, setForgot] = useState(false);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    if (isNative() && hasPin) {
      let cancelled = false;
      isBiometricAvailable().then(available => {
        if (cancelled) return;
        setBioAvailable(available);
        if (available) {
          authenticateWithBiometric().then(ok => {
            if (!cancelled && ok) props.onSuccess();
          });
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, [hasPin, props.onSuccess]);

  const handleBiometric = () => {
    authenticateWithBiometric().then(ok => {
      if (ok) {
        props.onSuccess();
      } else {
        setErr('Biometric authentication failed');
      }
    });
  };

  const handlePinSubmit = () => {
    if (pin === props.parentPin) {
      props.onSuccess();
    } else {
      setErr('Wrong PIN');
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePinSubmit();
  };

  const handlePasswordSubmit = async () => {
    if (!pass) {
      setErr('Password is required');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await signInFamily(props.email, pass);
      props.onSuccess();
    } catch (_e) {
      setErr('Incorrect password');
    }
    setBusy(false);
  };

  const handleResetPin = async () => {
    if (!pass) {
      setErr('Password is required');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await signInFamily(props.email, pass);
    } catch (_e) {
      setErr('Incorrect password');
      setBusy(false);
      return;
    }
    try {
      await saveParentMember(getCurrentUid() || props.familyId, {
        parentPin: '',
      });
      props.onSuccess();
    } catch (_e) {
      setErr('Failed to clear PIN. Please try again.');
    }
    setBusy(false);
  };

  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-1'>
        LOOTBOUND
      </div>
      <div className='text-sm text-qmuted mb-3'>
        <FontAwesomeIcon
          icon={faLock}
          className='mr-1.5'
          style={FA_ICON_STYLE}
        />
        Welcome back
      </div>
      <div className='text-[13px] text-qdim mb-10'>{props.email}</div>

      {/* PIN entry mode */}
      {hasPin && !forgot && (
        <div className='flex flex-col items-center gap-4 w-full max-w-[280px] bg-qmint rounded-card p-6'>
          <div className='text-sm text-qmuted'>Enter parent PIN</div>
          <div className='flex gap-2'>
            <PasswordInput
              maxLength={6}
              value={pin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPin(e.target.value);
                setErr('');
              }}
              onKeyDown={handlePinKeyDown}
              className='quest-input w-[120px] text-center text-lg'
              autoFocus
            />
            <button onClick={handlePinSubmit} className='btn-primary'>
              Enter
            </button>
          </div>
          {err && <div className='text-qcoral text-[13px]'>{err}</div>}
          {bioAvailable && (
            <button onClick={handleBiometric} className='btn-primary w-full'>
              Use Face ID / Touch ID
            </button>
          )}
          <button
            onClick={() => {
              setForgot(true);
              setErr('');
              setPin('');
            }}
            className='btn-ghost mt-1'
          >
            Forgot PIN?
          </button>
        </div>
      )}

      {/* Password entry mode (no PIN set, or forgot PIN) */}
      {(!hasPin || forgot) && (
        <div className='flex flex-col items-center gap-4 w-full max-w-[280px] bg-qmint rounded-card p-6'>
          {forgot && (
            <div className='text-sm text-qmuted text-center'>Reset PIN</div>
          )}
          <div className='text-xs text-qdim text-center'>
            {forgot
              ? 'Enter your account password to clear your PIN. You will be prompted to create a new one.'
              : 'Enter your account password to continue'}
          </div>
          <PasswordInput
            placeholder='Account password'
            value={pass}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPass(e.target.value);
              setErr('');
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && !busy) {
                if (forgot) {
                  handleResetPin();
                } else {
                  handlePasswordSubmit();
                }
              }
            }}
            className='quest-input'
            autoFocus
          />
          {err && <div className='text-qcoral text-[13px]'>{err}</div>}
          <div className='flex gap-2'>
            {forgot && (
              <button
                onClick={() => {
                  setForgot(false);
                  setPass('');
                  setErr('');
                }}
                disabled={busy}
                className='btn-ghost'
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                if (forgot) {
                  handleResetPin();
                } else {
                  handlePasswordSubmit();
                }
              }}
              disabled={busy}
              className='btn-primary disabled:cursor-not-allowed'
            >
              {busy ? 'Verifying...' : forgot ? 'Reset PIN' : 'Continue'}
            </button>
          </div>
          {!forgot && (
            <div className='text-[11px] text-qdim text-center mt-1'>
              You can create a PIN in Settings to skip this step next time.
            </div>
          )}
        </div>
      )}

      <button onClick={props.onSignOut} className='btn-ghost mt-5'>
        Not you? Sign out
      </button>
    </div>
  );
}
