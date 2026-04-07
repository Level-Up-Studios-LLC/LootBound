import React, { useEffect, useRef, useCallback, useId } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { triggerHaptic } from '../../services/platform.ts';

interface FullScreenSlideUpProps {
  title: string;
  cancelLabel?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onCancel: () => void;
  onAction?: () => void;
  children: React.ReactNode;
}

export default function FullScreenSlideUp(
  p: FullScreenSlideUpProps
): React.ReactElement {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const onCancelRef = useRef(p.onCancel);
  onCancelRef.current = p.onCancel;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doClose = useCallback(
    (callback?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (prefersReducedMotion || !panelRef.current) {
        callback?.();
        onCancelRef.current();
        return;
      }
      gsap.to(panelRef.current, {
        y: '100%',
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          callback?.();
          onCancelRef.current();
        },
      });
    },
    [prefersReducedMotion]
  );

  // Entrance animation
  useGSAP(
    () => {
      if (prefersReducedMotion || !panelRef.current) return;
      gsap.fromTo(
        panelRef.current,
        { y: '100%' },
        { y: '0%', duration: 0.35, ease: 'power2.out' }
      );
    },
    { dependencies: [prefersReducedMotion] }
  );

  // Save previous focus on mount, restore on unmount
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    // Focus the first focusable element inside the panel
    if (panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>(
        [
          'button:not([disabled]):not([hidden])',
          'a[href]:not([hidden])',
          'input:not([disabled]):not([hidden])',
          'select:not([disabled]):not([hidden])',
          'textarea:not([disabled]):not([hidden])',
          '[tabindex]:not([tabindex="-1"]):not([hidden])',
        ].join(', ')
      );
      if (first) {
        first.focus();
      } else {
        panelRef.current.focus();
      }
    }
    return () => {
      prevFocusRef.current?.focus();
    };
  }, []);

  // Focus trap + Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        doClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        [
          'button:not([disabled]):not([hidden])',
          'a[href]:not([hidden])',
          'input:not([disabled]):not([hidden])',
          'select:not([disabled]):not([hidden])',
          'textarea:not([disabled]):not([hidden])',
          '[tabindex]:not([tabindex="-1"]):not([hidden])',
        ].join(', ')
      );
      if (focusable.length === 0) {
        e.preventDefault();
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
    [doClose]
  );

  return (
    <div
      ref={panelRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      tabIndex={-1}
      className='fixed inset-0 z-[500] bg-white flex flex-col'
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className='flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3 border-b border-qborder shrink-0'>
        <button
          onClick={() => {
            triggerHaptic('light');
            doClose();
          }}
          className='bg-transparent border-none cursor-pointer font-body text-sm font-semibold text-qteal px-1 py-1'
        >
          {p.cancelLabel || 'Cancel'}
        </button>
        <div
          id={titleId}
          className='font-display text-base font-bold text-qslate'
        >
          {p.title}
        </div>
        {p.onAction ? (
          <button
            onClick={() => {
              if (!p.actionDisabled) {
                triggerHaptic('light');
                p.onAction!();
              }
            }}
            disabled={p.actionDisabled}
            className={
              'bg-transparent border-none cursor-pointer font-body text-sm font-semibold px-1 py-1 ' +
              (p.actionDisabled ? 'text-qdim' : 'text-qteal')
            }
          >
            {p.actionLabel || 'Add'}
          </button>
        ) : (
          <div className='w-12' />
        )}
      </div>

      {/* Scrollable body */}
      <div className='flex-1 overflow-y-auto px-4 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))]'>
        {p.children}
      </div>
    </div>
  );
}
