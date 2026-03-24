import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Sentry from '@sentry/react';
import {
  faBed,
  faCalendarDays,
  faStopwatch,
  faCoins,
  faShieldHalved,
  faCommentDots,
  faArrowUpRightFromSquare,
  faBell,
  faVolumeHigh,
  faBug,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import {
  DEF_TIER_CONFIG,
  DEF_NOTIFICATION_PREFS,
  TIER_ORDER,
  TIER_COLORS,
  DAYS,
  FA_ICON_STYLE,
  FEEDBACK_URL,
} from '../../constants.ts';
import { getPersistentStorage, setPersistentStorage } from '../../services/platform.ts';
import type { Config, TierConfig, NotificationPrefs } from '../../types.ts';

const SAVE_DELAY = 1500;

function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SettingsTab(): React.ReactElement {
  const ctx = useAppContext();
  const [local, setLocal] = useState<Config | null>(ctx.cfg);
  const [sentryEnabled, setSentryEnabled] = useState(true);
  const applySentryEnabled = (enabled: boolean) => {
    const client = Sentry.getClient();
    if (client) client.getOptions().enabled = enabled;
  };
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRef = useRef(local);
  localRef.current = local;

  // Load Sentry preference and apply to runtime client
  useEffect(() => {
    let cancelled = false;
    getPersistentStorage('lootbound-sentry-enabled').then((val) => {
      if (cancelled) return;
      const enabled = val !== 'false';
      setSentryEnabled(enabled);
      applySentryEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync from context when cfg changes externally (e.g. real-time listener)
  const ctxCfgRef = useRef(ctx.cfg);
  useEffect(() => {
    if (ctx.cfg !== ctxCfgRef.current) {
      ctxCfgRef.current = ctx.cfg;
      if (!timerRef.current) {
        setLocal(ctx.cfg);
      }
    }
  }, [ctx.cfg]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (localRef.current) {
          ctx.saveCfg(localRef.current).catch((err: unknown) => {
            console.error('Settings save failed on unmount:', err);
            Sentry.captureException(err, { tags: { action: 'save-settings-unmount' } });
          });
        }
      }
    };
  }, []);

  const update = (next: Config) => {
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      ctx
        .saveCfg(next)
        .then(() => {
          ctx.notify('Saved!');
        })
        .catch((err: unknown) => {
          console.error('Settings save failed:', err);
          Sentry.captureException(err, { tags: { action: 'save-settings' } });
          ctx.notify('Save failed. Please try again.');
        });
    }, SAVE_DELAY);
  };

  if (!local) {
    return <div className='text-qmuted'>Loading settings...</div>;
  }

  const cfg = local;

  return (
    <div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCoins} style={FA_ICON_STYLE} />
          Tier Coin & XP Values
        </div>
        <div className='flex flex-col gap-3'>
          {TIER_ORDER.map(tier => {
            const tc = (cfg.tierConfig || DEF_TIER_CONFIG)[tier] || {
              coins: 0,
              xp: 0,
            };
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
                  aria-label={`${tier} coins`}
                  placeholder='0'
                  value={tc.coins || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const n: Record<string, TierConfig> = structuredClone(
                      cfg.tierConfig || DEF_TIER_CONFIG
                    );
                    if (!n[tier]) n[tier] = { coins: 0, xp: 0 };
                    const v = e.target.value === '' ? 0 : Number(e.target.value);
                    n[tier].coins = Number.isFinite(v) ? Math.max(0, v) : 0;
                    update({ ...cfg, tierConfig: n });
                  }}
                  className='quest-input w-[72px]! text-center'
                />
                <span className='text-[11px] text-qmuted'>coins</span>
                <input
                  type='number'
                  min={0}
                  aria-label={`${tier} XP`}
                  placeholder='0'
                  value={tc.xp || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const n: Record<string, TierConfig> = structuredClone(
                      cfg.tierConfig || DEF_TIER_CONFIG
                    );
                    if (!n[tier]) n[tier] = { coins: 0, xp: 0 };
                    const v = e.target.value === '' ? 0 : Number(e.target.value);
                    n[tier].xp = Number.isFinite(v) ? Math.max(0, v) : 0;
                    update({ ...cfg, tierConfig: n });
                  }}
                  className='quest-input w-[72px]! text-center'
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
            min={0}
            aria-label='Approval threshold coins'
            placeholder='0'
            value={cfg.approvalThreshold || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value === '' ? 0 : Number(e.target.value);
              update({
                ...cfg,
                approvalThreshold: Number.isFinite(v) ? Math.max(0, v) : 0,
              });
            }}
            className='quest-input w-[100px]! text-center'
          />
          <span className='text-[13px] text-qmuted'>coins</span>
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
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
            aria-label='Bedtime cutoff'
            value={formatMinutesToTime(cfg.bedtime ?? 21 * 60)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (!e.target.value) return;
              const parts = e.target.value.split(':').map(Number);
              if (
                parts.length < 2 ||
                !Number.isFinite(parts[0]) ||
                !Number.isFinite(parts[1])
              )
                return;
              const mins = parts[0] * 60 + parts[1];
              update({ ...cfg, bedtime: mins });
            }}
            className='quest-input w-[140px]!'
          />
        </div>
      </div>
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCalendarDays} style={FA_ICON_STYLE} />
          Weekly Reset
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          All mission logs clear on this day. Coins and streaks carry over.
        </div>
        <div className='flex gap-3 items-center'>
          <select
            aria-label='Weekly reset day'
            value={cfg.weeklyResetDay != null ? cfg.weeklyResetDay : 0}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              update({
                ...cfg,
                weeklyResetDay: Number(e.target.value),
              });
            }}
            className='quest-input w-[140px]!'
          >
            {DAYS.map((dayName, i) => {
              return (
                <option key={i} value={i}>
                  {dayName}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
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
            min={0}
            aria-label='Mission cooldown seconds'
            placeholder='0'
            value={cfg.cooldown || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value === '' ? 0 : Number(e.target.value);
              update({
                ...cfg,
                cooldown: Number.isFinite(v) ? Math.max(0, v) : 0,
              });
            }}
            className='quest-input w-[100px]! text-center'
          />
          <span className='text-[13px] text-qmuted'>seconds</span>
        </div>
      </div>
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faBell} style={FA_ICON_STYLE} />
          Notifications
        </div>
        <div className='text-[13px] text-qmuted mb-3'>
          Control which notifications play sounds.
        </div>
        <div className='flex flex-col gap-2'>
          {(() => {
            const prefs: NotificationPrefs =
              cfg.notificationPrefs || DEF_NOTIFICATION_PREFS;
            const togglePref = (key: keyof NotificationPrefs) => {
              const next = structuredClone(prefs);
              (next as any)[key] = !(next as any)[key];
              update({ ...cfg, notificationPrefs: next });
            };
            const items: [keyof NotificationPrefs, string][] = [
              ['soundEnabled', 'Sound Effects'],
              ['missionComplete', 'Mission Complete'],
              ['missionRejected', 'Mission Rejected'],
              ['lootRequest', 'Loot Requests'],
              ['lootApproved', 'Loot Approved'],
              ['lootDenied', 'Loot Denied'],
              ['levelUp', 'Level Up'],
              ['streak', 'Streak Milestones'],
            ];
            return items.map(([key, label]) => {
              const isMain = key === 'soundEnabled';
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between py-1.5${isMain ? ' border-b border-qborder pb-2.5 mb-1' : ''}`}
                >
                  <span
                    className={`text-[13px]${isMain ? ' font-bold text-qslate flex items-center gap-1.5' : ' text-qmuted pl-1'}`}
                  >
                    {isMain && (
                      <FontAwesomeIcon
                        icon={faVolumeHigh}
                        style={FA_ICON_STYLE}
                        className='text-xs'
                      />
                    )}
                    {label}
                  </span>
                  <input
                    type='checkbox'
                    checked={!!prefs[key]}
                    onChange={() => {
                      togglePref(key);
                    }}
                    disabled={!isMain && !prefs.soundEnabled}
                    className='w-[18px] h-[18px] accent-qteal cursor-pointer'
                  />
                </label>
              );
            });
          })()}
        </div>
      </div>
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='text-xs text-qmuted'>
          Missions are recurring. Daily repeats every day, weekly on assigned
          day.
        </div>
      </div>
      {/* Error Reporting */}
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faBug} style={FA_ICON_STYLE} />
          Error Reporting
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Help us improve LootBound by automatically reporting errors.
          No personal data is collected.
        </div>
        <label className='flex items-center gap-3 cursor-pointer'>
          <input
            type='checkbox'
            checked={sentryEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              setSentryEnabled(enabled);
              applySentryEnabled(enabled);
              void setPersistentStorage(
                'lootbound-sentry-enabled',
                enabled ? 'true' : 'false'
              );
              ctx.notify(enabled ? 'Error reporting enabled' : 'Error reporting disabled');
            }}
            className='w-5 h-5 accent-qteal'
          />
          <span className='text-sm text-qslate font-semibold'>
            Send anonymous error reports
          </span>
        </label>
      </div>

      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCommentDots} style={FA_ICON_STYLE} />
          Feedback
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Found a bug or have an idea? Share feedback, request features, and
          vote on ideas.
        </div>
        <a
          href={FEEDBACK_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body no-underline'
        >
          Give Feedback
          <FontAwesomeIcon
            icon={faArrowUpRightFromSquare}
            className='text-xs'
          />
        </a>
      </div>
    </div>
  );
}
