import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faMagnifyingGlass, faHandshake } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { SL, altBg, TIER_COLORS } from '../../constants.ts';
import { freshUser, getToday } from '../../utils.ts';
import Badge from '../../components/Badge.tsx';
import Modal from '../../components/ui/Modal.tsx';
import EmptyState from '../../components/ui/EmptyState.tsx';
import type { StatusLabel, ReviewTaskItem, CoopRequest } from '../../types.ts';

export default function ReviewTab(): React.ReactElement {
  const [reviewTask, setReviewTask] = useState<ReviewTaskItem | null>(null);

  const ctx = useAppContext();
  const children = ctx.children;
  const allU = ctx.allU;
  const cfg = ctx.cfg;
  const d = getToday();

  if (!cfg) return <div />;

  // Build set of initiator childId:taskId keys that belong to active/completed co-ops today
  // so solo review excludes them (prevents double-counting with the co-op section)
  const coopTaskKeys = new Set(
    ctx.coopRequests
      .filter(
        r =>
          r.date === d && (r.status === 'approved' || r.status === 'completed')
      )
      .map(r => `${r.initiatorId}:${r.taskId}`)
  );

  // Solo review items
  const items: ReviewTaskItem[] = [];
  children.forEach(c => {
    const udata = allU[c.id] || freshUser();
    const log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
    (cfg.tasks[c.id] || []).forEach(t => {
      const entry = log[t.id];
      if (
        entry &&
        !entry.rejected &&
        entry.status !== 'missed' &&
        !coopTaskKeys.has(`${c.id}:${t.id}`)
      )
        items.push({ uid: c.id, child: c, task: t, entry });
    });
  });

  // Completed co-op requests for today
  const completedCoops = ctx.coopRequests.filter(
    r => r.status === 'completed' && r.date === d
  );

  const allEmpty = items.length === 0 && completedCoops.length === 0;

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Review completed missions and photo proof from today. If a mission
        wasn't done properly, reject it to deduct the coins and send it back for
        the child to redo.
      </div>

      {allEmpty && (
        <EmptyState
          icon={faMagnifyingGlass}
          title='Nothing to review'
          description='No completed missions to review today. Once children complete missions, they will show up here with photo proof.'
        />
      )}

      {/* Completed co-op reviews */}
      {completedCoops.length > 0 && (
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <FontAwesomeIcon
              icon={faHandshake}
              className='text-qcyan text-sm'
            />
            <span className='font-bold text-qslate text-sm'>
              Co-op Missions
            </span>
          </div>
          {completedCoops.map(r => (
            <CoopReviewCard key={r.id} request={r} />
          ))}
        </div>
      )}

      {/* Solo review items */}
      {items.length > 0 && completedCoops.length > 0 && (
        <div className='flex items-center gap-2 mb-3'>
          <span className='font-bold text-qslate text-sm'>Solo Missions</span>
        </div>
      )}
      {items.map((item, ri) => {
        return (
          <div
            key={`${item.uid}-${item.task.id}`}
            className={altBg(ri) + ' rounded-[10px] p-4 mb-4'}
          >
            <div className='flex justify-between items-start'>
              <div>
                <div className='font-semibold text-qslate'>
                  {item.child.avatar} {item.child.name}: {item.task.name}
                </div>
                <div className='text-xs text-qmuted'>
                  {(SL[item.entry.status] || ({} as StatusLabel)).text} |{' '}
                  {item.entry.points > 0 ? '+' : ''}
                  {item.entry.points} coins
                </div>
              </div>
              <Badge status={item.entry.status} />
            </div>
            <div className='flex gap-3 mt-3'>
              {item.entry.photo && (
                <button
                  onClick={() => {
                    ctx.setViewPhoto(item.entry.photo);
                  }}
                  className='bg-qblue-dim text-qblue rounded-badge px-4 py-2 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1.5'
                >
                  <FontAwesomeIcon icon={faEye} />
                  View Photo
                </button>
              )}
              <button
                onClick={() => {
                  setReviewTask(item);
                }}
                className='bg-qcoral-dim text-qcoral rounded-badge px-4 py-2 text-xs font-semibold border-none cursor-pointer font-body'
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}

      {reviewTask && (
        <Modal title='Reject Mission?'>
          <div className='mb-4'>
            <div className='font-semibold text-qslate'>
              {reviewTask.child.name}: {reviewTask.task.name}
            </div>
            <div className='text-[13px] text-qmuted mt-1'>
              Coins removed. Sent back for redo.
            </div>
          </div>
          {reviewTask.entry.photo && (
            <img
              src={reviewTask.entry.photo}
              alt='proof'
              className='w-full rounded-badge mb-3'
            />
          )}
          <div className='flex gap-3 justify-end'>
            <button
              onClick={() => {
                setReviewTask(null);
              }}
              className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
            >
              Cancel
            </button>
            <button
              onClick={() => {
                ctx.rejectTask(reviewTask!.uid, reviewTask!.task.id);
                setReviewTask(null);
              }}
              className='bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
            >
              Reject
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Card showing a completed co-op for parent review.
 *  Reject functionality deferred to Phase 5 (completion logic). */
function CoopReviewCard({
  request,
}: {
  request: CoopRequest;
}): React.ReactElement {
  const ctx = useAppContext();
  const d = getToday();

  const initiator = ctx.getChild(request.initiatorId);
  const partner = ctx.getChild(request.partnerId);

  // Look up each kid's taskLog entry
  const iData = ctx.allU[request.initiatorId];
  const pData = ctx.allU[request.partnerId];
  const iLog = iData?.taskLog?.[d]?.[request.taskId];
  const pLog = pData?.taskLog?.[d]?.[`coop:${request.id}`];

  const iCoins = iLog?.points ?? 0;
  const pCoins = pLog?.points ?? 0;
  const iXp = iLog?.xp ?? 0;
  const pXp = pLog?.xp ?? 0;

  return (
    <div className='bg-qcoop-dim rounded-[10px] p-4 mb-4'>
      {/* Header */}
      <div className='flex items-center gap-2 mb-3'>
        <span className='font-semibold text-qslate text-sm'>
          {request.taskName}
        </span>
        <span
          className='text-[10px] font-bold ml-auto'
          style={{ color: TIER_COLORS[request.taskTier] || '#6b7280' }}
        >
          {request.taskTier}-Tier
        </span>
      </div>

      {/* Initiator row */}
      <div className='flex items-center justify-between mb-1.5'>
        <div className='flex items-center gap-1.5'>
          <span className='text-base'>{initiator?.avatar ?? '?'}</span>
          <span className='text-sm text-qslate font-medium'>
            {request.initiatorName}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {iLog?.photo && (
            <button
              onClick={() => ctx.setViewPhoto(iLog.photo)}
              className='bg-qblue-dim text-qblue rounded-badge px-2.5 py-1 text-[10px] font-semibold border-none cursor-pointer font-body flex items-center gap-1'
            >
              <FontAwesomeIcon icon={faEye} />
              Photo
            </button>
          )}
          {iLog ? (
            <Badge status={iLog.status} />
          ) : (
            <span className='text-[10px] font-bold px-2.5 py-1 rounded-badge tracking-wide text-qmuted bg-qslate-dim'>
              NO DATA
            </span>
          )}
        </div>
      </div>
      <div className='text-[11px] text-qmuted pl-7 mb-2'>
        {iCoins > 0 ? '+' : ''}
        {iCoins} coins &middot; +{iXp} XP
      </div>

      {/* Partner row */}
      <div className='flex items-center justify-between mb-1.5'>
        <div className='flex items-center gap-1.5'>
          <span className='text-base'>{partner?.avatar ?? '?'}</span>
          <span className='text-sm text-qslate font-medium'>
            {request.partnerName}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {pLog?.photo && (
            <button
              onClick={() => ctx.setViewPhoto(pLog.photo)}
              className='bg-qblue-dim text-qblue rounded-badge px-2.5 py-1 text-[10px] font-semibold border-none cursor-pointer font-body flex items-center gap-1'
            >
              <FontAwesomeIcon icon={faEye} />
              Photo
            </button>
          )}
          {pLog ? (
            <Badge status={pLog.status} />
          ) : (
            <span className='text-[10px] font-bold px-2.5 py-1 rounded-badge tracking-wide text-qmuted bg-qslate-dim'>
              NO DATA
            </span>
          )}
        </div>
      </div>
      <div className='text-[11px] text-qmuted pl-7'>
        {pCoins > 0 ? '+' : ''}
        {pCoins} coins &middot; +{pXp} XP
      </div>
    </div>
  );
}
