import React, { useState } from 'react';
import type { Reward } from '../../types.ts';

const REWARD_EMOJIS: { emoji: string; label: string }[] = [
  { emoji: '\u{1F3AE}', label: 'Video game' },
  { emoji: '\u{1F4F1}', label: 'Phone or screen time' },
  { emoji: '\u{1F355}', label: 'Pizza or food pick' },
  { emoji: '\u{1F381}', label: 'Gift or present' },
  { emoji: '\u{1F3AC}', label: 'Movie' },
  { emoji: '\u{1F319}', label: 'Stay up late' },
  { emoji: '\u{1F3E0}', label: 'Home activity' },
  { emoji: '\u{1F3C6}', label: 'Trophy or prize' },
  { emoji: '\u{1F3A8}', label: 'Art or craft' },
  { emoji: '\u26BD', label: 'Sports' },
  { emoji: '\u{1F366}', label: 'Ice cream or treat' },
  { emoji: '\u{1F4DA}', label: 'Books or reading' },
];

interface RewardFormProps {
  reward: Reward;
  onSave: (reward: Reward) => void;
  onCancel: () => void;
}

export default function RewardForm(props: RewardFormProps): React.ReactElement {
  const [f, setF] = useState<Reward>(props.reward);
  const u = <K extends keyof Reward>(k: K, v: Reward[K]): void => {
    setF(prev => Object.assign({}, prev, { [k]: v }));
  };
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>
          Loot Name
        </label>
        <input
          placeholder='Loot name'
          value={f.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            u('name', e.target.value);
          }}
          className='quest-input'
        />
      </div>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>Icon</label>
        <div className='flex gap-1 flex-wrap' role='group' aria-label='Icon picker'>
          {REWARD_EMOJIS.map(({ emoji, label }) => {
            return (
              <button
                key={emoji}
                onClick={() => {
                  u('icon', emoji);
                }}
                aria-label={label}
                aria-pressed={f.icon === emoji}
                className={
                  'text-xl rounded-[6px] px-1.5 py-1 border-none cursor-pointer ' +
                  (f.icon === emoji ? 'bg-qteal-dim' : 'bg-transparent')
                }
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>
          Cost (coins)
        </label>
        <input
          type='number'
          value={f.cost ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value === '' ? 0 : Number(e.target.value);
            u('cost', Number.isFinite(v) ? v : 0);
          }}
          min={0}
          placeholder='0'
          className='quest-input'
        />
      </div>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>Limit</label>
        <select
          value={f.limitType || 'none'}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            u('limitType', e.target.value);
          }}
          className='quest-input'
        >
          <option value='none'>No limit</option>
          <option value='daily'>Per day</option>
          <option value='weekly'>Per week</option>
        </select>
      </div>
      {f.limitType && f.limitType !== 'none' && (
        <div>
          <label className='text-qslate font-semibold mb-1 block'>
            Max ({f.limitType === 'daily' ? 'per day' : 'per week'})
          </label>
          <input
            type='number'
            value={f.limitMax || 1}
            min={1}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              u('limitMax', Number(e.target.value) || 1);
            }}
            className='quest-input'
          />
        </div>
      )}
      <label className='text-qslate flex items-center gap-2'>
        <input
          type='checkbox'
          checked={!!f.requireApproval}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            u('requireApproval', e.target.checked);
          }}
        />{' '}
        Require parent approval
      </label>
      <div className='flex gap-3 justify-end'>
        <button
          onClick={props.onCancel}
          className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (f.name) props.onSave(f);
          }}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Save
        </button>
      </div>
    </div>
  );
}
