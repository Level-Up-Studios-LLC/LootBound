import React from 'react';
import { DAYS, TIER_ORDER } from '../../constants.ts';
import { fmtTime } from '../../utils.ts';
import type { Task, TierConfig } from '../../types.ts';

interface TaskFormProps {
  task: Task & { uid: string };
  tierConfig: Record<string, TierConfig>;
  onChange: (task: Task & { uid: string }) => void;
  onUsePreset?: () => void;
}

export default function TaskForm(props: TaskFormProps): React.ReactElement {
  const f = props.task;
  const tc = props.tierConfig;
  type FormState = Task & { uid: string };
  const u = <K extends keyof FormState>(k: K, v: FormState[K]): void => {
    props.onChange({ ...f, [k]: v });
  };
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <label
          htmlFor='tf-name'
          className='text-qslate text-sm font-semibold mb-1 block'
        >
          Mission Name
        </label>
        <input
          id='tf-name'
          placeholder='Mission name'
          value={f.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            u('name', e.target.value);
          }}
          className='quest-input'
        />
        {props.onUsePreset && (
          <div className='flex justify-end mt-1'>
            <button
              type='button'
              onClick={props.onUsePreset}
              className='bg-transparent border-none cursor-pointer font-body text-sm font-semibold text-qteal px-0 py-0.5'
            >
              Use Preset
            </button>
          </div>
        )}
      </div>
      <div>
        <label
          htmlFor='tf-tier'
          className='text-qslate text-sm font-semibold mb-1 block'
        >
          Tier
        </label>
        <select
          id='tf-tier'
          value={f.tier}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            u('tier', e.target.value);
          }}
          className='quest-input'
        >
          {TIER_ORDER.map(t => {
            const cfg = tc[t] || { coins: 0, xp: 0 };
            return (
              <option key={t} value={t}>
                {t}-Tier ({cfg.coins} coins, {cfg.xp} XP)
              </option>
            );
          })}
        </select>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <div className='min-w-0'>
          <label
            htmlFor='tf-start'
            className='text-qslate text-sm font-semibold mb-1 block'
          >
            Start
          </label>
          <input
            id='tf-start'
            type='time'
            value={f.windowStart}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              u('windowStart', e.target.value);
            }}
            className='quest-input'
          />
        </div>
        <div className='min-w-0'>
          <label
            htmlFor='tf-end'
            className='text-qslate text-sm font-semibold mb-1 block'
          >
            End
          </label>
          <input
            id='tf-end'
            type='time'
            value={f.windowEnd}
            min={f.windowStart || undefined}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              u('windowEnd', e.target.value);
            }}
            className='quest-input'
          />
          {f.windowStart && f.windowEnd && f.windowEnd <= f.windowStart && (
            <div className='text-qred text-xs mt-1'>
              Must be after {fmtTime(f.windowStart)}.
            </div>
          )}
        </div>
      </div>
      <div>
        <label className='text-qslate text-sm font-semibold mb-1 block'>
          Frequency
        </label>
        <div className='flex gap-3' role='radiogroup' aria-label='Frequency'>
          <button
            role='radio'
            aria-checked={f.daily}
            tabIndex={f.daily ? 0 : -1}
            onClick={() => {
              u('daily', true);
            }}
            className={
              'flex-1 rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body text-[13px] ' +
              (f.daily ? 'bg-qteal text-white' : 'bg-qslate-dim text-qmuted')
            }
          >
            Daily
          </button>
          <button
            role='radio'
            aria-checked={!f.daily}
            tabIndex={!f.daily ? 0 : -1}
            onClick={() => {
              u('daily', false);
            }}
            className={
              'flex-1 rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body text-[13px] ' +
              (!f.daily ? 'bg-qteal text-white' : 'bg-qslate-dim text-qmuted')
            }
          >
            Weekly
          </button>
        </div>
      </div>
      {!f.daily && (
        <div>
          <label
            htmlFor='tf-dueday'
            className='text-qslate text-sm font-semibold mb-1 block'
          >
            Due Day
          </label>
          <select
            id='tf-dueday'
            value={f.dueDay != null ? f.dueDay : ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              u(
                'dueDay',
                e.target.value !== '' ? Number(e.target.value) : null
              );
            }}
            className='quest-input'
          >
            <option value=''>Select day...</option>
            {DAYS.map((day, i) => {
              return (
                <option key={i} value={i}>
                  {day}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div className='text-xs text-qmuted'>
        {f.daily ? 'Repeats every day.' : 'Repeats weekly on selected day.'}
      </div>
    </div>
  );
}
