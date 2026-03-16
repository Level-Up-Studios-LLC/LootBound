import React from 'react';

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
}

export default function ConfirmDialog(
  props: ConfirmDialogProps
): React.ReactElement {
  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'>
      <div
        className={
          (props.bgColor || 'bg-white') +
          ' rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto shadow-lg'
        }
      >
        <div className='font-display text-xl font-bold mb-4 text-qslate'>
          {props.title}
        </div>
        <div className='mb-4'>
          <div className='text-sm text-qmuted'>{props.message}</div>
          {props.warning && (
            <div className='text-[13px] text-qcoral mt-2'>{props.warning}</div>
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
            onClick={props.onConfirm}
            className={
              (props.confirmColor || 'bg-qcoral') +
              ' text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
            }
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
