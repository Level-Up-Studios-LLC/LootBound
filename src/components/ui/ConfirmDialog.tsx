import React, { useState, useRef, useEffect } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  bgColor?: string;
  confirmColor?: string;
  children?: React.ReactNode;
  requiredText?: string;
  requiredTextLabel?: string;
  dontAskAgainKey?: string;
}

export default function ConfirmDialog(
  props: ConfirmDialogProps
): React.ReactElement {
  const [typed, setTyped] = useState('');
  const [dontAsk, setDontAsk] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const confirmed =
    !props.requiredText ||
    typed.trim().toLowerCase() === props.requiredText.trim().toLowerCase();

  // Focus management: save previous focus, auto-focus first element, restore on unmount
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
      aria-labelledby='confirm-dialog-title'
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
      <div
        className={
          (props.bgColor || 'bg-white') +
          ' rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto shadow-lg animate-slide-up'
        }
      >
        <div
          id='confirm-dialog-title'
          className='font-display text-xl font-bold mb-4 text-qslate'
        >
          {props.title}
        </div>
        <div className='mb-4'>
          <div className='text-sm text-qmuted'>{props.message}</div>
          {props.warning && (
            <div className='text-[13px] text-qcoral mt-2'>{props.warning}</div>
          )}
          {props.requiredText && (
            <div className='mt-3'>
              <label
                htmlFor='confirm-required-text'
                className='text-[13px] text-qmuted mb-1.5 block'
              >
                {props.requiredTextLabel ||
                  `Type "${props.requiredText}" to confirm:`}
              </label>
              <input
                id='confirm-required-text'
                type='text'
                value={typed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTyped(e.target.value);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && confirmed) props.onConfirm();
                }}
                className='quest-input'
                autoFocus
              />
            </div>
          )}
          {props.children}
        </div>
        {props.dontAskAgainKey && (
          <label className='flex items-center gap-2 mb-4 cursor-pointer'>
            <input
              type='checkbox'
              checked={dontAsk}
              onChange={(e) => setDontAsk(e.target.checked)}
              className='w-4 h-4 accent-qteal'
            />
            <span className='text-[12px] text-qmuted'>Don't ask me again</span>
          </label>
        )}
        <div className='flex gap-3 justify-end'>
          <button
            onClick={props.onCancel}
            className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
          >
            Cancel
          </button>
          {props.confirmLabel && (
            <button
              onClick={() => {
                if (!confirmed) return;
                if (dontAsk && props.dontAskAgainKey) {
                  try { localStorage.setItem(props.dontAskAgainKey, '1'); } catch (_e) {}
                }
                props.onConfirm();
              }}
              disabled={!confirmed}
              className={
                (props.confirmColor || 'bg-qcoral') +
                ' text-white rounded-badge px-5 py-2.5 font-bold border-none font-body' +
                (confirmed ? ' cursor-pointer' : ' opacity-40 cursor-not-allowed')
              }
            >
              {props.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
