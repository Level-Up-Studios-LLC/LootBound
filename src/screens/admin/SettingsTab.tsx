import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBed,
  faCalendarDays,
  faStopwatch,
  faCoins,
  faShieldHalved,
  faTriangleExclamation,
  faRotate,
  faFloppyDisk,
  faKey,
  faCommentDots,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { DEF_TIER_CONFIG, TIER_ORDER, TIER_COLORS, DAYS, FA_ICON_STYLE } from '../../constants.ts';
import type { TierConfig } from '../../types.ts';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';
import FeedbackForm from '../../components/forms/FeedbackForm.tsx';

export default function SettingsTab(): React.ReactElement {
  var _newPin = useState<string>(''),
    newPin = _newPin[0],
    setNewPin = _newPin[1];
  var _showResetConfirm = useState(false),
    showResetConfirm = _showResetConfirm[0],
    setShowResetConfirm = _showResetConfirm[1];
  var _showFeedback = useState(false),
    showFeedback = _showFeedback[0],
    setShowFeedback = _showFeedback[1];

  var ctx = useAppContext();
  var cfg = ctx.cfg;

  return (
    <div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCoins} style={FA_ICON_STYLE} />
          Tier Coin & XP Values
        </div>
        <div className='flex flex-col gap-3'>
          {TIER_ORDER.map(function (tier) {
            var tc = ctx.tierCfg(tier);
            return (
              <div key={tier} className='flex items-center gap-2'>
                <span
                  className='text-[13px] font-bold min-w-[32px] text-center'
                  style={{ color: TIER_COLORS[tier] || '#6b7280' }}
                >
                  {tier}
                </span>
                <input
                  type='number'
                  min={0}
                  value={tc.coins}
                  onChange={function (
                    e: React.ChangeEvent<HTMLInputElement>
                  ) {
                    var n: Record<string, TierConfig> = JSON.parse(
                      JSON.stringify(cfg!.tierConfig || DEF_TIER_CONFIG)
                    );
                    if (!n[tier]) n[tier] = { coins: 0, xp: 0 };
                    n[tier].coins = Math.max(0, Number(e.target.value) || 0);
                    ctx.saveCfg(Object.assign({}, cfg!, { tierConfig: n }));
                  }}
                  className='quest-input !w-[60px] text-center'
                />
                <span className='text-[11px] text-qmuted'>coins</span>
                <input
                  type='number'
                  min={0}
                  value={tc.xp}
                  onChange={function (
                    e: React.ChangeEvent<HTMLInputElement>
                  ) {
                    var n: Record<string, TierConfig> = JSON.parse(
                      JSON.stringify(cfg!.tierConfig || DEF_TIER_CONFIG)
                    );
                    if (!n[tier]) n[tier] = { coins: 0, xp: 0 };
                    n[tier].xp = Math.max(0, Number(e.target.value) || 0);
                    ctx.saveCfg(Object.assign({}, cfg!, { tierConfig: n }));
                  }}
                  className='quest-input !w-[60px] text-center'
                />
                <span className='text-[11px] text-qmuted'>XP</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faShieldHalved} style={FA_ICON_STYLE} />
          Approval Threshold
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Loot costing this or more needs approval.
        </div>
        <div className='flex gap-3 items-center'>
          <input
            type='number'
            value={cfg!.approvalThreshold || 300}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              ctx.saveCfg(
                Object.assign({}, cfg!, {
                  approvalThreshold: Number(e.target.value) || 0,
                })
              );
            }}
            className='quest-input !w-[100px] text-center'
          />
          <span className='text-[13px] text-qmuted'>coins</span>
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faKey} style={FA_ICON_STYLE} />
          Parent PIN
        </div>
        {(!cfg!.parentPin || cfg!.parentPin === '1234') && (
          <div className='text-[13px] text-qslate mb-2 px-4 py-3 bg-qcoral-dim rounded-badge leading-relaxed'>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className='mr-1.5'
              style={FA_ICON_STYLE}
            />
            You don't have a PIN set. Without a PIN, you'll need to enter your
            password every time you open the app. Set one below for quick
            access.
          </div>
        )}
        <div className='flex gap-3'>
          <input
            type='password'
            maxLength={6}
            placeholder='New PIN'
            value={newPin}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setNewPin(e.target.value);
            }}
            className='quest-input !w-[120px] text-center'
          />
          <button
            onClick={function () {
              if (newPin.length >= 4) {
                ctx.saveCfg(Object.assign({}, cfg!, { parentPin: newPin }));
                setNewPin('');
                ctx.notify('PIN updated');
              }
            }}
            className='bg-qteal text-white rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body flex items-center gap-1.5'
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            Save
          </button>
        </div>
      </div>
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faBed} style={FA_ICON_STYLE} />
          Bedtime Cutoff
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Missions lock after this time. Incomplete missions are marked as
          missed.
        </div>
        <div className='flex gap-3 items-center'>
          <input
            type='time'
            value={(function () {
              var bt = cfg!.bedtime != null ? cfg!.bedtime : 21 * 60;
              var h = Math.floor(bt / 60);
              var m = bt % 60;
              return (
                String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
              );
            })()}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              var parts = e.target.value.split(':').map(Number);
              var mins = parts[0] * 60 + parts[1];
              ctx.saveCfg(Object.assign({}, cfg!, { bedtime: mins }));
            }}
            className='quest-input !w-[140px]'
          />
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCalendarDays} style={FA_ICON_STYLE} />
          Weekly Reset
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          All mission logs clear on this day. Coins and streaks carry over.
        </div>
        <div className='flex gap-3 items-center'>
          <select
            value={cfg!.weeklyResetDay != null ? cfg!.weeklyResetDay : 0}
            onChange={function (e: React.ChangeEvent<HTMLSelectElement>) {
              ctx.saveCfg(
                Object.assign({}, cfg!, {
                  weeklyResetDay: Number(e.target.value),
                })
              );
            }}
            className='quest-input !w-[140px]'
          >
            {DAYS.map(function (dayName, i) {
              return (
                <option key={i} value={i}>
                  {dayName}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faStopwatch} style={FA_ICON_STYLE} />
          Mission Cooldown
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Minimum seconds between completing missions. Prevents rapid-fire spam.
        </div>
        <div className='flex gap-3 items-center'>
          <input
            type='number'
            value={cfg!.cooldown != null ? cfg!.cooldown : 60}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              ctx.saveCfg(
                Object.assign({}, cfg!, {
                  cooldown: Number(e.target.value) || 0,
                })
              );
            }}
            className='quest-input !w-[100px] text-center'
          />
          <span className='text-[13px] text-qmuted'>seconds</span>
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='text-xs text-qmuted'>
          Missions are recurring. Daily repeats every day, weekly on assigned
          day.
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCommentDots} style={FA_ICON_STYLE} />
          Send Feedback
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Found a bug or have an idea? Let us know!
        </div>
        <button
          onClick={function () {
            setShowFeedback(true);
          }}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Send Feedback
        </button>
      </div>
      {showFeedback && (
        <FeedbackForm
          familyId={ctx.familyId}
          userRole='parent'
          userName='Parent'
          onClose={function () {
            setShowFeedback(false);
          }}
          onSuccess={function () {
            setShowFeedback(false);
            ctx.notify('Feedback sent! Thank you.');
          }}
        />
      )}
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faRotate} style={FA_ICON_STYLE} />
          Reset All Data
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Clears all coins, streaks, and history for all children.
        </div>
        <button
          onClick={function () {
            setShowResetConfirm(true);
          }}
          className='bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Reset Everything
        </button>
      </div>
      {showResetConfirm && (
        <ConfirmDialog
          title='Reset All Data?'
          message='This will permanently erase all coins, streaks, mission history, redemption logs, and uploaded photos for every child. Tasks, rewards, and children profiles will remain.'
          warning='This action cannot be undone.'
          confirmLabel='Yes, Reset Everything'
          confirmColor='bg-qcoral'
          onConfirm={function () {
            setShowResetConfirm(false);
            ctx.resetAll();
          }}
          onCancel={function () {
            setShowResetConfirm(false);
          }}
        />
      )}
    </div>
  );
}
