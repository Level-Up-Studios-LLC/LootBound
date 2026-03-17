import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
import { useAppContext } from '../context/AppContext.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import { saveChild as fsSaveChild } from '../services/firestoreStorage.ts';
import type { Child } from '../types.ts';

interface LoginScreenProps {
  onSwitchFamily?: () => void;
}

export default function LoginScreen(
  props: LoginScreenProps
): React.ReactElement {
  var _kpin = useState<string>(''),
    kpin = _kpin[0],
    setKpin = _kpin[1];
  var _pinErr = useState<string>(''),
    pinErr = _pinErr[0],
    setPinErr = _pinErr[1];
  var _pinTarget = useState<string | null>(null),
    pinTarget = _pinTarget[0],
    setPinTarget = _pinTarget[1];
  var _createPin = useState(false),
    createPin = _createPin[0],
    setCreatePin = _createPin[1];
  var _newPin = useState(''),
    newPin = _newPin[0],
    setNewPin = _newPin[1];
  var _confirmPin = useState(''),
    confirmPin = _confirmPin[0],
    setConfirmPin = _confirmPin[1];

  var ctx = useAppContext();
  var children = ctx.children;

  function doKidLogin(uid: string): void {
    var ch = ctx.getChild(uid);
    if (!ch) return;
    if (ch.pin) {
      setPinTarget(uid);
      setCreatePin(false);
      setKpin('');
      setPinErr('');
    } else {
      // No PIN set — prompt to create one
      setPinTarget(uid);
      setCreatePin(true);
      setNewPin('');
      setConfirmPin('');
      setPinErr('');
    }
  }

  function submitKidPin(): void {
    var ch = ctx.getChild(pinTarget!);
    if (!ch) return;
    if (kpin === ch.pin) {
      ctx.setCurUser(pinTarget);
      ctx.setScreen('dashboard');
      setPinTarget(null);
      setKpin('');
      setPinErr('');
    } else {
      setPinErr('Wrong PIN');
    }
  }

  async function submitCreatePin() {
    if (newPin.length < 4) {
      setPinErr('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinErr('PINs do not match');
      return;
    }
    // Save PIN directly to the child's Firestore doc (kids are anonymous
    // and don't have parent-level write access to the full config)
    var ch = ctx.getChild(pinTarget!);
    if (!ch || !ctx.familyId) return;
    try {
      await fsSaveChild(ctx.familyId, pinTarget!, { pin: newPin });
    } catch (err) {
      console.error('Failed to save PIN:', err);
      Sentry.captureException(err, { tags: { action: 'save-kid-pin' } });
      setPinErr('Could not save PIN. Please try again.');
      return;
    }
    ctx.setCurUser(pinTarget);
    ctx.setScreen('dashboard');
    setPinTarget(null);
    setCreatePin(false);
    setNewPin('');
    setConfirmPin('');
    setPinErr('');
    ctx.notify('PIN created!');
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen p-6'>
      <div className='font-display text-[42px] font-bold text-qslate tracking-wider mb-4 animate-fade-in'>
        LOOTBOUND
      </div>
      <div className='text-base text-qmuted mb-5'>Choose your profile</div>
      <div className='flex gap-5 flex-wrap justify-center mb-10'>
        {children.map(function (c, idx) {
          var cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          return (
            <button
              key={c.id}
              onClick={function () {
                doKidLogin(c.id);
              }}
              className={
                'flex flex-col items-center gap-3 px-7 py-6 rounded-card min-w-[120px] font-body text-qtext cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ' +
                cardBg
              }
            >
              <div className='text-[40px] animate-float'>{c.avatar}</div>
              <div className='font-display text-lg font-semibold'>{c.name}</div>
              {c.pin && (
                <div className='text-[10px] text-qmuted'>
                  <FontAwesomeIcon
                    icon={faLock}
                    className='mr-1'
                    style={FA_ICON_STYLE}
                  />
                  PIN protected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {children.length === 0 && (
        <div className='text-qdim mb-8 text-center max-w-[280px]'>
          No profiles yet. Ask your parent to add you!
        </div>
      )}

      {/* PIN entry for existing PIN */}
      {pinTarget && !createPin && (
        <div className='flex flex-col items-center gap-3 mb-8 bg-qmint p-6 rounded-btn animate-slide-up'>
          <div className='text-sm text-qmuted'>
            Enter PIN for {(ctx.getChild(pinTarget) || ({} as Child)).name}
          </div>
          <div className='flex gap-2'>
            <input
              type='password'
              maxLength={4}
              value={kpin}
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                setKpin(e.target.value);
                setPinErr('');
              }}
              onKeyDown={function (e: React.KeyboardEvent<HTMLInputElement>) {
                if (e.key === 'Enter') submitKidPin();
              }}
              className='quest-input w-[100px] text-center'
              autoFocus
            />
            <button onClick={submitKidPin} className='btn-primary'>
              Go
            </button>
          </div>
          {pinErr && (
            <div className='text-qcoral text-[13px] animate-shake'>
              {pinErr}
            </div>
          )}
          <button
            onClick={function () {
              setPinTarget(null);
              setPinErr('');
            }}
            className='btn-ghost'
          >
            Cancel
          </button>
          <button
            onClick={function () {
              setPinTarget(null);
              setPinErr('');
            }}
            className='text-[11px] text-qdim bg-transparent border-none cursor-pointer font-body mt-1 hover:text-qmuted transition-colors'
          >
            Forgot PIN? Ask a parent to reset it.
          </button>
        </div>
      )}

      {/* PIN creation for first-time kids */}
      {pinTarget && createPin && (
        <div className='flex flex-col items-center gap-3 mb-8 bg-qmint p-6 rounded-btn w-full max-w-[280px] animate-slide-up'>
          <div className='text-sm text-qmuted'>
            Create a PIN for {(ctx.getChild(pinTarget) || ({} as Child)).name}
          </div>
          <div className='text-xs text-qdim'>
            Choose a 4-digit PIN to protect your profile
          </div>
          <input
            type='password'
            maxLength={4}
            placeholder='New PIN'
            value={newPin}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setNewPin(e.target.value.replace(/[^0-9]/g, ''));
              setPinErr('');
            }}
            className='quest-input w-[120px] text-center'
            autoFocus
          />
          <input
            type='password'
            maxLength={4}
            placeholder='Confirm PIN'
            value={confirmPin}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setConfirmPin(e.target.value.replace(/[^0-9]/g, ''));
              setPinErr('');
            }}
            onKeyDown={function (e: React.KeyboardEvent<HTMLInputElement>) {
              if (e.key === 'Enter') submitCreatePin();
            }}
            className='quest-input w-[120px] text-center'
          />
          {pinErr && (
            <div className='text-qcoral text-[13px] animate-shake'>
              {pinErr}
            </div>
          )}
          <button onClick={submitCreatePin} className='btn-primary'>
            Set PIN
          </button>
          <button
            onClick={function () {
              setPinTarget(null);
              setCreatePin(false);
              setPinErr('');
            }}
            className='btn-ghost'
          >
            Cancel
          </button>
        </div>
      )}

      {/* Switch family button for kid devices */}
      {props.onSwitchFamily && (
        <button onClick={props.onSwitchFamily} className='btn-ghost mt-5'>
          Switch Family
        </button>
      )}
    </div>
  );
}
