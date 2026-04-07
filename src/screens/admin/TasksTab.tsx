import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPenToSquare,
  faTrashCan,
  faClipboardList,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { getCurrentUid } from '../../services/auth.ts';
import {
  DEF_TIER_CONFIG,
  DAYS_SHORT,
  TIER_COLORS,
  altBg,
} from '../../constants.ts';
import { fmtTime, getToday } from '../../utils.ts';
import FullScreenSlideUp from '../../components/ui/FullScreenSlideUp.tsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';
import EmptyState from '../../components/ui/EmptyState.tsx';
import TaskForm from '../../components/forms/TaskForm.tsx';
import MissionPresetScreen from './MissionPresetScreen.tsx';
import type { Task } from '../../types.ts';

function getSkipKey() {
  return `lb-skip-delete-mission:${getCurrentUid() || 'anon'}`;
}

interface TasksTabProps {
  onSwitchTab: (tab: string) => void;
}

export default function TasksTab(props: TasksTabProps): React.ReactElement {
  const [editTask, setEditTask] = useState<(Task & { uid: string }) | null>(
    null
  );
  const [addTask, setAddTask] = useState<(Task & { uid: string }) | null>(null);
  const [deleteTask, setDeleteTask] = useState<{
    task: Task;
    childId: string;
  } | null>(null);
  const [showPreset, setShowPreset] = useState(false);

  const ctx = useAppContext();
  const children = ctx.children;
  const cfg = ctx.cfg;
  const activeForm = editTask || addTask;

  const removeTask = (childId: string, taskId: string) => {
    const nt: Record<string, Task[]> = { ...cfg!.tasks };
    nt[childId] = (nt[childId] || []).filter(x => x.id !== taskId);
    ctx.saveCfg({ ...cfg!, tasks: nt });
  };

  const isFormValid = (t: Task & { uid: string }) => {
    if (!t.name) return false;
    const freq = t.frequency || (t.daily ? 'daily' : 'specific_days');
    if (freq === 'specific_days' && !(t.dueDays && t.dueDays.length > 0))
      return false;
    if (t.windowStart && t.windowEnd && t.windowEnd <= t.windowStart)
      return false;
    return true;
  };

  const buildTask = (t: Task & { uid: string }): Omit<Task, 'id'> => {
    const freq = t.frequency || (t.daily ? 'daily' : 'specific_days');
    return {
      name: t.name,
      tier: t.tier,
      windowStart: t.windowStart,
      windowEnd: t.windowEnd,
      daily: freq === 'daily',
      frequency: freq as Task['frequency'],
      dueDay:
        freq === 'specific_days' && t.dueDays?.length
          ? t.dueDays[0]
          : null,
      dueDays: freq === 'specific_days' ? t.dueDays : undefined,
      photoRequired: t.photoRequired,
    };
  };

  const saveTask = () => {
    if (!activeForm || !isFormValid(activeForm)) return;
    const t = activeForm;
    const uid = t.uid;
    const nt: Record<string, Task[]> = { ...cfg!.tasks };
    const taskData = buildTask(t);
    if (editTask) {
      nt[uid] = nt[uid].map(x => {
        return x.id === t.id ? { ...x, ...taskData, id: t.id } : x;
      });
    } else {
      nt[uid] = (nt[uid] || []).concat([
        {
          ...taskData,
          id: uid.substring(0, 3) + Date.now(),
          createdAt: getToday(),
        },
      ]);
    }
    ctx.saveCfg({ ...cfg!, tasks: nt });
    setEditTask(null);
    setAddTask(null);
  };

  const closeForm = () => {
    setEditTask(null);
    setAddTask(null);
    setShowPreset(false);
  };

  if (children.length === 0) {
    return (
      <EmptyState
        icon={faClipboardList}
        title='Mission Management'
        description='Create daily and weekly missions for each child. Assign ranks, set time windows, and watch them earn coins for completing their missions.'
        ctaText='Go to Children'
        onCta={() => {
          props.onSwitchTab('children');
        }}
      />
    );
  }

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Missions are recurring. Daily missions repeat every day, weekly missions
        on their assigned day.
      </div>
      {children.map(c => {
        const tasks = cfg!.tasks[c.id] || [];
        return (
          <div key={c.id} className='pb-4'>
            <div className='flex justify-between items-center mb-3 mt-4'>
              <span className='font-bold text-qslate'>
                {c.avatar} {c.name}'s Missions
              </span>
              <button
                onClick={() => {
                  setAddTask({
                    uid: c.id,
                    id: '',
                    name: '',
                    tier: 'C',
                    windowStart: '08:00',
                    windowEnd: '10:00',
                    daily: true,
                    dueDay: null,
                    frequency: 'daily',
                    photoRequired: true,
                  });
                }}
                className='bg-qmint text-qslate rounded-badge px-4 py-2 text-[13px] font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
              >
                <FontAwesomeIcon icon={faPlus} />
                Add
              </button>
            </div>
            {tasks.map((t, ti) => {
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
                      <span
                        style={{
                          color: TIER_COLORS[t.tier] || '#6b7280',
                          fontWeight: 700,
                        }}
                      >
                        {t.tier}
                      </span>
                      -Tier ({ctx.tp(t.tier)} coins, {ctx.tierCfg(t.tier).xp}{' '}
                      XP) | {fmtTime(t.windowStart)}-{fmtTime(t.windowEnd)} |{' '}
                      {t.frequency === 'once'
                        ? 'Once'
                        : t.frequency === 'specific_days' || (!t.daily && t.dueDay != null)
                          ? t.dueDays?.length
                            ? t.dueDays.map(d => DAYS_SHORT[d]).join(', ')
                            : DAYS_SHORT[t.dueDay!]
                          : 'Daily'}
                    </div>
                  </div>
                  <div className='flex gap-1.5'>
                    <button
                      onClick={() => {
                        setEditTask({ ...t, uid: c.id });
                      }}
                      className='bg-qblue-dim text-qblue rounded-[6px] px-3 py-1.5 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1'
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                      <span className='sr-only'>Edit {t.name}</span>
                    </button>
                    <button
                      onClick={() => {
                        try {
                          if (localStorage.getItem(getSkipKey()) === '1') {
                            removeTask(c.id, t.id);
                            return;
                          }
                        } catch (_e) {}
                        setDeleteTask({ task: t, childId: c.id });
                      }}
                      className='bg-qred-dim text-qred rounded-[6px] px-3 py-1.5 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1'
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                      <span className='sr-only'>Delete {t.name}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {activeForm && (
        <FullScreenSlideUp
          title={editTask ? 'Edit Mission' : 'New Mission'}
          cancelLabel='Cancel'
          actionLabel={editTask ? 'Save' : 'Add'}
          actionDisabled={!isFormValid(activeForm)}
          onCancel={closeForm}
          onAction={saveTask}
        >
          <TaskForm
            task={activeForm}
            tierConfig={cfg!.tierConfig || DEF_TIER_CONFIG}
            onChange={t => {
              if (editTask) setEditTask(t);
              else setAddTask(t);
            }}
            onUsePreset={!editTask ? () => setShowPreset(true) : undefined}
          />
        </FullScreenSlideUp>
      )}

      {showPreset && addTask && (
        <MissionPresetScreen
          onSelect={preset => {
            setAddTask({
              ...addTask,
              name: preset.name,
              tier: preset.tier,
              windowStart: preset.windowStart,
              windowEnd: preset.windowEnd,
              daily: preset.daily,
              dueDay: null,
            });
            setShowPreset(false);
          }}
          onBack={() => setShowPreset(false)}
        />
      )}

      {deleteTask && (
        <ConfirmDialog
          title={`Delete "${deleteTask.task.name}"?`}
          message='This mission will be permanently removed.'
          confirmLabel='Delete'
          dontAskAgainKey={getSkipKey()}
          onConfirm={() => {
            removeTask(deleteTask.childId, deleteTask.task.id);
            setDeleteTask(null);
          }}
          onCancel={() => setDeleteTask(null)}
        />
      )}
    </div>
  );
}
