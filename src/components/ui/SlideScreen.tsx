import React, { useEffect, useRef, useCallback, useId } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '../../fa.ts';
import { triggerHaptic } from '../../services/platform.ts';

interface SlideScreenProps {
  title: string;
  backLabel?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onBack: () => void;
  onAction?: () => void;
  children: React.ReactNode;
}

export default function SlideScreen(
  p: SlideScreenProps
): React.ReactElement {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const onBackRef = useRef(p.onBack);
  onBackRef.current = p.onBack;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doClose = useCallback(
    (callback?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (prefersReducedMotion || !panelRef.current) {
        callback?.();
        onBackRef.current();
        return;
      }
      gsap.to(panelRef.current, {
        x: '100%',
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          callback?.();
          onBackRef.current();
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
        { x: '100%' },
        { x: '0%', duration: 0.35, ease: 'power2.out' }
      );
    },
    { dependencies: [prefersReducedMotion] }
  );

  // Save previous focus on mount, restore on unmount
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
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
      className='fixed inset-0 z-[550] bg-white flex flex-col'
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className='flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3 border-b border-qborder shrink-0'>
        <button
          onClick={() => {
            triggerHaptic('light');
            doClose();
          }}
          className='bg-transparent border-none cursor-pointer font-body text-sm font-semibold text-qteal px-1 py-1 flex items-center gap-1'
        >
          <FontAwesomeIcon icon={faChevronLeft} className='text-xs' />
          {p.backLabel || 'Back'}
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
            {p.actionLabel}
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
