import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '../fa.ts';

interface CreatePinPromptProps {
  onCreated: (pin: string) => void;
  onSkip: () => void;
}

var duotoneStyle = {
  "--fa-primary-color": "#4B4E6D",
  "--fa-secondary-color": "#FF8C94",
  "--fa-secondary-opacity": "1"
} as any;

export default function CreatePinPrompt(
  props: CreatePinPromptProps
): React.ReactElement {
  var _pin = useState(''),
    pin = _pin[0],
    setPin = _pin[1];
  var _confirm = useState(''),
    confirm = _confirm[0],
    setConfirm = _confirm[1];
  var _err = useState(''),
    err = _err[0],
    setErr = _err[1];

  function handleSubmit() {
    if (pin.length < 4) {
      setErr('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirm) {
      setErr('PINs do not match');
      return;
    }
    props.onCreated(pin);
  }

  return (
    <div className="page-wrapper page-centered">
      <div className="font-display text-5xl font-bold text-qslate tracking-wider mb-1">
        LOOTBOUND
      </div>
      <div className="font-display text-lg font-semibold mb-3">
        <FontAwesomeIcon icon={faLock} className="mr-2" style={duotoneStyle} />
        Create a Parent PIN
      </div>
      <div className="text-[13px] text-qmuted text-center mb-9 max-w-[280px]">
        A PIN lets you quickly access the parent dashboard without entering your
        password each time.
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-[280px]">
        <input
          type="password"
          maxLength={6}
          placeholder="New PIN (4+ digits)"
          value={pin}
          onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
            setPin(e.target.value.replace(/[^0-9]/g, ''));
            setErr('');
          }}
          className="quest-input text-center text-lg"
          autoFocus
        />
        <input
          type="password"
          maxLength={6}
          placeholder="Confirm PIN"
          value={confirm}
          onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
            setConfirm(e.target.value.replace(/[^0-9]/g, ''));
            setErr('');
          }}
          onKeyDown={function (e: React.KeyboardEvent) {
            if (e.key === 'Enter') handleSubmit();
          }}
          className="quest-input text-center text-lg"
        />

        {err && (
          <div className="text-qcoral text-[13px]">{err}</div>
        )}

        <button
          onClick={handleSubmit}
          className="btn-primary w-full mt-2"
        >
          Set PIN
        </button>

        <button
          onClick={props.onSkip}
          className="btn-ghost"
        >
          Skip for now
        </button>
        <div className="text-[11px] text-qdim text-center max-w-[260px]">
          You can always create a PIN later in Settings. Without a PIN, you'll
          need to enter your password each time.
        </div>
      </div>
    </div>
  );
}
