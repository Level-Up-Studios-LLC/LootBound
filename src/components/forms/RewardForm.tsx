import React, { useState } from 'react';
import type { Reward } from '../../types.ts';

const REWARD_EMOJIS = [
  '\u{1F3AE}',
  '\u{1F4F1}',
  '\u{1F355}',
  '\u{1F381}',
  '\u{1F3AC}',
  '\u{1F319}',
  '\u{1F3E0}',
  '\u{1F3C6}',
  '\u{1F3A8}',
  '\u26BD',
  '\u{1F366}',
  '\u{1F4DA}',
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
        <div className='flex gap-1 flex-wrap'>
          {REWARD_EMOJIS.map(e => {
            return (
              <button
                key={e}
                onClick={() => {
                  u('icon', e);
                }}
                className={
                  'text-xl rounded-[6px] px-1.5 py-1 border-none cursor-pointer ' +
                  (f.icon === e ? 'bg-qteal-dim' : 'bg-transparent')
                }
              >
                {e}
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
          value={f.cost || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            u('cost', e.target.value === '' ? 0 : Number(e.target.value));
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
