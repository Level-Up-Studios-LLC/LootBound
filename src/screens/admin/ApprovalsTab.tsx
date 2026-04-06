import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faThumbsUp,
  faThumbsDown,
  faCircleCheck,
  faHandshake,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { altBg } from '../../constants.ts';
import { freshUser } from '../../utils.ts';
import EmptyState from '../../components/ui/EmptyState.tsx';
import CoopRequestCard from '../../components/CoopRequestCard.tsx';
import type { ApprovalItem } from '../../types.ts';

export default function ApprovalsTab(): React.ReactElement {
  const ctx = useAppContext();
  const children = ctx.children;
  const allU = ctx.allU;

  // Co-op requests split by status
  const pendingPartner = ctx.coopRequests.filter(
    r => r.status === 'pending_partner'
  );
  const pendingParent = ctx.coopRequests.filter(
    r => r.status === 'pending_parent'
  );
  const hasCoopRequests = pendingPartner.length > 0 || pendingParent.length > 0;

  // Loot approval items
  const items: ApprovalItem[] = [];
  children.forEach(c => {
    const udata = allU[c.id] || freshUser();
    (udata.pendingRedemptions || []).forEach((p, i) => {
      items.push({ uid: c.id, child: c, pending: p, idx: i });
    });
  });

  const allEmpty = !hasCoopRequests && items.length === 0;

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        When children redeem high-value loot (above the approval threshold) or
        loot flagged for approval, their requests appear here. Co-op mission
        requests also need your review.
      </div>

      {allEmpty && (
        <EmptyState
          icon={faCircleCheck}
          title='All clear!'
          description='No pending approvals right now. When children redeem loot that requires approval or request co-op missions, they will appear here.'
        />
      )}

      {/* Co-op Requests Section */}
      {hasCoopRequests && (
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <FontAwesomeIcon
              icon={faHandshake}
              className='text-qcyan text-sm'
            />
            <span className='font-bold text-qslate text-sm'>
              Co-op Requests
            </span>
          </div>

          {/* Pending Parent Approval */}
          {pendingParent.length > 0 && (
            <div className='mb-3'>
              <div className='text-[11px] font-bold text-qmuted uppercase tracking-wide mb-2'>
                Awaiting Your Approval
              </div>
              {pendingParent.map(r => (
                <CoopRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}

          {/* Pending Partner Response */}
          {pendingPartner.length > 0 && (
            <div className='mb-3'>
              <div className='text-[11px] font-bold text-qmuted uppercase tracking-wide mb-2'>
                Waiting for Partner
              </div>
              {pendingPartner.map(r => (
                <CoopRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loot Approvals Section */}
      {items.length > 0 && (
        <div className='flex items-center gap-2 mb-3'>
          <span className='font-bold text-qslate text-sm'>Loot Approvals</span>
        </div>
      )}
      {items.map((item, i) => {
        return (
          <div key={i} className={altBg(i) + ' rounded-[10px] p-4 mb-4'}>
            <div className='flex justify-between items-center'>
              <div>
                <div className='font-semibold text-qslate'>
                  {item.child.avatar} {item.child.name}
                </div>
                <div className='text-sm text-qmuted'>
                  {item.pending.icon} {item.pending.name}{' '}
                  <span className='text-qteal'>{item.pending.cost} coins</span>
                </div>
              </div>
              <div className='flex gap-1.5'>
                <button
                  onClick={() => {
                    ctx.approvePending(item.uid, item.idx);
                  }}
                  className='bg-qteal-dim text-qteal rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
                >
                  <FontAwesomeIcon icon={faThumbsUp} />
                  Approve
                </button>
                <button
                  onClick={() => {
                    ctx.denyPending(item.uid, item.idx);
                  }}
                  className='bg-qcoral-dim text-qcoral rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
                >
                  <FontAwesomeIcon icon={faThumbsDown} />
                  Deny
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
