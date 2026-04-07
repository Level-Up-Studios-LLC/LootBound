import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import * as Sentry from '@sentry/react';
import { useAppContext } from '../context/AppContext.tsx';
import { faBagShopping } from '../fa.ts';
import { KID_NAV } from '../constants.ts';
import { triggerHaptic } from '../services/platform.ts';
import BNav from '../components/BNav.tsx';
import KidHeader from '../components/KidHeader.tsx';
import EmptyState from '../components/ui/EmptyState.tsx';
import { countRedeems } from '../utils.ts';
import type { Reward } from '../types.ts';

export default function StoreScreen(): React.ReactElement | null {
  const [confirmR, setConfirmR] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const cfg = ctx.cfg;
  const curUser = ctx.curUser;
  const canRedeem = ctx.canRedeem;
  const needsApproval = ctx.needsApproval;
  const requestRedemption = ctx.requestRedemption;

  // Entrance animations — run once on mount, not on every data change
  // Re-running on ud changes causes GSAP to reset opacity:0 on existing cards
  const animatedRef = useRef(false);
  useGSAP(
    () => {
      if (!ch || !ud || animatedRef.current) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animatedRef.current = true;
        return;
      }
      animatedRef.current = true;
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.from('.store-balance', { opacity: 0, y: -10, duration: 0.35 });
      tl.from(
        '.store-reward',
        { opacity: 0, scale: 0.9, duration: 0.35, stagger: 0.06 },
        '-=0.15'
      );
    },
    { scope: containerRef, dependencies: [ch, ud] }
  );

  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Modal enter animation + focus management
  useEffect(() => {
    if (confirmR && modalRef.current) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      const overlay = modalRef.current;
      const card = overlay.querySelector('.store-modal-card');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      if (card) {
        gsap.fromTo(
          card,
          { scale: 0.85, y: 30 },
          { scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
        );
      }
      // Focus first button in modal
      const firstBtn = overlay.querySelector<HTMLElement>('button');
      if (firstBtn) firstBtn.focus();
    } else if (!confirmR && prevFocusRef.current) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [confirmR]);

  if (!ch || !ud) return null;

  const rewards = (cfg!.rewards || []).filter(r => r.active);
  const pendingR = ud.pendingRedemptions || [];

  return (
    <div className='pb-20' ref={containerRef}>
      <KidHeader child={ch} userData={ud} />
      <div className='px-4 pt-3'>
        <h1 className='font-display text-2xl font-bold text-qslate mb-3'>
          Loot Shop
        </h1>
        {pendingR.length > 0 && (
          <div className='mb-4'>
            <div className='text-sm font-bold text-qslate mb-2'>
              Pending Approval
            </div>
            {pendingR.map(p => (
              <div
                key={`${p.rewardId}-${p.requestedAt}`}
                className='flex justify-between bg-qyellow-dim rounded-badge px-3 py-2 mb-1 text-[13px]'
              >
                <span>
                  {p.icon} {p.name}
                </span>
                <span className='text-qslate'>{p.cost} coins</span>
                <span className='text-[11px] text-qmuted'>Waiting...</span>
              </div>
            ))}
          </div>
        )}
        {rewards.length === 0 && (
          <EmptyState
            icon={faBagShopping}
            title='No loot available yet'
            description='Ask your parent to add some rewards!'
          />
        )}
        <div className='grid grid-cols-2 gap-3.5'>
          {rewards.map((r, idx) => {
            const check = canRedeem(curUser!, r);
            const can = check.ok;
            const na = needsApproval(r);
            let li = '';
            if (r.limitType && r.limitType !== 'none' && r.limitMax > 0) {
              li =
                countRedeems(ud!.redemptions, r.id, r.limitType) +
                '/' +
                r.limitMax +
                ' ' +
                (r.limitType === 'daily'
                  ? 'today'
                  : r.limitType === 'weekly'
                    ? 'wk'
                    : 'total');
            }
            const cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
            const dimBg = idx % 2 === 0 ? 'bg-qmint-dim' : 'bg-qyellow-dim';
            return (
              <div
                key={r.id}
                className={
                  (can ? cardBg : dimBg) +
                  ' rounded-btn p-5 flex flex-col items-center gap-2 text-center store-reward'
                }
              >
                <div className='text-[32px] animate-float'>{r.icon}</div>
                <div className='text-[13px] font-semibold leading-tight text-qslate'>
                  {r.name}
                </div>
                <div className='font-display font-bold text-qslate'>
                  {r.cost} coins
                </div>
                {li && <div className='text-[11px] text-qmuted'>{li}</div>}
                {na && (
                  <div className='text-xs text-qorange'>Needs parent OK</div>
                )}
                <button
                  disabled={!can}
                  onClick={() => {
                    if (can) {
                      triggerHaptic('light');
                      setRedeemError('');
                      setConfirmR(r);
                    }
                  }}
                  aria-label={
                    can
                      ? `${na ? 'Request' : 'Purchase'} ${r.name} for ${r.cost} coins`
                      : `${r.name} — ${check.reason || 'Need more coins'}`
                  }
                  className={
                    'w-full rounded-badge py-2 text-xs font-bold border-none font-body transition-all' +
                    (can
                      ? ' bg-qteal-btn text-white cursor-pointer hover:brightness-110 hover:scale-[1.03] active:scale-[0.97]'
                      : ' bg-qslate-dim text-qmuted cursor-not-allowed')
                  }
                >
                  {can
                    ? na
                      ? 'Request'
                      : 'Purchase'
                    : check.reason || 'Purchase'}
                </button>
              </div>
            );
          })}
        </div>
        {confirmR && (
          <div
            ref={modalRef}
            className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'
            style={{ opacity: 0 }}
            role='dialog'
            aria-modal='true'
            aria-labelledby='confirmR-title'
            aria-describedby='confirmR-desc'
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Escape') {
                setConfirmR(null);
                return;
              }
              if (e.key !== 'Tab' || !modalRef.current) return;
              const focusable = modalRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'
              );
              if (focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <div className='bg-white rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto store-modal-card'>
              <div
                id='confirmR-title'
                className='font-display text-xl font-bold mb-4'
              >
                {needsApproval(confirmR) ? 'Request Approval?' : 'Redeem?'}
              </div>
              <div
                id='confirmR-desc'
                className='flex flex-col items-center gap-2 mb-5'
              >
                <div className='text-[32px]'>{confirmR.icon}</div>
                <div className='text-base font-semibold'>{confirmR.name}</div>
                <div className='text-qteal text-lg font-bold'>
                  {confirmR.cost} coins
                </div>
                {needsApproval(confirmR) && (
                  <div className='text-xs text-qorange'>
                    Requires parent approval.
                  </div>
                )}
              </div>
              {redeemError && (
                <div
                  role='alert'
                  className='text-qcoral text-[13px] text-center mb-3'
                >
                  {redeemError}
                </div>
              )}
              <div className='flex gap-3 justify-end'>
                <button
                  onClick={() => setConfirmR(null)}
                  className='btn-secondary rounded-badge px-5 py-2 font-semibold border-none cursor-pointer font-body transition-colors'
                >
                  Cancel
                </button>
                <button
                  disabled={redeeming}
                  onClick={async () => {
                    if (redeeming) return;
                    setRedeeming(true);
                    try {
                      await requestRedemption(confirmR!);
                      setConfirmR(null);
                    } catch (err) {
                      console.error('Redemption failed:', err);
                      Sentry.captureException(err, {
                        tags: { action: 'redemption' },
                      });
                      setRedeemError('Something went wrong. Please try again.');
                    } finally {
                      setRedeeming(false);
                    }
                  }}
                  className='btn-primary rounded-badge px-5 py-2 font-bold border-none cursor-pointer font-body hover:brightness-110 transition-all disabled:opacity-60'
                >
                  {redeeming
                    ? 'Processing...'
                    : needsApproval(confirmR)
                      ? 'Request'
                      : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
