import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faXmark, faChevronRight } from '../fa.ts';
import { triggerHaptic } from '../services/platform.ts';

interface FullPageMenuItem {
  id: string;
  icon: IconDefinition;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}

interface FullPageMenuProps {
  items: FullPageMenuItem[];
  userName?: string;
  userPhoto?: string;
  onClose: () => void;
}

export default function FullPageMenu(p: FullPageMenuProps): React.ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(p.onClose);
  onCloseRef.current = p.onClose;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doClose = useCallback(
    (callback?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (prefersReducedMotion || !overlayRef.current) {
        callback?.();
        onCloseRef.current();
        return;
      }
      const panel = overlayRef.current.querySelector('.menu-panel');
      if (panel) {
        gsap.to(panel, {
          x: '100%',
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            callback?.();
            onCloseRef.current();
          },
        });
      } else {
        callback?.();
        onCloseRef.current();
      }
    },
    [prefersReducedMotion]
  );

  // Save previous focus on mount, restore on unmount
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    return () => {
      prevFocusRef.current?.focus();
    };
  }, []);

  // Entrance animation
  useGSAP(
    () => {
      // Move focus into the dialog immediately so the focus trap is active
      // during the entrance animation
      overlayRef.current?.querySelector<HTMLElement>('.menu-close')?.focus();

      if (prefersReducedMotion) return;

      gsap.fromTo(
        '.menu-panel',
        { x: '100%' },
        { x: '0%', duration: 0.35, ease: 'power2.out' }
      );
      gsap.fromTo(
        '.menu-item',
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          stagger: 0.05,
          delay: 0.15,
          ease: 'power2.out',
        }
      );
    },
    { scope: overlayRef, dependencies: [prefersReducedMotion] }
  );

  // Focus trap + Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        doClose();
        return;
      }
      if (e.key !== 'Tab' || !overlayRef.current) return;
      const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
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

  // Initials from name
  const initials = p.userName
    ? (() => {
        const parts = p.userName.trim().split(/\s+/);
        return parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : p.userName.slice(0, 2).toUpperCase();
      })()
    : null;

  return (
    <div
      ref={overlayRef}
      className='fixed inset-0 z-[600] bg-black/50'
      role='dialog'
      aria-modal='true'
      aria-label='Menu'
      onKeyDown={handleKeyDown}
      onClick={e => {
        if (e.target === overlayRef.current) doClose();
      }}
    >
      <div className='menu-panel absolute right-0 top-0 bottom-0 w-full max-w-[320px] bg-white flex flex-col shadow-2xl'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-4 border-b border-qborder'>
          <div className='flex items-center gap-3'>
            {p.userPhoto ? (
              <img
                src={p.userPhoto}
                alt=''
                className='w-11 h-11 rounded-full object-cover shrink-0'
                referrerPolicy='no-referrer'
              />
            ) : initials ? (
              <div className='w-11 h-11 rounded-full bg-qteal/20 flex items-center justify-center font-display font-bold text-qteal text-base shrink-0'>
                {initials}
              </div>
            ) : null}
            {p.userName && (
              <div className='font-display text-lg font-bold text-qslate'>
                {p.userName}
              </div>
            )}
          </div>
          <button
            className='menu-close w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-qslate hover:bg-qslate-dim transition-colors'
            aria-label='Close menu'
            onClick={() => doClose()}
          >
            <FontAwesomeIcon icon={faXmark} className='text-xl' />
          </button>
        </div>

        {/* Menu items */}
        <nav className='flex-1 py-3'>
          {p.items.map(item => (
            <button
              key={item.id}
              className={
                'menu-item w-full flex items-center gap-4 px-5 py-4 bg-transparent border-none cursor-pointer font-body text-base transition-colors hover:bg-qmint/30 ' +
                (item.destructive ? 'text-qcoral' : 'text-qslate')
              }
              onClick={() => {
                triggerHaptic('light');
                doClose(item.onClick);
              }}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className='text-lg w-6 text-center'
                aria-hidden='true'
              />
              <span className='flex-1 text-left font-semibold'>
                {item.label}
              </span>
              <FontAwesomeIcon
                icon={faChevronRight}
                className='text-sm text-qdim'
                aria-hidden='true'
              />
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
