import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBed,
  faCalendarDays,
  faStopwatch,
  faCoins,
  faShieldHalved,
  faCommentDots,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { DEF_TIER_CONFIG, TIER_ORDER, TIER_COLORS, DAYS, FA_ICON_STYLE } from '../../constants.ts';
import type { Config, TierConfig } from '../../types.ts';
import FeedbackForm from '../../components/forms/FeedbackForm.tsx';

var SAVE_DELAY = 1500;

export default function SettingsTab(): React.ReactElement {
  var _showFeedback = useState(false),
    showFeedback = _showFeedback[0],
    setShowFeedback = _showFeedback[1];

  var ctx = useAppContext();
  var _local = useState<Config | null>(ctx.cfg),
    local = _local[0],
    setLocal = _local[1];
  var timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var localRef = useRef(local);
  localRef.current = local;

  // Sync from context when cfg changes externally (e.g. real-time listener)
  var ctxCfgRef = useRef(ctx.cfg);
  useEffect(function () {
    if (ctx.cfg !== ctxCfgRef.current) {
      ctxCfgRef.current = ctx.cfg;
      if (!timerRef.current) {
        setLocal(ctx.cfg);
      }
    }
  }, [ctx.cfg]);

  // Flush pending save on unmount
  useEffect(function () {
    return function () {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (localRef.current) {
          ctx.saveCfg(localRef.current).catch(function (err: unknown) {
            console.error('Settings save failed on unmount:', err);
          });
        }
      }
    };
  }, []);

  function update(next: Config) {
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function () {
      timerRef.current = null;
      ctx.saveCfg(next)
        .then(function () {
          ctx.notify('Saved!');
        })
        .catch(function (err: unknown) {
          console.error('Settings save failed:', err);
          ctx.notify('Save failed. Please try again.');
        });
    }, SAVE_DELAY);
  }

  if (!local) {
    return <div className='text-qmuted'>Loading settings...</div>;
  }

  var cfg = local;

  return (
    <div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCoins} style={FA_ICON_STYLE} />
          Tier Coin & XP Values
        </div>
        <div className='flex flex-col gap-3'>
          {TIER_ORDER.map(function (tier) {
            var tc = (cfg.tierConfig || DEF_TIER_CONFIG)[tier] || { coins: 0, xp: 0 };
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
                  aria-label={tier + ' coins'}
                  value={tc.coins}
                  onChange={function (
                    e: React.ChangeEvent<HTMLInputElement>
                  ) {
                    var n: Record<string, TierConfig> = JSON.parse(
                      JSON.stringify(cfg.tierConfig || DEF_TIER_CONFIG)
                    );
                    if (!n[tier]) n[tier] = { coins: 0, xp: 0 };
                    var v = Number(e.target.value);
                    n[tier].coins = Number.isFinite(v) ? Math.max(0, v) : 0;
                    update(Object.assign({}, cfg, { tierConfig: n }));
                  }}
                  className='quest-input !w-[60px] text-center'
                />
                <span className='text-[11px] text-qmuted'>coins</span>
                <input
                  type='number'
                  min={0}
                  aria-label={tier + ' XP'}
                  value={tc.xp}
                  onChange={function (
                    e: React.ChangeEvent<HTMLInputElement>
                  ) {
                    var n: Record<string, TierConfig> = JSON.parse(
                      JSON.stringify(cfg.tierConfig || DEF_TIER_CONFIG)
                    );
                    if (!n[tier]) n[tier] = { coins: 0, xp: 0 };
                    var v = Number(e.target.value);
                    n[tier].xp = Number.isFinite(v) ? Math.max(0, v) : 0;
                    update(Object.assign({}, cfg, { tierConfig: n }));
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
            value={cfg.approvalThreshold || 300}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              update(
                Object.assign({}, cfg, {
                  approvalThreshold: Number(e.target.value) || 0,
                })
              );
            }}
            className='quest-input !w-[100px] text-center'
          />
          <span className='text-[13px] text-qmuted'>coins</span>
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
              var bt = cfg.bedtime != null ? cfg.bedtime : 21 * 60;
              var h = Math.floor(bt / 60);
              var m = bt % 60;
              return (
                String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
              );
            })()}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              var parts = e.target.value.split(':').map(Number);
              var mins = parts[0] * 60 + parts[1];
              update(Object.assign({}, cfg, { bedtime: mins }));
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
            value={cfg.weeklyResetDay != null ? cfg.weeklyResetDay : 0}
            onChange={function (e: React.ChangeEvent<HTMLSelectElement>) {
              update(
                Object.assign({}, cfg, {
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
            value={cfg.cooldown != null ? cfg.cooldown : 60}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              update(
                Object.assign({}, cfg, {
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
    </div>
  );
}
