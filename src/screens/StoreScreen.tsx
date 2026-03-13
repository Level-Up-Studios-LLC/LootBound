import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV } from '../constants.ts';
import BNav from '../components/BNav.tsx';
import { countRedeems } from '../utils.ts';
import type { Reward } from '../types.ts';

export default function StoreScreen(): React.ReactElement | null {
  var _confirmR = useState<Reward | null>(null),
    confirmR = _confirmR[0],
    setConfirmR = _confirmR[1];

  var ctx = useAppContext();
  var ch = ctx.currentChild;
  var ud = ctx.currentUserData;
  var cfg = ctx.cfg;
  var curUser = ctx.curUser;
  var canRedeem = ctx.canRedeem;
  var needsApproval = ctx.needsApproval;
  var requestRedemption = ctx.requestRedemption;

  if (!ch || !ud) return null;

  var rewards = (cfg!.rewards || []).filter(function (r) {
    return r.active;
  });
  var pendingR = ud.pendingRedemptions || [];

  return (
    <div className='p-4 pb-20'>
      <div className='font-display text-2xl font-bold mb-4 text-qslate'>
        Reward Store
      </div>
      <div className='flex justify-between items-center bg-qmint rounded-btn px-5 py-4 mb-4'>
        <span className='font-semibold text-qslate'>Balance:</span>
        <span className='font-display text-[22px] font-bold text-qslate'>
          {(ud.points || 0).toLocaleString()} pts
        </span>
      </div>
      {pendingR.length > 0 && (
        <div className='mb-4'>
          <div className='text-sm font-bold text-qslate mb-2'>
            Pending Approval
          </div>
          {pendingR.map(function (p, i) {
            return (
              <div
                key={i}
                className='flex justify-between bg-qyellow-dim rounded-badge px-3 py-2 mb-1 text-[13px] animate-fade-in'
              >
                <span>
                  {p.icon} {p.name}
                </span>
                <span className='text-qslate'>{p.cost} pts</span>
                <span className='text-[11px] text-qmuted'>Waiting...</span>
              </div>
            );
          })}
        </div>
      )}
      <div className='grid grid-cols-2 gap-3.5'>
        {rewards.map(function (r, idx) {
          var check = canRedeem(curUser!, r);
          var can = check.ok;
          var na = needsApproval(r);
          var li = '';
          if (r.limitType && r.limitType !== 'none' && r.limitMax > 0) {
            li =
              countRedeems(ud!.redemptions, r.id, r.limitType) +
              '/' +
              r.limitMax +
              ' ' +
              (r.limitType === 'daily' ? 'today' : 'wk');
          }
          var cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          var dimBg = idx % 2 === 0 ? 'bg-qmint-dim' : 'bg-qyellow-dim';
          return (
            <div
              key={r.id}
              className={
                (can ? cardBg : dimBg) +
                ' rounded-btn p-5 flex flex-col items-center gap-2 text-center transition-all'
              }
            >
              <div className='text-[32px] animate-float'>{r.icon}</div>
              <div className='text-[13px] font-semibold leading-tight text-qslate'>
                {r.name}
              </div>
              <div className='font-display font-bold text-qslate'>
                {r.cost} pts
              </div>
              {li && <div className='text-[10px] text-qmuted'>{li}</div>}
              {na && (
                <div className='text-[10px] text-qorange'>Needs parent OK</div>
              )}
              <button
                disabled={!can}
                onClick={function () {
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
                  : check.reason || 'Need more pts'}
              </button>
            </div>
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
            .map(function (r, i) {
              var recentBg = i % 2 === 0 ? 'bg-qmint-dim' : 'bg-qyellow-dim';
              return (
                <div
                  key={i}
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
      {confirmR && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'>
          <div className='bg-white rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto animate-slide-up'>
            <div className='font-display text-xl font-bold mb-4'>
              {needsApproval(confirmR) ? 'Request Approval?' : 'Redeem?'}
            </div>
            <div className='flex flex-col items-center gap-2 mb-5'>
              <div className='text-[32px]'>{confirmR.icon}</div>
              <div className='text-base font-semibold'>{confirmR.name}</div>
              <div className='text-qteal text-lg font-bold'>
                {confirmR.cost} pts
              </div>
              {needsApproval(confirmR) && (
                <div className='text-xs text-qorange'>
                  Requires parent approval.
                </div>
              )}
            </div>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={function () {
                  setConfirmR(null);
                }}
                className='btn-secondary rounded-badge px-5 py-2 font-semibold border-none cursor-pointer font-body transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={function () {
                  requestRedemption(confirmR!);
                  setConfirmR(null);
                }}
                className='btn-primary rounded-badge px-5 py-2 font-bold border-none cursor-pointer font-body hover:brightness-110 transition-all'
              >
                {needsApproval(confirmR) ? 'Request' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BNav tabs={KID_NAV} />
    </div>
  );
}
