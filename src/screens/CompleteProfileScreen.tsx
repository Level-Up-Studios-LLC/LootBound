import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPartyHorn } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import type { AuthUser } from '../services/auth.ts';
import { switchToExistingFamily, getCurrentUid } from '../services/auth.ts';
import { saveParentMember, saveConfig } from '../services/firestoreStorage.ts';
import PasswordInput from '../components/ui/PasswordInput.tsx';
import { auth as firebaseAuth } from '../services/firebase.ts';
import { copyToClipboard } from '../services/platform.ts';
import { md5 } from '../utils.ts';

const REFERRAL_OPTIONS = [
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

function getGravatarUrl(email: string, size = 120): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

function ProfilePicture(props: {
  photoURL?: string;
  email: string;
  name: string;
}) {
  const googlePhoto = props.photoURL || firebaseAuth.currentUser?.photoURL;

  if (googlePhoto) {
    return (
      <img
        src={googlePhoto}
        alt='Profile'
        className='w-20 h-20 rounded-full object-cover border-2 border-qteal/30'
        referrerPolicy='no-referrer'
      />
    );
  }

  // Default to initials when no provider photo is available
  const initial = (props.name || props.email || '?')[0].toUpperCase();
  return (
    <div className='w-20 h-20 rounded-full bg-qteal/20 flex items-center justify-center text-3xl font-bold text-qteal border-2 border-qteal/30'>
      {initial}
    </div>
  );
}

interface CompleteProfileScreenProps {
  authUser: AuthUser;
  familyCode: string;
  onComplete: () => void;
}

export default function CompleteProfileScreen(
  props: CompleteProfileScreenProps
): React.ReactElement | null {
  const [parentName, setParentName] = useState(
    firebaseAuth.currentUser?.displayName ?? ''
  );
  const [joinCode, setJoinCode] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [referral, setReferral] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [finalCode, setFinalCode] = useState(props.familyCode);
  const [copied, setCopied] = useState(false);

  const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= 6) setJoinCode(val);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!parentName.trim()) {
      setError('Name is required');
      return;
    }
    if (pin && pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin && pin !== pinConfirm) {
      setError('PINs do not match');
      return;
    }
    const join = joinCode.trim();
    if (join && join.length !== 6) {
      setError('Family code must be 6 characters');
      return;
    }

    setBusy(true);
    try {
      const uid = getCurrentUid();
      if (!uid) throw new Error('Not signed in');

      // Save parent profile
      const memberData: Record<string, string> = {
        parentName: parentName.trim(),
      };
      const googlePhoto = firebaseAuth.currentUser?.photoURL;
      if (googlePhoto) {
        memberData.parentPhotoURL = googlePhoto;
      } else if (props.authUser.email) {
        // Only save Gravatar URL if the image actually exists
        const gravatarUrl = getGravatarUrl(props.authUser.email);
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          const res = await fetch(gravatarUrl, { method: 'HEAD', signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) memberData.parentPhotoURL = gravatarUrl;
        } catch (_e) { /* Gravatar unreachable or timed out — skip */ }
      }
      if (pin) {
        memberData.parentPin = pin;
      }
      await saveParentMember(uid, memberData);

      // Handle family code — join existing or keep auto-generated
      let displayCode = props.familyCode;
      if (joinCode.trim().length === 6) {
        try {
          await switchToExistingFamily(uid, joinCode.trim(), props.familyCode);
          displayCode = joinCode.trim();
        } catch (err: any) {
          if (err?.code === 'auth/invalid-family-code') {
            setError('Invalid family code');
            setBusy(false);
            return;
          }
          throw err;
        }
      }

      // Save referral to own family config (not when joining existing)
      if (referral && joinCode.trim().length !== 6) {
        await saveConfig(uid, { referralSource: referral });
      }

      setFinalCode(displayCode);
      setDone(true);
    } catch (err) {
      console.error('Profile completion failed:', err);
      Sentry.captureException(err, { tags: { action: 'complete-profile' } });
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) handleSubmit();
  };

  // Redirect joined users via useEffect instead of render-time side effect
  const joined = done && joinCode.trim().length === 6;
  useEffect(() => {
    if (joined) props.onComplete();
  }, [joined, props.onComplete]);

  // Phase 2: Family code display (skip for users who joined an existing family)
  if (done) {
    if (joined) return null;
    return (
      <div className='page-wrapper page-centered'>
        <div className='text-5xl mb-5'>
          <FontAwesomeIcon icon={faPartyHorn} style={FA_ICON_STYLE} />
        </div>
        <div className='font-display text-2xl font-bold mb-3'>
          Family Created!
        </div>
        <div className='text-sm text-qmuted text-center mb-8 max-w-[300px]'>
          Share this code with your kids' devices so they can connect to your family
        </div>

        <button
          onClick={() => {
            copyToClipboard(finalCode).then(ok => {
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            });
          }}
          className='bg-qmint rounded-card py-5 px-8 mb-2 border-none cursor-pointer w-full hover:opacity-90 transition-opacity'
        >
          <div className='font-display text-4xl font-bold text-qteal tracking-[8px] text-center'>
            {finalCode}
          </div>
        </button>
        <div className='text-[12px] text-qdim text-center mb-6'>
          {copied ? 'Copied!' : 'Tap to copy'}
        </div>

        <div className='text-[13px] text-qdim text-center mb-8 max-w-[300px]'>
          You can also find this code later in Settings
        </div>

        <button onClick={props.onComplete} className='btn-primary'>
          Get Started
        </button>
      </div>
    );
  }

  // Phase 1: Profile form
  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
        LOOTBOUND
      </div>
      <div className='text-sm text-qmuted mb-5'>Complete your profile</div>

      <div className='w-full max-w-[360px] rounded-card p-6 bg-qyellow flex flex-col gap-4'>
        <div className='flex justify-center mb-2'>
          <ProfilePicture
            photoURL={props.authUser.photoURL}
            email={props.authUser.email}
            name={parentName}
          />
        </div>

        <div>
          <label htmlFor='cp-name' className='block text-qslate font-semibold mb-1 tracking-wide'>
            Full Name
          </label>
          <input
            id='cp-name'
            type='text'
            placeholder='Your full name'
            value={parentName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setParentName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            className='quest-input'
            autoComplete='given-name'
            autoFocus
          />
        </div>

        <div>
          <label htmlFor='cp-email' className='block text-qslate font-semibold mb-1 tracking-wide'>
            Email
          </label>
          <input
            id='cp-email'
            type='email'
            value={props.authUser.email}
            readOnly
            className='quest-input opacity-60 cursor-not-allowed'
          />
        </div>

        <div>
          <label htmlFor='cp-family-code' className='block text-qslate font-semibold mb-1 tracking-wide'>
            Family Code
          </label>
          <input
            id='cp-family-code'
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

        <div>
          <label htmlFor='cp-pin' className='block text-qslate font-semibold mb-1 tracking-wide'>
            Parent PIN
          </label>
          <PasswordInput
            id='cp-pin'
            aria-label='Parent PIN'
            maxLength={6}
            inputMode='numeric'
            placeholder='4+ digit PIN'
            value={pin}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPin(e.target.value.replace(/[^0-9]/g, ''));
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            className='quest-input'
          />
          {pin && (
            <PasswordInput
              id='cp-pin-confirm'
              aria-label='Confirm PIN'
              maxLength={6}
              inputMode='numeric'
              placeholder='Confirm PIN'
              value={pinConfirm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPinConfirm(e.target.value.replace(/[^0-9]/g, ''));
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className='quest-input mt-2'
            />
          )}
          <span className='text-qmuted text-xs font-normal'>
            (optional — quick access without password)
          </span>
        </div>

        <div>
          <label htmlFor='cp-referral' className='block text-qslate font-semibold mb-1 tracking-wide'>
            How did you hear about us?
          </label>
          <select
            id='cp-referral'
            value={referral}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setReferral(e.target.value);
            }}
            className='quest-input'
          >
            <option value=''>Select one (optional)</option>
            {REFERRAL_OPTIONS.map(o => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div role='alert' className='text-qcoral text-[13px] text-center py-1.5'>
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
            : joinCode.trim().length === 6
              ? 'Join Family'
              : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
}
