import React, { useState } from 'react';
import { DAYS } from '../../constants.ts';
import type { Task } from '../../types.ts';

interface TaskFormProps {
  task: Task & { uid: string };
  tierPts: Record<number, number>;
  onSave: (task: Task & { uid: string }) => void;
  onCancel: () => void;
}

export default function TaskForm(props: TaskFormProps): React.ReactElement {
  var _s = useState<Task & { uid: string }>(props.task),
    f = _s[0],
    setF = _s[1];
  var tp = props.tierPts;
  function u(k: string, v: any): void {
    setF(Object.assign({}, f, { [k]: v }));
  }
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <label className='text-qslate font-semibold mb-2 block'>
          Mission Name
        </label>
        <input
          placeholder='Mission name'
          value={f.name}
          onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
            u('name', e.target.value);
          }}
          className='quest-input'
        />
      </div>
      <div>
        <label className='text-qslate font-semibold mb-2 block'>Rank</label>
        <select
          value={f.tier}
          onChange={function (e: React.ChangeEvent<HTMLSelectElement>) {
            u('tier', Number(e.target.value));
          }}
          className='quest-input'
        >
          <option value={1}>Rank 1 ({tp[1] || 5} coins)</option>
          <option value={2}>Rank 2 ({tp[2] || 10} coins)</option>
          <option value={3}>Rank 3 ({tp[3] || 20} coins)</option>
          <option value={4}>Rank 4 ({tp[4] || 30} coins)</option>
        </select>
      </div>
      <div className='flex gap-3'>
        <div className='w-[50%]'>
          <label className='text-qslate font-semibold mb-2 block'>Start</label>
          <input
            type='time'
            value={f.windowStart}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              u('windowStart', e.target.value);
            }}
            className='quest-input'
          />
        </div>
        <div className='w-[50%]'>
          <label className='text-qslate font-semibold mb-2 block'>End</label>
          <input
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
        <div className='flex gap-3'>
          <button
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
          <label className='text-qslate font-semibold mb-2 block'>
            Due Day
          </label>
          <select
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
      <div className='flex gap-3 justify-end'>
        <button
          onClick={props.onCancel}
          className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
        >
          Cancel
        </button>
        <button
          onClick={function () {
            if (f.name && (f.daily || f.dueDay != null)) props.onSave(f);
          }}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Save
        </button>
      </div>
    </div>
  );
}
