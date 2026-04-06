import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrashCan, faGift } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { getCurrentUid } from '../../services/auth.ts';
import { altBg } from '../../constants.ts';
import Modal from '../../components/ui/Modal.tsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';
import EmptyState from '../../components/ui/EmptyState.tsx';
import RewardForm from '../../components/forms/RewardForm.tsx';
import type { Reward } from '../../types.ts';

function getSkipKey() {
  return `lb-skip-delete-loot:${getCurrentUid() || 'anon'}`;
}

const SAMPLE_REWARDS = [
  {
    id: 'sample1',
    name: '15 min extra screen time',
    cost: 50,
    icon: '\u{1F4F1}',
    active: true,
    limitType: 'daily',
    limitMax: 2,
    requireApproval: false,
  },
  {
    id: 'sample2',
    name: "Pick what's for dinner",
    cost: 100,
    icon: '\u{1F355}',
    active: true,
    limitType: 'daily',
    limitMax: 1,
    requireApproval: false,
  },
  {
    id: 'sample3',
    name: 'Small toy or treat ($5)',
    cost: 150,
    icon: '\u{1F381}',
    active: true,
    limitType: 'weekly',
    limitMax: 2,
    requireApproval: false,
  },
  {
    id: 'sample4',
    name: 'Movie night pick',
    cost: 200,
    icon: '\u{1F3AC}',
    active: true,
    limitType: 'weekly',
    limitMax: 1,
    requireApproval: false,
  },
  {
    id: 'sample5',
    name: 'Stay up 30 min late',
    cost: 250,
    icon: '\u{1F319}',
    active: true,
    limitType: 'daily',
    limitMax: 1,
    requireApproval: false,
  },
];

export default function RewardsTab(): React.ReactElement {
  const [addReward, setAddReward] = useState<Reward | null>(null);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [deleteReward, setDeleteReward] = useState<Reward | null>(null);

  const ctx = useAppContext();
  const cfg = ctx.cfg;
  if (!cfg) return <div />;
  const rewards = cfg.rewards || [];

  const removeReward = (rewardId: string) => {
    ctx.saveCfg({ ...cfg, rewards: rewards.filter(x => x.id !== rewardId) });
  };

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Loot is what children can spend their earned coins on. Set a coin cost,
        limit how often each item can be redeemed, and flag high-value loot for
        parent approval.
      </div>
      {rewards.length === 0 && (
        <EmptyState
          icon={faGift}
          title='No loot yet'
          description='Add loot items that children can spend their earned coins on, or start with some samples.'
          ctaText='Add 5 Sample Loot Items'
          onCta={() => {
            const newRewards = SAMPLE_REWARDS.map(r => {
              return {
                ...r,
                id:
                  'r' + Date.now() + Math.random().toString(36).substring(2, 5),
              };
            });
            ctx.saveCfg({ ...cfg!, rewards: newRewards });
          }}
        />
      )}
      <div className='flex justify-between items-center mb-3'>
        <span className='font-bold text-qslate'>Loot Catalog</span>
        <button
          onClick={() => {
            setAddReward({
              id: '',
              name: '',
              cost: 50,
              icon: '\u{1F381}',
              active: true,
              limitType: 'none',
              limitMax: 0,
              requireApproval: false,
            });
          }}
          className='bg-qmint text-qslate rounded-badge px-4 py-2 text-[13px] font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
        >
          <FontAwesomeIcon icon={faPlus} />
          Add
        </button>
      </div>
      {rewards.map((r, ri) => {
        const ll =
          r.limitType === 'daily'
            ? `${r.limitMax}/day`
            : r.limitType === 'weekly'
              ? `${r.limitMax}/wk`
              : 'No limit';
        return (
          <div
            key={r.id}
            className={
              altBg(ri) +
              ' flex justify-between items-center rounded-badge px-4 py-3 mb-3'
            }
          >
            <div>
              <span className='text-lg'>{r.icon}</span>
              <span className='font-semibold ml-2 text-qslate'>{r.name}</span>
              <div className='text-[11px] text-qmuted'>
                {r.cost} coins | {ll}
                {r.requireApproval ? ' | Approval req.' : ''}
              </div>
            </div>
            <div className='flex gap-1.5'>
              <button
                onClick={() => {
                  ctx.saveCfg({
                    ...cfg!,
                    rewards: rewards.map(x => {
                      return x.id === r.id ? { ...x, active: !x.active } : x;
                    }),
                  });
                }}
                className={
                  'rounded-[6px] px-3 py-1.5 text-xs font-semibold border-none cursor-pointer font-body ' +
                  (r.active ? 'bg-qteal text-white' : 'bg-qcoral text-white')
                }
              >
                {r.active ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => {
                  setEditReward({ ...r });
                }}
                className='bg-qblue-dim text-qblue rounded-[6px] px-3 py-1.5 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1'
              >
                <FontAwesomeIcon icon={faPenToSquare} />
                <span className='sr-only'>Edit {r.name}</span>
              </button>
              <button
                onClick={() => {
                  try {
                    if (localStorage.getItem(getSkipKey()) === '1') {
                      removeReward(r.id);
                      return;
                    }
                  } catch (_e) {}
                  setDeleteReward(r);
                }}
                className='bg-qred-dim text-qred rounded-[6px] px-3 py-1.5 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1'
              >
                <FontAwesomeIcon icon={faTrashCan} />
                <span className='sr-only'>Delete {r.name}</span>
              </button>
            </div>
          </div>
        );
      })}
      {(addReward || editReward) && (
        <Modal
          title={editReward ? 'Edit Loot' : 'Add Loot'}
          onClose={() => {
            setAddReward(null);
            setEditReward(null);
          }}
        >
          <RewardForm
            reward={(editReward || addReward)!}
            onSave={r => {
              if (editReward) {
                ctx.saveCfg({
                  ...cfg!,
                  rewards: (cfg!.rewards || []).map(x => {
                    return x.id === r.id ? r : x;
                  }),
                });
              } else {
                ctx.saveCfg({
                  ...cfg!,
                  rewards: (cfg!.rewards || []).concat([
                    {
                      ...r,
                      id: 'r' + Date.now(),
                      active: true,
                    },
                  ]),
                });
              }
              setAddReward(null);
              setEditReward(null);
            }}
            onCancel={() => {
              setAddReward(null);
              setEditReward(null);
            }}
          />
        </Modal>
      )}

      {deleteReward && (
        <ConfirmDialog
          title={`Delete "${deleteReward.name}"?`}
          message='This loot item will be permanently removed.'
          confirmLabel='Delete'
          dontAskAgainKey={getSkipKey()}
          onConfirm={() => {
            removeReward(deleteReward.id);
            setDeleteReward(null);
          }}
          onCancel={() => setDeleteReward(null)}
        />
      )}
    </div>
  );
}
