import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPartyHorn, faAngleLeft } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';

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

  var auth = useAuthContext();

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setLocalErr(null);
    setJoinCode('');
    auth.clearAuthError();
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
        <div>
          <label className='block text-xs text-qmuted font-semibold mb-1.5 tracking-wide uppercase'>
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
          <label className='block text-xs text-qmuted font-semibold mb-1.5 tracking-wide uppercase'>
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
            <label className='block text-xs text-qmuted font-semibold mb-1.5 tracking-wide uppercase'>
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
            <label className='block text-xs text-qmuted font-semibold mb-1.5 tracking-wide uppercase'>
              Family Code{' '}
              <span className='text-qdim normal-case'>
                (optional — enter to join an existing family)
              </span>
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
