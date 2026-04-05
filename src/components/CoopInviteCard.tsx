import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandshake, faThumbsUp, faThumbsDown } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { TIER_COLORS } from '../constants.ts';
import type { CoopRequest } from '../types.ts';

interface CoopInviteCardProps {
  request: CoopRequest;
}

export default function CoopInviteCard({
  request,
}: CoopInviteCardProps): React.ReactElement {
  const ctx = useAppContext();
  const [busy, setBusy] = useState(false);

  const initiator = ctx.getChild(request.initiatorId);
  const splitCoins = Math.floor(
    (request.coinOverride ?? ctx.tierCfg(request.taskTier).coins) / 2
  );

  const runAction = async (action: () => Promise<void>, label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      ctx.notify(`Failed to ${label}. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role='region'
      aria-label={`Co-op invite from ${request.initiatorName} for ${request.taskName}`}
      className='bg-qcoop-dim rounded-btn p-4 mb-3'
    >
      {/* Header */}
      <div className='flex items-center gap-2 mb-2'>
        <FontAwesomeIcon icon={faHandshake} className='text-qcyan text-sm' />
        <span className='font-semibold text-qslate text-sm'>Co-op Invite</span>
        <span
          className='text-[10px] font-bold ml-auto'
          style={{ color: TIER_COLORS[request.taskTier] || '#6b7280' }}
        >
          {request.taskTier}-Tier
        </span>
      </div>

      {/* From */}
      <div className='flex items-center gap-1.5 mb-2'>
        <span className='text-base'>{initiator?.avatar ?? '?'}</span>
        <span className='text-sm text-qslate font-medium'>
          {request.initiatorName}
        </span>
        <span className='text-xs text-qmuted'>wants your help!</span>
      </div>

      {/* Mission name */}
      <div className='text-[13px] font-medium text-qslate mb-1'>
        {request.taskName}
      </div>

      {/* Coin split */}
      <div className='text-[12px] text-qmuted mb-2'>
        You'll earn: <strong className='text-qslate'>{splitCoins} coins</strong>
      </div>

      {/* Warning */}
      <div className='text-[11px] text-qcoral mb-3'>
        Both must complete before bedtime or neither gets rewards.
      </div>

      {/* Action buttons */}
      <div className='flex gap-1.5'>
        <button
          type='button'
          onClick={() =>
            runAction(() => ctx.acceptCoop(request.id), 'accept co-op')
          }
          disabled={busy}
          aria-label={`Accept co-op invite for ${request.taskName}`}
          className='bg-qteal-dim text-qteal rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FontAwesomeIcon icon={faThumbsUp} />
          Accept
        </button>
        <button
          type='button'
          onClick={() =>
            runAction(() => ctx.declineCoop(request.id), 'decline co-op')
          }
          disabled={busy}
          aria-label={`Decline co-op invite for ${request.taskName}`}
          className='bg-qcoral-dim text-qcoral rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FontAwesomeIcon icon={faThumbsDown} />
          Decline
        </button>
      </div>
    </div>
  );
}
