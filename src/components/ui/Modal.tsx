import React, { useEffect, useRef, useCallback, useId } from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  bgColor?: string;
  onClose?: () => void;
}

export default function Modal(props: ModalProps): React.ReactElement {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap + Escape handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && props.onClose) {
        props.onClose();
        return;
      }
      if (e.key !== 'Tab' || !overlayRef.current) return;
      const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), a[href]:not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        const panel =
          overlayRef.current?.querySelector<HTMLElement>('[role="dialog"]');
        panel?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [props.onClose]
  );

  // Auto-focus first focusable child on mount, restore on unmount
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    if (overlayRef.current) {
      const first = overlayRef.current.querySelector<HTMLElement>(
        'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), a[href]:not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
      );
      if (first) {
        first.focus();
      } else {
        // No tabbable children — focus the dialog panel itself
        const panel =
          overlayRef.current.querySelector<HTMLElement>('[role="dialog"]');
        panel?.focus();
      }
    }
    return () => {
      prevFocusRef.current?.focus();
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      role='presentation'
      className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5 animate-fade-in'
      onKeyDown={handleKeyDown}
      onClick={props.onClose}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          (props.bgColor || 'bg-qyellow') +
          ' rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto shadow-lg animate-slide-up'
        }
        onClick={e => e.stopPropagation()}
      >
        <div
          id={titleId}
          className='font-display text-xl font-bold mb-4 text-qslate'
        >
          {props.title}
        </div>
        {props.children}
      </div>
    </div>
  );
}
