import React, { useState } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  warning?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  bgColor?: string;
  confirmColor?: string;
  children?: React.ReactNode;
  requiredText?: string;
  requiredTextLabel?: string;
}

export default function ConfirmDialog(
  props: ConfirmDialogProps
): React.ReactElement {
  const [typed, setTyped] = useState('');

  const confirmed =
    !props.requiredText ||
    typed.trim().toLowerCase() === props.requiredText.trim().toLowerCase();

  return (
    <div
      className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'
      role='dialog'
      aria-modal='true'
      aria-labelledby='confirm-dialog-title'
    >
      <div
        className={
          (props.bgColor || 'bg-white') +
          ' rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto shadow-lg'
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
        <div className='flex gap-3 justify-end'>
          <button
            onClick={props.onCancel}
            className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (confirmed) props.onConfirm();
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
        </div>
      </div>
    </div>
  );
}
