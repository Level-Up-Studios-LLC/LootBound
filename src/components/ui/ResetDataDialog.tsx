import React, { useState, useRef, useEffect } from 'react';
import type { ResetOptions } from '../../types.ts';

interface ResetDataDialogProps {
  onConfirm: (opts: ResetOptions) => void;
  onCancel: () => void;
}

const CATEGORIES: { key: keyof ResetOptions; label: string; desc: string }[] = [
  { key: 'coins', label: 'Coin Balances', desc: 'Reset all coins to 0' },
  { key: 'xpLevels', label: 'XP & Levels', desc: 'Reset XP and levels back to 1' },
  { key: 'streaks', label: 'Streaks', desc: 'Clear all streak progress' },
  { key: 'taskHistory', label: 'Mission History', desc: 'Clear task logs and photo proof' },
  { key: 'redemptions', label: 'Redemption History', desc: 'Clear all redemption and pending records' },
];

export default function ResetDataDialog(props: ResetDataDialogProps): React.ReactElement {
  const [opts, setOpts] = useState<ResetOptions>({});
  const [typed, setTyped] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const anySelected = CATEGORIES.some(c => opts[c.key]);
  const allSelected = CATEGORIES.every(c => opts[c.key]);
  const confirmed = anySelected && typed.trim().toUpperCase() === 'RESET';

  const toggleCategory = (key: keyof ResetOptions) => {
    setOpts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setOpts({});
    } else {
      const all: ResetOptions = {};
      CATEGORIES.forEach(c => { all[c.key] = true; });
      setOpts(all);
    }
  };

  // Focus management
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    if (overlayRef.current) {
      const first = overlayRef.current.querySelector<HTMLElement>('input, button');
      if (first) first.focus();
    }
    return () => {
      if (prevFocusRef.current) prevFocusRef.current.focus();
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5 animate-fade-in'
      role='dialog'
      aria-modal='true'
      aria-labelledby='reset-dialog-title'
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { props.onCancel(); return; }
        if (e.key !== 'Tab' || !overlayRef.current) return;
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }}
    >
      <div className='bg-white rounded-card p-6 w-full max-w-[400px] max-h-[85vh] overflow-y-auto shadow-lg animate-slide-up'>
        <div id='reset-dialog-title' className='font-display text-xl font-bold mb-3 text-qslate'>
          Reset Data
        </div>
        <div className='text-sm text-qmuted mb-4'>
          Select what to reset for all children:
        </div>

        {/* Select All */}
        <label className='flex items-center gap-3 py-2.5 border-b border-qborder mb-2 cursor-pointer'>
          <input
            type='checkbox'
            checked={allSelected}
            onChange={toggleAll}
            className='w-[18px] h-[18px] accent-qteal cursor-pointer'
          />
          <span className='text-sm font-bold text-qslate'>Select All</span>
        </label>

        {/* Category checkboxes */}
        <div className='flex flex-col gap-1 mb-4'>
          {CATEGORIES.map(cat => (
            <label key={cat.key} className='flex items-center gap-3 py-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={!!opts[cat.key]}
                onChange={() => toggleCategory(cat.key)}
                className='w-[18px] h-[18px] accent-qteal cursor-pointer'
              />
              <div>
                <div className='text-[13px] font-semibold text-qslate'>{cat.label}</div>
                <div className='text-[11px] text-qmuted'>{cat.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Warning */}
        {anySelected && (
          <div role='alert' className='text-[13px] text-qcoral mb-3'>
            This action cannot be undone.
          </div>
        )}

        {/* Confirmation input */}
        <div className='mb-4'>
          <label htmlFor='reset-confirm-text' className='text-[13px] text-qmuted mb-1.5 block'>
            Type "RESET" to confirm:
          </label>
          <input
            id='reset-confirm-text'
            type='text'
            value={typed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTyped(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && confirmed) props.onConfirm(opts);
            }}
            className='quest-input'
            autoComplete='off'
          />
        </div>

        {/* Actions */}
        <div className='flex gap-3 justify-end'>
          <button
            onClick={props.onCancel}
            className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
          >
            Cancel
          </button>
          <button
            onClick={() => { if (confirmed) props.onConfirm(opts); }}
            disabled={!confirmed}
            className={
              'bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none font-body' +
              (confirmed ? ' cursor-pointer' : ' opacity-40 cursor-not-allowed')
            }
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
