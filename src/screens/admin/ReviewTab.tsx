import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faMagnifyingGlass } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { SL, altBg } from '../../constants.ts';
import { freshUser, getToday } from '../../utils.ts';
import Badge from '../../components/Badge.tsx';
import Modal from '../../components/ui/Modal.tsx';
import EmptyState from '../../components/ui/EmptyState.tsx';
import type { StatusLabel, ReviewTaskItem } from '../../types.ts';

export default function ReviewTab(): React.ReactElement {
  const [reviewTask, setReviewTask] = useState<ReviewTaskItem | null>(null);

  const ctx = useAppContext();
  const children = ctx.children;
  const allU = ctx.allU;
  const cfg = ctx.cfg;
  const d = getToday();

  if (!cfg) return <div />;

  const items: ReviewTaskItem[] = [];
  children.forEach((c) => {
    const udata = allU[c.id] || freshUser();
    const log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
    (cfg.tasks[c.id] || []).forEach((t) => {
      const entry = log[t.id];
      if (entry && !entry.rejected && entry.status !== 'missed')
        items.push({ uid: c.id, child: c, task: t, entry });
    });
  });

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Review completed missions and photo proof from today. If a mission wasn't
        done properly, reject it to deduct the coins and send it back for the
        child to redo.
      </div>
      {items.length === 0 && (
        <EmptyState
          icon={faMagnifyingGlass}
          title='Nothing to review'
          description='No completed missions to review today. Once children complete missions, they will show up here with photo proof.'
        />
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
