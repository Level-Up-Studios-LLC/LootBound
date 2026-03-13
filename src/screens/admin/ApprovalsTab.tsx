import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faThumbsDown } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { altBg } from '../../constants.ts';
import { freshUser } from '../../utils.ts';
import type { ApprovalItem } from '../../types.ts';

export default function ApprovalsTab(): React.ReactElement {
  var ctx = useAppContext();
  var children = ctx.children;
  var allU = ctx.allU;

  var items: ApprovalItem[] = [];
  children.forEach(function (c) {
    var udata = allU[c.id] || freshUser();
    (udata.pendingRedemptions || []).forEach(function (p, i) {
      items.push({ uid: c.id, child: c, pending: p, idx: i });
    });
  });

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        When children redeem high-value rewards (above the approval threshold)
        or rewards flagged for approval, their requests appear here. Approve to
        deduct points and grant the reward, or deny to cancel.
      </div>
      {items.length === 0 && (
        <div className='text-center p-5 text-qmuted'>
          No pending approvals.
        </div>
      )}
      {items.map(function (item, i) {
        return (
          <div key={i} className={altBg(i) + ' rounded-[10px] p-4 mb-4'}>
            <div className='flex justify-between items-center'>
              <div>
                <div className='font-semibold text-qslate'>
                  {item.child.avatar} {item.child.name}
                </div>
                <div className='text-sm text-qmuted'>
                  {item.pending.icon} {item.pending.name}{' '}
                  <span className='text-qteal'>{item.pending.cost} pts</span>
                </div>
              </div>
              <div className='flex gap-1.5'>
                <button
                  onClick={function () {
                    ctx.approvePending(item.uid, item.idx);
                  }}
                  className='bg-qteal-dim text-qteal rounded-badge px-4 py-2 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
                >
                  <FontAwesomeIcon icon={faThumbsUp} />
                  Approve
                </button>
                <button
                  onClick={function () {
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
