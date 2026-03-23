import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import * as Sentry from '@sentry/react';
import { useAppContext } from '../context/AppContext.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import { saveChild as fsSaveChild } from '../services/firestoreStorage.ts';
import PasswordInput from '../components/ui/PasswordInput.tsx';

interface LoginScreenProps {
  onSwitchFamily?: () => void;
}

export default function LoginScreen(
  props: LoginScreenProps
): React.ReactElement {
  const [kpin, setKpin] = useState<string>('');
  const [pinErr, setPinErr] = useState<string>('');
  const [pinTarget, setPinTarget] = useState<string | null>(null);
  const [createPin, setCreatePin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLDivElement>(null);

  const ctx = useAppContext();
  const children = ctx.children;

  const doKidLogin = (uid: string): void => {
    const ch = ctx.getChild(uid);
    if (!ch) return;
    if (ch.pin) {
      setPinTarget(uid);
      setCreatePin(false);
      setKpin('');
      setPinErr('');
    } else {
      setPinTarget(uid);
      setCreatePin(true);
      setNewPin('');
      setConfirmPin('');
      setPinErr('');
    }
  };

  const submitKidPin = (): void => {
    if (!pinTarget) return;
    const ch = ctx.getChild(pinTarget);
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
  };

  const submitCreatePin = async () => {
    if (newPin.length < 4) {
      setPinErr('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinErr('PINs do not match');
      return;
    }
    if (!pinTarget) return;
    const ch = ctx.getChild(pinTarget);
    if (!ch || !ctx.familyId) return;
    try {
      await fsSaveChild(ctx.familyId, pinTarget, { pin: newPin });
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
  };

  // Entrance animations
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.login-title', { opacity: 0, y: -20, duration: 0.4 });
    tl.fromTo('.login-profile', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.35, stagger: 0.08 }, '-=0.2');
  }, { scope: containerRef });

  // Modal enter animation
  useEffect(() => {
    if (pinTarget && modalRef.current) {
      const overlay = modalRef.current;
      const card = overlay.querySelector('.login-modal-card');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      if (card) {
        gsap.fromTo(card, { scale: 0.85, y: 30 }, { scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' });
      }
    }
  }, [pinTarget]);

  // Error shake
  useEffect(() => {
    if (pinErr && errRef.current) {
      gsap.fromTo(errRef.current,
        { x: -6 },
        { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }
      );
    }
  }, [pinErr]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen p-6' ref={containerRef}>
      <div className='font-display text-[42px] font-bold text-qslate tracking-wider mb-4 login-title'>
        LOOTBOUND
      </div>
      <div className='text-base text-qmuted mb-5'>Choose your profile</div>
      <div className='flex gap-5 flex-wrap justify-center mb-10'>
        {children.map((c, idx) => {
          const cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          return (
            <button
              key={c.id}
              onClick={() => {
                doKidLogin(c.id);
              }}
              className={
                'flex flex-col items-center gap-3 px-7 py-6 rounded-card min-w-[120px] font-body text-qtext cursor-pointer border-none transition-all hover:scale-105 active:scale-95 login-profile ' +
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

      {/* PIN modal (enter or create) */}
      {pinTarget && (() => {
        const targetChild = ctx.getChild(pinTarget);
        if (!targetChild) return null;
        const isCreate = createPin;

        return (
          <div
            ref={modalRef}
            className='fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-5'
            style={{ opacity: 0 }}
          >
            <div
              className='flex flex-col items-center gap-3 bg-white p-6 rounded-card w-full max-w-[300px] shadow-xl login-modal-card'
              role='dialog'
              aria-label={
                isCreate
                  ? `Create PIN for ${targetChild.name}`
                  : `Enter PIN for ${targetChild.name}`
              }
            >
              <div className='text-[32px] mb-1'>{targetChild.avatar}</div>
              <div className='text-sm text-qmuted'>
                {isCreate
                  ? `Create a PIN for ${targetChild.name}`
                  : `Enter PIN for ${targetChild.name}`}
              </div>

              {isCreate ? (
                <>
                  <div className='text-xs text-qdim'>
                    Choose a 4-digit PIN to protect your profile
                  </div>
                  <PasswordInput
                    maxLength={4}
                    placeholder='New PIN'
                    value={newPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNewPin(e.target.value.replace(/[^0-9]/g, ''));
                      setPinErr('');
                    }}
                    className='quest-input w-[120px] text-center'
                    autoFocus
                  />
                  <PasswordInput
                    maxLength={4}
                    placeholder='Confirm PIN'
                    value={confirmPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setConfirmPin(e.target.value.replace(/[^0-9]/g, ''));
                      setPinErr('');
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') submitCreatePin();
                    }}
                    className='quest-input w-[120px] text-center'
                  />
                </>
              ) : (
                <div className='flex gap-2'>
                  <PasswordInput
                    maxLength={4}
                    value={kpin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setKpin(e.target.value.replace(/[^0-9]/g, ''));
                      setPinErr('');
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') submitKidPin();
                    }}
                    className='quest-input w-[100px] text-center'
                    autoFocus
                  />
                  <button onClick={submitKidPin} className='btn-primary'>
                    Go
                  </button>
                </div>
              )}

              {pinErr && (
                <div ref={errRef} className='text-qcoral text-[13px]'>
                  {pinErr}
                </div>
              )}

              {isCreate ? (
                <button onClick={submitCreatePin} className='btn-primary'>
                  Set PIN
                </button>
              ) : (
                <button
                  onClick={() => {
                    setPinTarget(null);
                    setPinErr('');
                  }}
                  className='text-[11px] text-qdim bg-transparent border-none cursor-pointer font-body mt-1 hover:text-qmuted transition-colors'
                >
                  Forgot PIN? Ask a parent to reset it.
                </button>
              )}
              <button
                onClick={() => {
                  setPinTarget(null);
                  setCreatePin(false);
                  setPinErr('');
                }}
                className='btn-ghost'
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {props.onSwitchFamily && (
        <button onClick={props.onSwitchFamily} className='btn-ghost mt-5'>
          Switch Family
        </button>
      )}
    </div>
  );
}
