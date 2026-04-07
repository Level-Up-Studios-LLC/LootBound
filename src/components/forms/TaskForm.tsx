import React from 'react';
import { DAYS_SHORT, TIER_ORDER } from '../../constants.ts';
import { fmtTime } from '../../utils.ts';
import type { Task, TierConfig } from '../../types.ts';

interface TaskFormProps {
  task: Task & { uid: string };
  tierConfig: Record<string, TierConfig>;
  onChange: (task: Task & { uid: string }) => void;
  onUsePreset?: () => void;
}

type Freq = 'daily' | 'specific_days' | 'once';

export default function TaskForm(props: TaskFormProps): React.ReactElement {
  const f = props.task;
  const tc = props.tierConfig;
  const freq = f.frequency;
  type FormState = Task & { uid: string };
  const u = <K extends keyof FormState>(k: K, v: FormState[K]): void => {
    props.onChange({ ...f, [k]: v });
  };

  const setFreq = (next: Freq) => {
    const updated: Partial<FormState> = { frequency: next };
    if (next === 'daily') {
      updated.dueDays = [];
    } else if (next === 'specific_days') {
      updated.dueDays = f.dueDays.length ? f.dueDays : [];
    } else {
      updated.dueDays = [];
    }
    props.onChange({ ...f, ...updated });
  };

  const toggleDay = (dayIdx: number) => {
    const current = f.dueDays;
    const next = current.includes(dayIdx)
      ? current.filter(d => d !== dayIdx)
      : [...current, dayIdx].sort((a, b) => a - b);
    props.onChange({ ...f, dueDays: next });
  };

  const photoOn = f.photoRequired;

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
      <div>
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
              className='quest-input w-full max-w-full box-border'
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
              className='quest-input w-full max-w-full box-border'
            />
          </div>
        </div>
        {f.windowStart && f.windowEnd && f.windowEnd <= f.windowStart && (
          <div className='text-qred text-xs mt-1'>
            Must be after {fmtTime(f.windowStart)}.
          </div>
        )}
      </div>
      <div>
        <label className='text-qslate text-sm font-semibold mb-1 block'>
          Frequency
        </label>
        <div className='flex gap-2' role='radiogroup' aria-label='Frequency'>
          {(['daily', 'once', 'specific_days'] as Freq[]).map(opt => {
            const label =
              opt === 'daily'
                ? 'Daily'
                : opt === 'once'
                  ? 'One-Time'
                  : 'Specific Days';
            const active = freq === opt;
            return (
              <button
                key={opt}
                role='radio'
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setFreq(opt)}
                className={
                  'flex-1 rounded-badge px-3 py-2 font-semibold border-none cursor-pointer font-body text-[13px] ' +
                  (active ? 'bg-qteal text-white' : 'bg-qslate-dim text-qmuted')
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {freq === 'specific_days' && (
        <div>
          <div
            className='flex justify-between gap-1.5'
            role='group'
            aria-label='Select days'
          >
            {DAYS_SHORT.map((d, i) => {
              const selected = (f.dueDays || []).includes(i);
              return (
                <button
                  key={i}
                  type='button'
                  onClick={() => toggleDay(i)}
                  aria-pressed={selected}
                  className={
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-none cursor-pointer font-body shrink-0 ' +
                    (selected
                      ? 'bg-qteal text-white'
                      : 'bg-qslate-dim text-qmuted')
                  }
                >
                  {d.charAt(0)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className='text-xs text-qmuted'>
        {freq === 'daily'
          ? 'Repeats every day.'
          : freq === 'specific_days'
            ? 'Repeats weekly on selected days.'
            : 'One-time mission. Appears daily until completed.'}
      </div>

      {/* Photo proof toggle */}
      <div className='flex items-center justify-between'>
        <label htmlFor='tf-photo' className='text-qslate text-sm font-semibold'>
          Photo Proof
        </label>
        <button
          id='tf-photo'
          role='switch'
          type='button'
          aria-checked={photoOn}
          onClick={() => u('photoRequired', !photoOn)}
          className={
            'relative inline-flex items-center w-12 h-7 rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0 ' +
            (photoOn ? 'bg-qteal' : 'bg-qslate-dim')
          }
        >
          <span
            className='absolute w-6 h-6 rounded-full bg-white shadow-sm transition-[left] duration-200'
            style={{ left: photoOn ? 22 : 2, top: 2 }}
          />
        </button>
      </div>
      <div className='text-xs text-qmuted -mt-2'>
        {photoOn
          ? 'Children must take a photo when completing this mission.'
          : 'No photo required on completion.'}
      </div>
    </div>
  );
}
