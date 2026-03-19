import React, { useState, useEffect } from 'react';
import { signInFamily, getCurrentUid } from '../services/auth.ts';
import { saveParentMember } from '../services/firestoreStorage.ts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import { isBiometricAvailable, authenticateWithBiometric, isNative } from '../services/platform.ts';

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
  var hasPin = !!props.parentPin;

  var _pin = useState(''),
    pin = _pin[0],
    setPin = _pin[1];
  var _err = useState(''),
    err = _err[0],
    setErr = _err[1];
  var _forgot = useState(false),
    forgot = _forgot[0],
    setForgot = _forgot[1];
  var _pass = useState(''),
    pass = _pass[0],
    setPass = _pass[1];
  var _busy = useState(false),
    busy = _busy[0],
    setBusy = _busy[1];
  var _bioAvailable = useState(false),
    bioAvailable = _bioAvailable[0],
    setBioAvailable = _bioAvailable[1];

  useEffect(function () {
    if (isNative() && hasPin) {
      var cancelled = false;
      isBiometricAvailable().then(function (available) {
        if (cancelled) return;
        setBioAvailable(available);
        if (available) {
          authenticateWithBiometric().then(function (ok) {
            if (!cancelled && ok) props.onSuccess();
          });
        }
      });
      return function () { cancelled = true; };
    }
  }, [hasPin, props.onSuccess]);

  function handleBiometric() {
    authenticateWithBiometric().then(function (ok) {
      if (ok) {
        props.onSuccess();
      } else {
        setErr('Biometric authentication failed');
      }
    });
  }

  function handlePinSubmit() {
    if (pin === props.parentPin) {
      props.onSuccess();
    } else {
      setErr('Wrong PIN');
    }
  }

  function handlePinKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handlePinSubmit();
  }

  async function handlePasswordSubmit() {
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
  }

  async function handleResetPin() {
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
      await saveParentMember(getCurrentUid() || props.familyId, { parentPin: '' });
      props.onSuccess();
    } catch (_e) {
      setErr('Failed to clear PIN. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="page-wrapper page-centered">
      <div className="font-display text-5xl font-bold text-qslate tracking-wider mb-1">
        LOOTBOUND
      </div>
      <div className="text-sm text-qmuted mb-3">
        <FontAwesomeIcon icon={faLock} className="mr-1.5" style={FA_ICON_STYLE} />
        Welcome back
      </div>
      <div className="text-[13px] text-qdim mb-10">{props.email}</div>

      {/* PIN entry mode */}
      {hasPin && !forgot && (
        <div className="flex flex-col items-center gap-4 w-full max-w-[280px] bg-qmint rounded-card p-6">
          <div className="text-sm text-qmuted">Enter parent PIN</div>
          <div className="flex gap-2">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                setPin(e.target.value);
                setErr('');
              }}
              onKeyDown={handlePinKeyDown}
              className="quest-input w-[120px] text-center text-lg"
              autoFocus
            />
            <button
              onClick={handlePinSubmit}
              className="btn-primary"
            >
              Enter
            </button>
          </div>
          {err && (
            <div className="text-qcoral text-[13px]">{err}</div>
          )}
          {bioAvailable && (
            <button
              onClick={handleBiometric}
              className="btn-primary w-full"
            >
              Use Face ID / Touch ID
            </button>
          )}
          <button
            onClick={function () {
              setForgot(true);
              setErr('');
              setPin('');
            }}
            className="btn-ghost mt-1"
          >
            Forgot PIN?
          </button>
        </div>
      )}

      {/* Password entry mode (no PIN set, or forgot PIN) */}
      {(!hasPin || forgot) && (
        <div className="flex flex-col items-center gap-4 w-full max-w-[280px] bg-qmint rounded-card p-6">
          {forgot && (
            <div className="text-sm text-qmuted text-center">Reset PIN</div>
          )}
          <div className="text-xs text-qdim text-center">
            {forgot
              ? 'Enter your account password to clear your PIN. You will be prompted to create a new one.'
              : 'Enter your account password to continue'}
          </div>
          <input
            type="password"
            placeholder="Account password"
            value={pass}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setPass(e.target.value);
              setErr('');
            }}
            onKeyDown={function (e: React.KeyboardEvent) {
              if (e.key === 'Enter' && !busy) {
                if (forgot) {
                  handleResetPin();
                } else {
                  handlePasswordSubmit();
                }
              }
            }}
            className="quest-input"
            autoFocus
          />
          {err && (
            <div className="text-qcoral text-[13px]">{err}</div>
          )}
          <div className="flex gap-2">
            {forgot && (
              <button
                onClick={function () {
                  setForgot(false);
                  setPass('');
                  setErr('');
                }}
                disabled={busy}
                className="btn-ghost"
              >
                Cancel
              </button>
            )}
            <button
              onClick={function () {
                if (forgot) {
                  handleResetPin();
                } else {
                  handlePasswordSubmit();
                }
              }}
              disabled={busy}
              className="btn-primary disabled:cursor-not-allowed"
            >
              {busy
                ? 'Verifying...'
                : forgot
                  ? 'Reset PIN'
                  : 'Continue'}
            </button>
          </div>
          {!forgot && (
            <div className="text-[11px] text-qdim text-center mt-1">
              You can create a PIN in Settings to skip this step next time.
            </div>
          )}
        </div>
      )}

      <button
        onClick={props.onSignOut}
        className="btn-ghost mt-5"
      >
        Not you? Sign out
      </button>
    </div>
  );
}
