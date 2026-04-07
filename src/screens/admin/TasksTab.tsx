import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faClipboardList } from '../../fa.ts';
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
    if (t.frequency === 'specific_days' && t.dueDays.length === 0) return false;
    if (t.windowStart && t.windowEnd && t.windowEnd <= t.windowStart)
      return false;
    return true;
  };

  const buildTask = (t: Task & { uid: string }): Omit<Task, 'id'> => ({
    name: t.name,
    tier: t.tier,
    windowStart: t.windowStart,
    windowEnd: t.windowEnd,
    frequency: t.frequency,
    dueDays: t.frequency === 'specific_days' ? t.dueDays : [],
    photoRequired: t.photoRequired,
  });

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
                    frequency: 'daily',
                    dueDays: [],
                    photoRequired: true,
                  });
                }}
                className='bg-qmint text-qslate rounded-badge px-4 py-2 text-[13px] font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
              >
                <FontAwesomeIcon icon={faPlus} />
                Add
              </button>
            </div>
            {tasks.map((t, ti) => (
              <button
                key={t.id}
                type='button'
                onClick={() => setEditTask({ ...t, uid: c.id })}
                className={
                  altBg(ti) +
                  ' flex justify-between items-center rounded-badge px-4 py-3 mb-3 w-full text-left border-none cursor-pointer font-body hover:brightness-95 active:scale-[0.99] transition-all'
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
                    -Tier ({ctx.tp(t.tier)} coins, {ctx.tierCfg(t.tier).xp} XP)
                    | {fmtTime(t.windowStart)}-{fmtTime(t.windowEnd)} |{' '}
                    {t.frequency === 'once'
                      ? 'Once'
                      : t.frequency === 'specific_days'
                        ? t.dueDays.map(d => DAYS_SHORT[d]).join(', ')
                        : 'Daily'}
                  </div>
                </div>
              </button>
            ))}
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
          {editTask && (
            <div className='mt-8 text-center'>
              <button
                type='button'
                onClick={() => {
                  setDeleteTask({ task: editTask, childId: editTask.uid });
                }}
                className='bg-transparent border-none cursor-pointer font-body text-qred text-sm'
              >
                Delete Mission
              </button>
            </div>
          )}
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
              frequency: preset.frequency,
              dueDays: [],
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
            setEditTask(null);
          }}
          onCancel={() => setDeleteTask(null)}
        />
      )}
    </div>
  );
}
