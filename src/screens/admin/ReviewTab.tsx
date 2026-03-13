import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { SL, altBg } from '../../constants.ts';
import { freshUser, getToday } from '../../utils.ts';
import Badge from '../../components/Badge.tsx';
import Modal from '../../components/ui/Modal.tsx';
import type { StatusLabel, ReviewTaskItem } from '../../types.ts';

export default function ReviewTab(): React.ReactElement {
  var _reviewTask = useState<ReviewTaskItem | null>(null),
    reviewTask = _reviewTask[0],
    setReviewTask = _reviewTask[1];

  var ctx = useAppContext();
  var children = ctx.children;
  var allU = ctx.allU;
  var cfg = ctx.cfg;
  var d = getToday();

  var items: ReviewTaskItem[] = [];
  children.forEach(function (c) {
    var udata = allU[c.id] || freshUser();
    var log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
    (cfg!.tasks[c.id] || []).forEach(function (t) {
      var entry = log[t.id];
      if (entry && !entry.rejected && entry.status !== 'missed')
        items.push({ uid: c.id, child: c, task: t, entry: entry });
    });
  });

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Review completed tasks and photo proof from today. If a task wasn't done
        properly, reject it to deduct the points and send it back for the child
        to redo.
      </div>
      {items.length === 0 && (
        <div className='text-center p-5 text-qmuted'>
          No tasks to review today.
        </div>
      )}
      {items.map(function (item, ri) {
        return (
          <div
            key={item.uid + '-' + item.task.id}
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
                  {item.entry.points} pts
                </div>
              </div>
              <Badge status={item.entry.status} />
            </div>
            <div className='flex gap-3 mt-3'>
              {item.entry.photo && (
                <button
                  onClick={function () {
                    ctx.setViewPhoto(item.entry.photo);
                  }}
                  className='bg-qblue-dim text-qblue rounded-badge px-4 py-2 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1.5'
                >
                  <FontAwesomeIcon icon={faEye} />
                  View Photo
                </button>
              )}
              <button
                onClick={function () {
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
        <Modal title='Reject Task?'>
          <div className='mb-4'>
            <div className='font-semibold text-qslate'>
              {reviewTask.child.name}: {reviewTask.task.name}
            </div>
            <div className='text-[13px] text-qmuted mt-1'>
              Points removed. Sent back for redo.
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
              onClick={function () {
                setReviewTask(null);
              }}
              className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
            >
              Cancel
            </button>
            <button
              onClick={function () {
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
