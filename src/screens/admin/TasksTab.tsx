import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrashCan, faClipboardList } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { DEF_TIER_PTS, DAYS_SHORT, altBg } from '../../constants.ts';
import { fmtTime } from '../../utils.ts';
import Modal from '../../components/ui/Modal.tsx';
import EmptyState from '../../components/ui/EmptyState.tsx';
import TaskForm from '../../components/forms/TaskForm.tsx';
import type { Task } from '../../types.ts';

interface TasksTabProps {
  onSwitchTab: (tab: string) => void;
}

export default function TasksTab(props: TasksTabProps): React.ReactElement {
  var _editTask = useState<(Task & { uid: string }) | null>(null),
    editTask = _editTask[0],
    setEditTask = _editTask[1];
  var _addTask = useState<(Task & { uid: string }) | null>(null),
    addTask = _addTask[0],
    setAddTask = _addTask[1];

  var ctx = useAppContext();
  var children = ctx.children;
  var cfg = ctx.cfg;

  if (children.length === 0) {
    return (
      <EmptyState
        icon={faClipboardList}
        title='Mission Management'
        description='Create daily and weekly missions for each child. Assign ranks, set time windows, and watch them earn coins for completing their missions.'
        ctaText='Go to Children'
        onCta={function () {
          props.onSwitchTab('children');
        }}
      />
    );
  }

  return (
    <div>
      {children.map(function (c) {
        var tasks = cfg!.tasks[c.id] || [];
        return (
          <div key={c.id} className='pb-4'>
            <div className='flex justify-between items-center mb-3 mt-4'>
              <span className='font-bold text-qslate'>
                {c.avatar} {c.name}'s Missions
              </span>
              <button
                onClick={function () {
                  setAddTask({
                    uid: c.id,
                    id: '',
                    name: '',
                    tier: 1,
                    windowStart: '08:00',
                    windowEnd: '10:00',
                    daily: true,
                    dueDay: null,
                  });
                }}
                className='bg-qmint text-qslate rounded-badge px-4 py-2 text-[13px] font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
              >
                <FontAwesomeIcon icon={faPlus} />
                Add
              </button>
            </div>
            {tasks.map(function (t, ti) {
              return (
                <div
                  key={t.id}
                  className={
                    altBg(ti) +
                    ' flex justify-between items-center rounded-badge px-4 py-3 mb-3'
                  }
                >
                  <div>
                    <div className='font-semibold text-qslate'>{t.name}</div>
                    <div className='text-xs text-qmuted'>
                      Rank {t.tier} ({ctx.tp(t.tier)} coins) |{' '}
                      {fmtTime(t.windowStart)}-{fmtTime(t.windowEnd)} |{' '}
                      {t.daily
                        ? 'Daily'
                        : 'Weekly: ' + DAYS_SHORT[t.dueDay!]}
                    </div>
                  </div>
                  <div className='flex gap-1.5'>
                    <button
                      onClick={function () {
                        setEditTask(Object.assign({}, t, { uid: c.id }));
                      }}
                      className='bg-qblue-dim text-qblue rounded-[6px] px-3 py-1.5 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1'
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                      Edit
                    </button>
                    <button
                      onClick={function () {
                        var nt: Record<string, Task[]> = Object.assign(
                          {},
                          cfg!.tasks
                        );
                        nt[c.id] = nt[c.id].filter(function (x) {
                          return x.id !== t.id;
                        });
                        ctx.saveCfg(Object.assign({}, cfg!, { tasks: nt }));
                      }}
                      className='bg-qred-dim text-qred rounded-[6px] px-3 py-1.5 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1'
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                      <span className='sr-only'>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {(editTask || addTask) && (
        <Modal title={editTask ? 'Edit Mission' : 'Add Mission'}>
          <TaskForm
            task={(editTask || addTask)!}
            tierPts={cfg!.tierPoints || DEF_TIER_PTS}
            onSave={function (t) {
              var uid = t.uid;
              var nt: Record<string, Task[]> = Object.assign({}, cfg!.tasks);
              if (editTask) {
                nt[uid] = nt[uid].map(function (x) {
                  return x.id === t.id
                    ? {
                        id: t.id,
                        name: t.name,
                        tier: t.tier,
                        windowStart: t.windowStart,
                        windowEnd: t.windowEnd,
                        daily: t.daily,
                        dueDay: t.daily ? null : t.dueDay,
                      }
                    : x;
                });
              } else {
                nt[uid] = (nt[uid] || []).concat([
                  {
                    id: uid.substring(0, 3) + Date.now(),
                    name: t.name,
                    tier: t.tier,
                    windowStart: t.windowStart,
                    windowEnd: t.windowEnd,
                    daily: t.daily,
                    dueDay: t.daily ? null : t.dueDay,
                  },
                ]);
              }
              ctx.saveCfg(Object.assign({}, cfg!, { tasks: nt }));
              setEditTask(null);
              setAddTask(null);
            }}
            onCancel={function () {
              setEditTask(null);
              setAddTask(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
