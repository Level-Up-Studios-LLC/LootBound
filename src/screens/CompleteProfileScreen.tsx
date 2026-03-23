import React, { useState } from 'react';
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

// Minimal MD5 implementation for Gravatar URLs
function md5(input: string): string {
  const k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23,
    4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
    21, 6, 10, 15, 21,
  ];

  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }

  const origLen = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = origLen * 8;
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff);
  bytes.push(0, 0, 0, 0);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < bytes.length; i += 64) {
    const m: number[] = [];
    for (let j = 0; j < 16; j++) {
      m[j] =
        bytes[i + j * 4] |
        (bytes[i + j * 4 + 1] << 8) |
        (bytes[i + j * 4 + 2] << 16) |
        (bytes[i + j * 4 + 3] << 24);
    }

    let a = a0, b = b0, c = c0, d = d0;
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if (j < 16) { f = (b & c) | (~b & d); g = j; }
      else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * j) % 16; }

      f = (f + a + k[j] + m[g]) >>> 0;
      a = d; d = c; c = b;
      b = (b + ((f << s[j]) | (f >>> (32 - s[j])))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const hex = (n: number) =>
    [0, 8, 16, 24].map(s => ((n >>> s) & 0xff).toString(16).padStart(2, '0')).join('');
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

function getGravatarUrl(email: string, size = 120): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

function ProfilePicture(props: {
  photoURL?: string;
  email: string;
  name: string;
}) {
  const [gravatarFailed, setGravatarFailed] = useState(false);
  const googlePhoto = firebaseAuth.currentUser?.photoURL;

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

  if (!gravatarFailed && props.email) {
    return (
      <img
        src={getGravatarUrl(props.email)}
        alt='Profile'
        className='w-20 h-20 rounded-full object-cover border-2 border-qteal/30'
        onError={() => setGravatarFailed(true)}
      />
    );
  }

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
        memberData.parentPhotoURL = getGravatarUrl(props.authUser.email);
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

      // Save referral to family config
      if (referral) {
        const familyId = joinCode.trim().length === 6
          ? displayCode // joined family — but we don't save referral to someone else's family
          : uid; // own family
        if (!joinCode.trim()) {
          await saveConfig(familyId, { referralSource: referral });
        }
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

  // Phase 2: Family code display (skip for users who joined an existing family)
  if (done) {
    const joined = joinCode.trim().length === 6;
    if (joined) {
      props.onComplete();
      return null;
    }
    return (
      <div className='page-wrapper page-centered'>
        <div className='text-5xl mb-5'>
          <FontAwesomeIcon icon={faPartyHorn} style={FA_ICON_STYLE} />
        </div>
        <div className='font-display text-2xl font-bold mb-3'>
          {joined ? 'Family Joined!' : 'Family Created!'}
        </div>
        <div className='text-sm text-qmuted text-center mb-8 max-w-[300px]'>
          {joined
            ? "You've joined an existing family. Here's the family code for reference."
            : "Share this code with your kids' devices so they can connect to your family"}
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
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Full Name
          </label>
          <input
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
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Email
          </label>
          <input
            type='email'
            value={props.authUser.email}
            readOnly
            className='quest-input opacity-60 cursor-not-allowed'
          />
        </div>

        <div>
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Family Code
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

        <div>
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            Parent PIN
          </label>
          <PasswordInput
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
          <label className='block text-qslate font-semibold mb-1 tracking-wide'>
            How did you hear about us?
          </label>
          <select
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
            : joinCode.trim().length === 6
              ? 'Join Family'
              : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
}
