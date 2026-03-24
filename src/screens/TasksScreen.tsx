import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faCamera, faGamepadModern } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import {
  KID_NAV,
  SL,
  DAYS_SHORT,
  TIER_COLORS,
  FA_ICON_STYLE,
} from '../constants.ts';
import Badge from '../components/Badge.tsx';
import BNav from '../components/BNav.tsx';
import EmptyState from '../components/ui/EmptyState.tsx';
import { getTaskStatus, fmtTime, timeToMin, isTaskActiveToday, isTaskPreview } from '../utils.ts';

export default function TasksScreen(): React.ReactElement | null {
  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const todayTasks = ctx.todayTasks;
  const tLog = ctx.tLog;
  const bedLock = ctx.bedLock;
  const startCapture = ctx.startCapture;
  const setViewPhoto = ctx.setViewPhoto;
  const tp = ctx.tp;
  const tierCfgFn = ctx.tierCfg;

  if (!ch || !ud) return null;

  const sorted = todayTasks.slice().sort((a, b) => {
    const al = tLog[a.id],
      bl = tLog[b.id];
    const ac = al && !al.rejected && al.status !== 'missed',
      bc = bl && !bl.rejected && bl.status !== 'missed';
    if (ac !== bc) return ac ? 1 : -1;
    return timeToMin(a.windowStart) - timeToMin(b.windowStart);
  });

  return (
    <div className='pb-20'>
      <div className='sticky top-0 z-[90] bg-white pl-4 pr-14 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <div className='font-display text-2xl font-bold text-qslate'>
          Today's Missions
        </div>
        {bedLock && (
          <div className='bg-qcoral-dim rounded-badge px-4 py-2.5 mt-3 text-[13px] text-qcoral text-center'>
            <FontAwesomeIcon
              icon={faBed}
              style={FA_ICON_STYLE}
              className='mr-1.5'
            />
            Bedtime cutoff passed. Incomplete missions marked as missed.
          </div>
        )}
      </div>
      <div className='px-4 pt-3 flex flex-col gap-3'>
        {todayTasks.length === 0 && (
          <EmptyState
            icon={faGamepadModern}
            title='No missions today!'
            description='Enjoy your free time. Check back tomorrow for new missions!'
          />
        )}
        {sorted.map((t, idx) => {
          const entry = tLog[t.id];
          const isRej = entry && entry.rejected;
          const isDone = entry && !entry.rejected && entry.status !== 'missed';
          const isMissed =
            entry && entry.status === 'missed' && !entry.rejected;
          const isPreview = !isTaskActiveToday(t);
          const status = isPreview
            ? 'upcoming'
            : isDone
              ? entry.status
              : isMissed
                ? 'missed'
                : isRej
                  ? 'rejected'
                  : getTaskStatus(t, null, ctx.cfg ? ctx.cfg.bedtime : undefined);
          const sl = SL[status] || {
            text: '',
            color: '#64748b',
            bg: 'transparent',
          };
          const coins = isDone
            ? entry.points
            : isMissed
              ? entry.points
              : tp(t.tier);
          const xpVal = isDone
            ? entry.xp || 0
            : isMissed
              ? 0
              : tierCfgFn(t.tier).xp;

          let animClass = '';
          if (isDone) {
            if (status === 'early') animClass = 'animate-confetti';
            else if (status === 'ontime') animClass = 'animate-check';
            else animClass = 'animate-shake';
          }

          const cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          const dimBg = idx % 2 === 0 ? 'bg-qmint-dim' : 'bg-qyellow-dim';

          return (
            <div
              key={t.id}
              className={
                (isDone || isMissed ? dimBg : cardBg) +
                ' rounded-btn p-4 transition-all ' +
                animClass
              }
              style={{ borderLeft: `3px solid ${sl.color}` }}
            >
              <div className='flex justify-between items-start'>
                <div>
                  <div
                    className={
                      'text-sm font-semibold text-qslate flex items-center gap-1.5' +
                      (isDone ? ' line-through' : '')
                    }
                  >
                    <span
                      className='text-[10px] font-bold px-1.5 py-0.5 rounded-badge'
                      style={{
                        color: TIER_COLORS[t.tier] || '#6b7280',
                        background: (TIER_COLORS[t.tier] || '#6b7280') + '18',
                      }}
                    >
                      {t.tier}
                    </span>
                    {t.name}
                  </div>
                  <div className='text-[11px] text-qmuted'>
                    {fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}
                    {!t.daily && t.dueDay != null
                      ? ` | ${DAYS_SHORT[t.dueDay]}`
                      : ''}
                  </div>
                  {isRej && (
                    <div className='text-[11px] text-qpink mt-0.5'>
                      Parent requested redo
                    </div>
                  )}
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <Badge status={status} />
                  <div className='text-sm font-bold font-display text-qslate'>
                    {isDone || isMissed
                      ? coins > 0
                        ? `+${coins}`
                        : coins
                      : tp(t.tier)}{' '}
                    coins
                  </div>
                  <div className='text-[10px] text-qmuted font-semibold'>
                    {isDone
                      ? `+${xpVal} XP`
                      : isMissed
                        ? '0 XP'
                        : `${xpVal} XP`}
                  </div>
                </div>
              </div>
              {isDone && entry.photo && (
                <button
                  onClick={() => {
                    setViewPhoto(entry.photo);
                  }}
                  className='text-[11px] text-qteal bg-transparent border-none cursor-pointer font-body mt-1 hover:underline'
                >
                  View photo proof
                </button>
              )}
              {isPreview && !isDone && !isMissed && (
                <div className='w-full text-center text-[12px] font-bold text-qmuted bg-qslate/10 rounded-badge py-2.5 mt-3'>
                  Tomorrow's Mission
                </div>
              )}
              {!isPreview && (isDone || isMissed) && isTaskPreview(t, ctx.cfg?.bedtime) && (
                <div className='text-[11px] text-qmuted text-center mt-2'>
                  Repeats tomorrow
                </div>
              )}
              {!isPreview && !isDone && !isMissed && status !== 'missed' && (
                <button
                  onClick={() => {
                    startCapture(t.id);
                  }}
                  className={
                    'w-full text-white rounded-badge py-2.5 text-[13px] font-bold mt-3 border-none cursor-pointer font-body transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] ' +
                    (isRej
                      ? 'bg-qcoral'
                      : status === 'active'
                        ? 'bg-qteal'
                        : status === 'upcoming'
                          ? 'bg-qpurple'
                          : 'bg-qorange')
                  }
                >
                  <FontAwesomeIcon icon={faCamera} className='mr-1.5' />
                  {isRej
                    ? 'Redo + Photo'
                    : status === 'upcoming'
                      ? 'Early (+25%) + Photo'
                      : status === 'overdue'
                        ? 'Late (50%) + Photo'
                        : 'Complete + Photo'}
                </button>
              )}
              {isDone && (
                <div className='text-xs mt-1.5' style={{ color: sl.color }}>
                  {status === 'early'
                    ? 'Early! Bonus coins.'
                    : status === 'ontime'
                      ? 'On time. Full coins.'
                      : 'Late. Half coins.'}
                </div>
              )}
              {isMissed && (
                <div className='text-xs mt-1.5 text-qred'>
                  Missed. Coins deducted.
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
