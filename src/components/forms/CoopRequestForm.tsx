import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandshake, faPeopleGroup } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { TIER_COLORS } from '../../constants.ts';
import type { Task } from '../../types.ts';

interface CoopRequestFormProps {
  task: Task;
  onSend: (partnerId: string) => Promise<void>;
  onCancel: () => void;
}

export default function CoopRequestForm({
  task,
  onSend,
  onCancel,
}: CoopRequestFormProps): React.ReactElement {
  const ctx = useAppContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const siblings = (ctx.cfg?.children || []).filter(c => c.id !== ctx.curUser);
  const splitCoins = Math.floor(ctx.tierCfg(task.tier).coins / 2);
  const xp = ctx.tierCfg(task.tier).xp;

  const handleSend = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await onSend(selectedId);
    } catch {
      ctx.notify('Failed to send co-op request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Task info */}
      <div className='flex items-center gap-2 mb-3'>
        <FontAwesomeIcon icon={faHandshake} className='text-qcyan' />
        <span
          className='text-[10px] font-bold px-1.5 py-0.5 rounded-badge'
          style={{
            color: TIER_COLORS[task.tier] || '#6b7280',
            background: (TIER_COLORS[task.tier] || '#6b7280') + '18',
          }}
        >
          {task.tier}
        </span>
        <span className='text-sm font-semibold text-qslate'>{task.name}</span>
      </div>

      {/* Coin split preview */}
      <div className='bg-qcoop-dim rounded-badge px-3 py-2 mb-4 text-[12px] text-qslate'>
        Each kid earns: <strong>{splitCoins} coins</strong> &middot;{' '}
        <strong>{xp} XP</strong> each (full)
      </div>

      {/* Sibling selector */}
      <div className='text-[12px] font-semibold text-qslate mb-2 flex items-center gap-1.5'>
        <FontAwesomeIcon
          icon={faPeopleGroup}
          className='text-qcyan text-[11px]'
        />
        Choose a sibling
      </div>
      <div className='flex flex-col gap-2 mb-4'>
        {siblings.map(s => (
          <button
            key={s.id}
            type='button'
            onClick={() => setSelectedId(s.id)}
            className={
              'flex items-center gap-2.5 p-3 rounded-btn border-2 cursor-pointer font-body transition-all ' +
              (selectedId === s.id
                ? 'border-qcyan bg-qcoop-dim'
                : 'border-transparent bg-qslate/5 hover:bg-qslate/10')
            }
          >
            <span className='text-xl'>{s.avatar}</span>
            <span className='text-sm font-semibold text-qslate'>{s.name}</span>
            {selectedId === s.id && (
              <span className='ml-auto text-qcyan text-xs font-bold'>
                Selected
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Warning */}
      <div className='text-[12px] text-qcoral mb-4'>
        Both must complete before bedtime or neither gets rewards.
      </div>

      {/* Action buttons */}
      <div className='flex gap-3 justify-end'>
        <button
          type='button'
          onClick={onCancel}
          disabled={busy}
          className='bg-qslate-dim text-qslate rounded-badge px-4 py-2.5 text-[13px] font-semibold border-none cursor-pointer font-body disabled:opacity-50'
        >
          Cancel
        </button>
        <button
          type='button'
          onClick={handleSend}
          disabled={!selectedId || busy}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 text-[13px] font-bold border-none cursor-pointer font-body transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FontAwesomeIcon icon={faHandshake} className='mr-1.5' />
          {busy ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </div>
  );
}
