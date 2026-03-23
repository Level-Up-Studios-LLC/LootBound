import React, { useState } from 'react';
import { useSpring, useTransition, animated, config, to } from '@react-spring/web';
import { useStagger } from '../hooks/useStagger.ts';
import * as Sentry from '@sentry/react';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV } from '../constants.ts';
import BNav from '../components/BNav.tsx';
import { countRedeems } from '../utils.ts';
import type { Reward } from '../types.ts';

export default function StoreScreen(): React.ReactElement | null {
  const [confirmR, setConfirmR] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const cfg = ctx.cfg;
  const curUser = ctx.curUser;
  const canRedeem = ctx.canRedeem;
  const needsApproval = ctx.needsApproval;
  const requestRedemption = ctx.requestRedemption;

  if (!ch || !ud) return null;

  const rewards = (cfg!.rewards || []).filter(r => r.active);
  const pendingR = ud.pendingRedemptions || [];

  // Balance bar entrance
  const balanceSpring = useSpring({
    from: { opacity: 0, y: -10 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  });

  // Reward card grid stagger
  const rewardTrail = useStagger(rewards.length, {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1 },
    config: config.wobbly,
    baseDelay: 100,
  });

  // Confirm modal transition
  const modalTransition = useTransition(confirmR, {
    from: { opacity: 0, scale: 0.85, y: 30 },
    enter: { opacity: 1, scale: 1, y: 0 },
    leave: { opacity: 0, scale: 0.85, y: 30 },
    config: config.stiff,
  });

  return (
    <div className='pb-20'>
      <div className='sticky top-0 z-[90] bg-white pl-4 pr-4 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <div className='font-display text-2xl font-bold text-qslate mb-3'>
          Loot Shop
        </div>
        <animated.div
          className='flex justify-between items-center bg-qmint rounded-btn px-5 py-3 w-full'
          style={{
            opacity: balanceSpring.opacity,
            transform: balanceSpring.y.to(v => `translateY(${v}px)`),
          }}
        >
          <span className='font-semibold text-qslate'>Balance:</span>
          <span className='font-display text-[22px] font-bold text-qslate'>
            {(ud.points || 0).toLocaleString()} coins
          </span>
        </animated.div>
      </div>
      <div className='px-4 pt-3'>
        {pendingR.length > 0 && (
          <div className='mb-4'>
            <div className='text-sm font-bold text-qslate mb-2'>
              Pending Approval
            </div>
            {pendingR.map(p => {
              return (
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
              );
            })}
          </div>
        )}
        <div className='grid grid-cols-2 gap-3.5'>
          {rewardTrail.map((spring, idx) => {
            const r = rewards[idx];
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
              <animated.div
                key={r.id}
                className={
                  (can ? cardBg : dimBg) +
                  ' rounded-btn p-5 flex flex-col items-center gap-2 text-center'
                }
                style={{
                  opacity: spring.opacity,
                  transform: spring.scale.to(v => `scale(${v})`),
                }}
              >
                <div className='text-[32px] animate-float'>{r.icon}</div>
                <div className='text-[13px] font-semibold leading-tight text-qslate'>
                  {r.name}
                </div>
                <div className='font-display font-bold text-qslate'>
                  {r.cost} coins
                </div>
                {li && <div className='text-[10px] text-qmuted'>{li}</div>}
                {na && (
                  <div className='text-[10px] text-qorange'>
                    Needs parent OK
                  </div>
                )}
                <button
                  disabled={!can}
                  onClick={() => {
                    if (can) setConfirmR(r);
                  }}
                  className={
                    'w-full rounded-badge py-2 text-xs font-bold border-none font-body transition-all' +
                    (can
                      ? ' bg-qteal text-white cursor-pointer hover:brightness-110 hover:scale-[1.03] active:scale-[0.97]'
                      : ' bg-qslate-dim text-qmuted cursor-not-allowed')
                  }
                >
                  {can
                    ? na
                      ? 'Request'
                      : 'Redeem'
                    : check.reason || 'Need more coins'}
                </button>
              </animated.div>
            );
          })}
        </div>
        {ud.redemptions && ud.redemptions.length > 0 && (
          <div>
            <div className='font-display text-lg font-semibold mb-3 mt-5'>
              Recent
            </div>
            {ud.redemptions
              .slice(-5)
              .reverse()
              .map((r, i) => {
                const recentBg =
                  i % 2 === 0 ? 'bg-qmint-dim' : 'bg-qyellow-dim';
                return (
                  <div
                    key={`${r.rewardId}-${r.date}-${i}`}
                    className={
                      'flex justify-between rounded-badge px-3 py-2 mb-2 text-[13px] ' +
                      recentBg
                    }
                  >
                    <span className='text-qslate'>{r.name}</span>
                    <span className='text-qcoral'>-{r.cost}</span>
                    <span className='text-qmuted text-xs'>{r.date}</span>
                  </div>
                );
              })}
          </div>
        )}
        {modalTransition((style, item) =>
          item ? (
            <animated.div
              className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'
              style={{ opacity: style.opacity }}
              role='dialog'
              aria-modal='true'
              aria-labelledby='confirmR-title'
              aria-describedby='confirmR-desc'
            >
              <animated.div
                className='bg-white rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto'
                style={{
                  transform: to(
                    [style.scale, style.y],
                    (s, y) => `scale(${s}) translateY(${y}px)`
                  ),
                }}
              >
                <div
                  id='confirmR-title'
                  className='font-display text-xl font-bold mb-4'
                >
                  {needsApproval(item) ? 'Request Approval?' : 'Redeem?'}
                </div>
                <div
                  id='confirmR-desc'
                  className='flex flex-col items-center gap-2 mb-5'
                >
                  <div className='text-[32px]'>{item.icon}</div>
                  <div className='text-base font-semibold'>{item.name}</div>
                  <div className='text-qteal text-lg font-bold'>
                    {item.cost} coins
                  </div>
                  {needsApproval(item) && (
                    <div className='text-xs text-qorange'>
                      Requires parent approval.
                    </div>
                  )}
                </div>
                <div className='flex gap-3 justify-end'>
                  <button
                    onClick={() => {
                      setConfirmR(null);
                    }}
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
                        await requestRedemption(item);
                        setConfirmR(null);
                      } catch (err) {
                        console.error('Redemption failed:', err);
                        Sentry.captureException(err, {
                          tags: { action: 'redemption' },
                        });
                      } finally {
                        setRedeeming(false);
                      }
                    }}
                    className='btn-primary rounded-badge px-5 py-2 font-bold border-none cursor-pointer font-body hover:brightness-110 transition-all disabled:opacity-60'
                  >
                    {redeeming
                      ? 'Processing...'
                      : needsApproval(item)
                        ? 'Request'
                        : 'Confirm'}
                  </button>
                </div>
              </animated.div>
            </animated.div>
          ) : null
        )}
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
