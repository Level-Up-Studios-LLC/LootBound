import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrashCan } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { altBg } from '../../constants.ts';
import Modal from '../../components/ui/Modal.tsx';
import RewardForm from '../../components/forms/RewardForm.tsx';
import type { Reward } from '../../types.ts';

var SAMPLE_REWARDS = [
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
  var _addReward = useState<Reward | null>(null),
    addReward = _addReward[0],
    setAddReward = _addReward[1];
  var _editReward = useState<Reward | null>(null),
    editReward = _editReward[0],
    setEditReward = _editReward[1];

  var ctx = useAppContext();
  var cfg = ctx.cfg;
  var rewards = cfg!.rewards || [];

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Loot is what children can spend their earned coins on. Set a coin cost,
        limit how often each item can be redeemed, and flag high-value loot for
        parent approval.
      </div>
      {rewards.length === 0 && (
        <div className='text-center py-5 mb-4'>
          <div className='text-[13px] text-qmuted mb-3'>
            No loot yet. Add some below, or start with these samples:
          </div>
          <button
            onClick={function () {
              var newRewards = SAMPLE_REWARDS.map(function (r) {
                return Object.assign({}, r, {
                  id:
                    'r' +
                    Date.now() +
                    Math.random().toString(36).substring(2, 5),
                });
              });
              ctx.saveCfg(
                Object.assign({}, cfg!, { rewards: newRewards })
              );
            }}
            className='bg-qteal text-white rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
          >
            Add 5 Sample Loot Items
          </button>
        </div>
      )}
      <div className='flex justify-between items-center mb-3'>
        <span className='font-bold text-qslate'>Loot Catalog</span>
        <button
          onClick={function () {
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
      {rewards.map(function (r, ri) {
        var ll =
          r.limitType === 'daily'
            ? r.limitMax + '/day'
            : r.limitType === 'weekly'
              ? r.limitMax + '/wk'
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
                onClick={function () {
                  ctx.saveCfg(
                    Object.assign({}, cfg!, {
                      rewards: rewards.map(function (x) {
                        return x.id === r.id
                          ? Object.assign({}, x, { active: !x.active })
                          : x;
                      }),
                    })
                  );
                }}
                className={
                  'rounded-[6px] px-3 py-1.5 text-xs font-semibold border-none cursor-pointer font-body ' +
                  (r.active
                    ? 'bg-qteal text-white'
                    : 'bg-qcoral text-white')
                }
              >
                {r.active ? 'On' : 'Off'}
              </button>
              <button
                onClick={function () {
                  setEditReward(Object.assign({}, r));
                }}
                className='bg-qblue-dim text-qblue rounded-[6px] px-3 py-1.5 text-xs font-semibold border-none cursor-pointer font-body flex items-center gap-1'
              >
                <FontAwesomeIcon icon={faPenToSquare} />
                Edit
              </button>
              <button
                onClick={function () {
                  ctx.saveCfg(
                    Object.assign({}, cfg!, {
                      rewards: rewards.filter(function (x) {
                        return x.id !== r.id;
                      }),
                    })
                  );
                }}
                className='bg-qred-dim text-qred rounded-[6px] px-3 py-1.5 text-xs font-bold border-none cursor-pointer font-body flex items-center gap-1'
              >
                <FontAwesomeIcon icon={faTrashCan} />
                <span className='sr-only'>Delete</span>
              </button>
            </div>
          </div>
        );
      })}
      {(addReward || editReward) && (
        <Modal title={editReward ? 'Edit Loot' : 'Add Loot'}>
          <RewardForm
            reward={(editReward || addReward)!}
            onSave={function (r) {
              if (editReward) {
                ctx.saveCfg(
                  Object.assign({}, cfg!, {
                    rewards: (cfg!.rewards || []).map(function (x) {
                      return x.id === r.id ? r : x;
                    }),
                  })
                );
              } else {
                ctx.saveCfg(
                  Object.assign({}, cfg!, {
                    rewards: (cfg!.rewards || []).concat([
                      Object.assign({}, r, {
                        id: 'r' + Date.now(),
                        active: true,
                      }),
                    ]),
                  })
                );
              }
              setAddReward(null);
              setEditReward(null);
            }}
            onCancel={function () {
              setAddReward(null);
              setEditReward(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
