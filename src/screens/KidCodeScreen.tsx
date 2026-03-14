import React, { useState } from 'react';
import {
  lookupFamilyCode,
  setStoredFamilyCode,
} from '../services/familyCode.ts';
import { signInAnonymousKid } from '../services/auth.ts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft } from '../fa.ts';

interface KidCodeScreenProps {
  onSuccess: (familyId: string) => void;
  onBack: () => void;
}

export default function KidCodeScreen(
  props: KidCodeScreenProps
): React.ReactElement {
  var _code = useState(''),
    code = _code[0],
    setCode = _code[1];
  var _err = useState<string | null>(null),
    err = _err[0],
    setErr = _err[1];
  var _busy = useState(false),
    busy = _busy[0],
    setBusy = _busy[1];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    var val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= 6) {
      setCode(val);
      setErr(null);
    }
  }

  async function handleSubmit() {
    if (code.length < 6) {
      setErr('Code must be 6 characters');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      var familyId = await lookupFamilyCode(code);
      if (!familyId) {
        setErr('Invalid family code. Ask your parent for the code.');
        setBusy(false);
        return;
      }
      setStoredFamilyCode(code);
      await signInAnonymousKid();
      props.onSuccess(familyId);
    } catch (_e) {
      setErr('Something went wrong. Try again.');
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !busy) {
      handleSubmit();
    }
  }

  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
        LOOTBOUND
      </div>
      <div className='text-base text-qmuted mb-5'>Enter your family code</div>

      <div className='bg-qyellow w-full max-w-[360px] p-6 rounded-card flex flex-col items-center gap-5'>
        <input
          type='text'
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder='ABC123'
          maxLength={6}
          autoCapitalize='characters'
          autoComplete='off'
          className='quest-input text-center text-[28px] font-display font-bold tracking-[8px] py-3.5 px-4'
        />

        <div className='text-[13px] text-qslate text-center'>
          Ask your parent for this code
        </div>

        {err && (
          <div className='text-qcoral text-[13px] text-center'>{err}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy || code.length < 6}
          className='btn-primary w-full disabled:cursor-not-allowed'
        >
          {busy ? 'Connecting...' : 'Connect'}
        </button>

        <button onClick={props.onBack} disabled={busy} className='btn-ghost'>
          <FontAwesomeIcon icon={faAngleLeft} />
          Back
        </button>
      </div>
    </div>
  );
}
