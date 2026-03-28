import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHandshake,
  faThumbsUp,
  faThumbsDown,
  faXmark,
  faClock,
  faCoins,
} from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { TIER_COLORS } from '../constants.ts';
import type { CoopRequest } from '../types.ts';

interface CoopRequestCardProps {
  request: CoopRequest;
}

export default function CoopRequestCard({
  request,
}: CoopRequestCardProps): React.ReactElement {
  const ctx = useAppContext();
  const isPendingParent = request.status === 'pending_parent';
  const [busy, setBusy] = useState(false);

  // Look up original task for time defaults
  const tasks = ctx.cfg?.tasks[request.initiatorId] || [];
  const originalTask = tasks.find(t => t.id === request.taskId);

  const defaultCoins = ctx.tierCfg(request.taskTier).coins;
  const xp = ctx.tierCfg(request.taskTier).xp;

  // Editable fields for parent approval
  const [windowStart, setWindowStart] = useState(
    request.windowStartOverride ?? originalTask?.windowStart ?? ''
  );
  const [windowEnd, setWindowEnd] = useState(
    request.windowEndOverride ?? originalTask?.windowEnd ?? ''
  );
  const [coins, setCoins] = useState(request.coinOverride ?? defaultCoins);

  // Resync form state when the underlying data changes (e.g. ctx.cfg reload,
  // request snapshot update) without clobbering in-progress edits — we only
  // react to source-of-truth changes.
  useEffect(() => {
    setWindowStart(
      request.windowStartOverride ?? originalTask?.windowStart ?? ''
    );
    setWindowEnd(request.windowEndOverride ?? originalTask?.windowEnd ?? '');
    setCoins(request.coinOverride ?? defaultCoins);
  }, [
    request.windowStartOverride,
    request.windowEndOverride,
    request.coinOverride,
    originalTask?.windowStart,
    originalTask?.windowEnd,
    defaultCoins,
  ]);

  // Original task may have been deleted — warn parent and block approval if
  // we can't derive a valid time window from either the request overrides or
  // the original task definition.
  const parseTime = (v: string): number | null => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const startMin = parseTime(windowStart);
  const endMin = parseTime(windowEnd);
  const hasValidWindow =
    startMin != null && endMin != null && startMin < endMin;
  const taskOrphaned = !originalTask && !hasValidWindow;

  const splitCoins = Math.floor(coins / 2);

  const initiator = ctx.getChild(request.initiatorId);
  const partner = ctx.getChild(request.partnerId);

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

  const handleApprove = () =>
    runAction(async () => {
      const overrides: {
        windowStart?: string;
        windowEnd?: string;
        coinOverride?: number;
      } = {};
      const origStart = originalTask?.windowStart ?? '';
      const origEnd = originalTask?.windowEnd ?? '';
      if (windowStart !== origStart) overrides.windowStart = windowStart;
      if (windowEnd !== origEnd) overrides.windowEnd = windowEnd;
      if (coins !== defaultCoins) overrides.coinOverride = coins;
      await ctx.approveCoop(
        request.id,
        Object.keys(overrides).length > 0 ? overrides : undefined
      );
    }, 'approve co-op');

  return (
    <div className='bg-qcoop-dim rounded-[10px] p-4 mb-4'>
      {/* Header */}
      <div className='flex items-center gap-2 mb-2'>
        <FontAwesomeIcon icon={faHandshake} className='text-qcyan text-sm' />
        <span className='font-semibold text-qslate text-sm'>Co-op Request</span>
        <span
          className='text-[10px] font-bold ml-auto'
          style={{ color: TIER_COLORS[request.taskTier] || '#6b7280' }}
        >
          {request.taskTier}-Tier
        </span>
      </div>

      {/* Kids */}
      <div className='flex items-center gap-1.5 mb-2'>
        <span className='text-base'>{initiator?.avatar ?? '?'}</span>
        <span className='text-sm text-qslate font-medium'>
          {request.initiatorName}
        </span>
        <span className='text-xs text-qmuted mx-0.5'>&amp;</span>
        <span className='text-base'>{partner?.avatar ?? '?'}</span>
        <span className='text-sm text-qslate font-medium'>
          {request.partnerName}
        </span>
      </div>

      {/* Mission name */}
      <div className='text-[13px] font-medium text-qslate mb-3'>
        {request.taskName}
      </div>

      {/* Orphaned task warning */}
      {taskOrphaned && isPendingParent && (
        <div
          role='alert'
          className='text-xs text-qcoral bg-qcoral-dim rounded-badge px-3 py-2 mb-3'
        >
          Original mission was deleted. Set a valid time window before
          approving, or cancel this request.
        </div>
      )}

      {/* Editable fields (pending_parent only) */}
      {isPendingParent && (
        <div className='flex flex-col gap-2.5 mb-3'>
          <div className='flex items-center gap-2'>
            <FontAwesomeIcon
              icon={faClock}
              className='text-xs text-qmuted w-4'
            />
            <input
              type='time'
              aria-label='Co-op start time'
              value={windowStart}
              onChange={e => setWindowStart(e.target.value)}
              className='quest-input w-[100px]! text-center'
            />
            <span className='text-xs text-qmuted'>to</span>
            <input
              type='time'
              aria-label='Co-op end time'
              value={windowEnd}
              onChange={e => setWindowEnd(e.target.value)}
              className='quest-input w-[100px]! text-center'
            />
          </div>
          <div className='flex items-center gap-2'>
            <FontAwesomeIcon
              icon={faCoins}
              className='text-xs text-qmuted w-4'
            />
            <input
              type='number'
              min={0}
              aria-label='Co-op total coins'
              value={coins}
              onChange={e => {
                const v = e.target.value === '' ? 0 : Number(e.target.value);
                setCoins(Number.isFinite(v) ? Math.max(0, v) : 0);
              }}
              className='quest-input w-[72px]! text-center'
            />
            <span className='text-xs text-qmuted'>coins total</span>
          </div>
          <div className='text-xs text-qmuted pl-6'>
            Split: {splitCoins} each &middot; XP: {xp} each (full)
          </div>
        </div>
      )}

      {/* Status indicator for pending_partner */}
      {!isPendingParent && (
        <div className='text-xs text-qmuted mb-3 italic'>
          Waiting for {request.partnerName} to respond&hellip;
        </div>
      )}

      {/* Action buttons */}
      <div className='flex gap-1.5 flex-wrap'>
        {isPendingParent && (
          <>
            <button
              onClick={handleApprove}
              disabled={busy || !hasValidWindow}
              className='bg-qteal-dim text-qteal rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <FontAwesomeIcon icon={faThumbsUp} />
              Approve
            </button>
            <button
              onClick={() =>
                runAction(() => ctx.denyCoop(request.id), 'deny co-op')
              }
              disabled={busy}
              className='bg-qcoral-dim text-qcoral rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <FontAwesomeIcon icon={faThumbsDown} />
              Deny
            </button>
          </>
        )}
        <button
          onClick={() =>
            runAction(() => ctx.cancelCoop(request.id), 'cancel co-op')
          }
          disabled={busy}
          className='bg-qslate-dim text-qslate rounded-badge px-3 py-2 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FontAwesomeIcon icon={faXmark} />
          Cancel
        </button>
      </div>
    </div>
  );
}
