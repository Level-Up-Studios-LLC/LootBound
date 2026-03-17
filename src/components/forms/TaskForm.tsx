import React, { useState } from 'react';
import { DAYS, TIER_ORDER } from '../../constants.ts';
import type { Task, TierConfig } from '../../types.ts';

interface TaskFormProps {
  task: Task & { uid: string };
  tierConfig: Record<string, TierConfig>;
  onSave: (task: Task & { uid: string }) => void;
  onCancel: () => void;
}

export default function TaskForm(props: TaskFormProps): React.ReactElement {
  var _s = useState<Task & { uid: string }>(props.task),
    f = _s[0],
    setF = _s[1];
  var tc = props.tierConfig;
  function u(k: string, v: any): void {
    setF(Object.assign({}, f, { [k]: v }));
  }
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <label htmlFor='tf-name' className='text-qslate font-semibold mb-2 block'>
          Mission Name
        </label>
        <input
          id='tf-name'
          placeholder='Mission name'
          value={f.name}
          onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
            u('name', e.target.value);
          }}
          className='quest-input'
        />
      </div>
      <div>
        <label htmlFor='tf-tier' className='text-qslate font-semibold mb-2 block'>Tier</label>
        <select
          id='tf-tier'
          value={f.tier}
          onChange={function (e: React.ChangeEvent<HTMLSelectElement>) {
            u('tier', e.target.value);
          }}
          className='quest-input'
        >
          {TIER_ORDER.map(function (t) {
            var cfg = tc[t] || { coins: 0, xp: 0 };
            return (
              <option key={t} value={t}>
                {t}-Tier ({cfg.coins} coins, {cfg.xp} XP)
              </option>
            );
          })}
        </select>
      </div>
      <div className='flex gap-3'>
        <div className='w-1/2'>
          <label htmlFor='tf-start' className='text-qslate font-semibold mb-2 block'>Start</label>
          <input
            id='tf-start'
            type='time'
            value={f.windowStart}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              u('windowStart', e.target.value);
            }}
            className='quest-input'
          />
        </div>
        <div className='w-1/2'>
          <label htmlFor='tf-end' className='text-qslate font-semibold mb-2 block'>End</label>
          <input
            id='tf-end'
            type='time'
            value={f.windowEnd}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              u('windowEnd', e.target.value);
            }}
            className='quest-input'
          />
        </div>
      </div>
      <div>
        <label className='text-qslate font-semibold mb-2 block'>
          Frequency
        </label>
        <div className='flex gap-3' role='radiogroup' aria-label='Frequency'>
          <button
            role='radio'
            aria-checked={f.daily}
            tabIndex={f.daily ? 0 : -1}
            onClick={function () {
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
            onClick={function () {
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
          <label htmlFor='tf-dueday' className='text-qslate font-semibold mb-2 block'>
            Due Day
          </label>
          <select
            id='tf-dueday'
            value={f.dueDay != null ? f.dueDay : ''}
            onChange={function (e: React.ChangeEvent<HTMLSelectElement>) {
              u(
                'dueDay',
                e.target.value !== '' ? Number(e.target.value) : null
              );
            }}
            className='quest-input'
          >
            <option value=''>Select day...</option>
            {DAYS.map(function (day, i) {
              return (
                <option key={i} value={i}>
                  {day}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div className='text-[11px] text-qmuted'>
        {f.daily ? 'Repeats every day.' : 'Repeats weekly on selected day.'}
      </div>
      {f.windowStart && f.windowEnd && f.windowEnd <= f.windowStart && (
        <div className='text-qcoral text-[13px]'>
          End time must be after start time.
        </div>
      )}
      <div className='flex gap-3 justify-end'>
        <button
          onClick={props.onCancel}
          className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
        >
          Cancel
        </button>
        <button
          onClick={function () {
            if (
              f.name &&
              (f.daily || f.dueDay != null) &&
              (!f.windowStart || !f.windowEnd || f.windowEnd > f.windowStart)
            )
              props.onSave(f);
          }}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Save
        </button>
      </div>
    </div>
  );
}
