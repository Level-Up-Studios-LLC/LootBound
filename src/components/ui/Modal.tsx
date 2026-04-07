import React, { useEffect, useRef, useCallback, useId } from 'react';
import { triggerHaptic } from '../../services/platform.ts';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  bgColor?: string;
  onClose?: () => void;
}

export default function Modal(props: ModalProps): React.ReactElement {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef(0);

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

  // Drag-to-dismiss handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    // Only allow dragging down
    if (delta > 0) {
      dragCurrentY.current = delta;
      if (panelRef.current) {
        panelRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragStartY.current === null) return;
    const panel = panelRef.current;
    dragStartY.current = null;
    if (!panel) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (dragCurrentY.current > panel.offsetHeight * 0.4 && props.onClose) {
      if (reduced) {
        panel.style.transition = 'none';
        panel.style.transform = 'translateY(100%)';
        props.onClose();
      } else {
        panel.style.transition =
          'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        panel.style.transform = 'translateY(100%)';
        setTimeout(() => props.onClose!(), 300);
      }
    } else {
      panel.style.transition = reduced
        ? 'none'
        : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      panel.style.transform = 'translateY(0)';
    }
    dragCurrentY.current = 0;
  }, [props.onClose]);

  return (
    <div
      ref={overlayRef}
      role='presentation'
      className='fixed inset-0 bg-black/70 flex items-end justify-center z-[500] animate-fade-in'
      onKeyDown={handleKeyDown}
      onClick={() => {
        if (props.onClose) {
          triggerHaptic('light');
          props.onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          (props.bgColor || 'bg-qyellow') +
          ' rounded-t-[20px] p-6 pb-[calc(24px+env(safe-area-inset-bottom))] w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-lg animate-slide-up'
        }
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className='flex justify-center pt-2 pb-3 cursor-grab'
          aria-hidden='true'
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className='w-10 h-1 rounded-full bg-black/20' />
        </div>
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
