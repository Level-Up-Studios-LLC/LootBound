import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faFire, faPartyHorn, faCheck, faCoins } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV, FA_ICON_STYLE } from '../constants.ts';
import Badge from '../components/Badge.tsx';
import BNav from '../components/BNav.tsx';
import {
  getTaskStatus,
  fmtTime,
  timeToMin,
  getLevelTitle,
  getXpProgress,
  getStreakMultiplier,
  isTaskActiveToday,
} from '../utils.ts';

export default function DashboardScreen(): React.ReactElement | null {
  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const todayTasks = ctx.todayTasks;
  const activeTasks = ctx.activeTasks;
  const tLog = ctx.tLog;
  const bedLock = ctx.bedLock;
  const startCapture = ctx.startCapture;

  if (!ch || !ud) return null;

  const done = activeTasks.filter(t => {
    const l = tLog[t.id];
    return l && !l.rejected && l.status !== 'missed';
  }).length;
  const total = activeTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className='pb-20'>
      <div className='sticky top-0 z-[90] bg-white pl-4 pr-14 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <div className='flex justify-between items-center'>
          <div>
            <div className='font-display text-[22px] font-bold animate-fade-in'>
              Hey {ch.name} {ch.avatar}
            </div>
            <div className='text-[12px] text-qmuted'>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
          <div className='flex items-center gap-1.5 bg-qmint rounded-badge px-3 py-1.5'>
            <FontAwesomeIcon
              icon={faCoins}
              style={FA_ICON_STYLE}
              className='text-sm'
            />
            <span className='font-display text-lg font-bold text-qslate'>
              {(ud.points || 0).toLocaleString()}
            </span>
          </div>
        </div>
        {bedLock && (
          <div
            className='bg-qcoral-dim rounded-badge px-4 py-2.5 mt-3 text-[13px] text-qcoral text-center'
            role='status'
            aria-live='polite'
          >
            <FontAwesomeIcon
              icon={faBed}
              style={FA_ICON_STYLE}
              className='mr-1.5'
            />
            Past{' '}
            {(() => {
              const bt =
                ctx.cfg && ctx.cfg.bedtime != null ? ctx.cfg.bedtime : 21 * 60;
              const h = Math.floor(bt / 60);
              const m = bt % 60;
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = h % 12 || 12;
              return m > 0
                ? `${h12}:${String(m).padStart(2, '0')} ${ampm}`
                : `${h12} ${ampm}`;
            })()}{' '}
            bedtime. Missions are locked for today.
          </div>
        )}
      </div>
      <div className='px-4 pt-4'>
        {(() => {
          const lvl = ud.level || 1;
          const lt = getLevelTitle(lvl);
          const xpProg = getXpProgress(ud.xp || 0, lvl);
          const sMult = getStreakMultiplier(ud.streak || 0);
          return (
            <div className='bg-qmint rounded-btn p-4 mb-5'>
              <div className='flex justify-between items-center mb-2'>
                <div
                  className='font-display font-bold text-sm'
                  style={{ color: lt.color }}
                >
                  Lv.{lvl} {lt.title}
                </div>
                <div className='text-[11px] text-qmuted font-bold'>
                  {lvl >= 20
                    ? 'MAX'
                    : `${xpProg.current} / ${xpProg.needed} XP`}
                </div>
              </div>
              <div className='h-2.5 bg-qmint-dim rounded-sm'>
                <div
                  className='h-full rounded-sm transition-all duration-500'
                  style={{
                    width: `${xpProg.pct}%`,
                    background: ch.color,
                  }}
                />
              </div>
              {sMult > 1 && (
                <div className='text-[11px] text-qmuted mt-1.5 font-semibold'>
                  <FontAwesomeIcon
                    icon={faFire}
                    style={FA_ICON_STYLE}
                    className='mr-1'
                  />
                  {sMult}x XP streak bonus
                </div>
              )}
            </div>
          );
        })()}
        <div className='grid grid-cols-3 gap-3.5 mb-6'>
          <div className='bg-qmint rounded-btn p-4'>
            <div className='font-display text-[22px] font-bold text-qslate'>
              {pct}%
            </div>
            <div className='text-xs text-qmuted'>Today</div>
            <div className='h-1 bg-qmint-dim rounded-sm mt-1.5'>
              <div
                className='h-full rounded-sm transition-all duration-500'
                style={{
                  width: `${pct}%`,
                  background: ch.color,
                }}
              />
            </div>
          </div>
          <div className='bg-qyellow rounded-btn p-4'>
            <div className='font-display text-[22px] font-bold text-qslate animate-float'>
              <FontAwesomeIcon
                icon={faFire}
                style={FA_ICON_STYLE}
                className='mr-1 text-base'
              />
              {ud.streak || 0}
            </div>
            <div className='text-xs text-qmuted'>Streak</div>
            <div className='text-[11px] text-qmuted mt-0.5'>
              Best: {ud.bestStreak || 0}
            </div>
          </div>
          <div className='bg-qmint rounded-btn p-4'>
            <div className='font-display text-[22px] font-bold text-qslate'>
              {done}/{total}
            </div>
            <div className='text-xs text-qmuted'>Done</div>
          </div>
        </div>
        <div className='font-display text-lg font-semibold mb-3 mt-5 text-qslate'>
          Up Next
        </div>
        <div className='flex flex-col gap-3'>
          {todayTasks
            .filter(t => {
              const l = tLog[t.id];
              return !l || l.rejected;
            })
            .sort((a, b) => {
              return timeToMin(a.windowStart) - timeToMin(b.windowStart);
            })
            .slice(0, 4)
            .map((t, idx) => {
              const entry = tLog[t.id];
              const isRej = entry && entry.rejected;
              const isPreview = !isTaskActiveToday(t);
              const status = isPreview
                ? 'upcoming'
                : isRej
                  ? 'rejected'
                  : getTaskStatus(t, null, ctx.cfg ? ctx.cfg.bedtime : undefined);
              const cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
              return (
                <div
                  key={t.id}
                  className={
                    'flex items-center gap-3 rounded-btn p-4 animate-slide-up transition-colors ' +
                    cardBg
                  }
                >
                  <div className='flex-1'>
                    <div className='text-sm font-semibold text-qslate'>
                      {t.name}
                    </div>
                    <div className='text-[11px] text-qmuted'>
                      {fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}
                    </div>
                    {isRej && (
                      <div className='text-[11px] text-qpink'>
                        Parent requested redo
                      </div>
                    )}
                  </div>
                  <Badge status={status} />
                  {!isTaskActiveToday(t) && (
                    <span className='text-[10px] font-bold text-qmuted bg-qslate/10 rounded-badge px-3 py-2'>
                      Tomorrow
                    </span>
                  )}
                  {isTaskActiveToday(t) && status !== 'missed' && (
                    <button
                      onClick={() => {
                        startCapture(t.id);
                      }}
                      className={
                        'text-xs py-2 px-4 rounded-badge cursor-pointer font-body font-bold text-white transition-all hover:scale-105 active:scale-95 border-none ' +
                        (isRej ? 'bg-qcoral' : 'bg-qteal')
                      }
                    >
                      {isRej ? (
                        'Redo'
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCheck} className='mr-1' />
                          Done
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          {activeTasks.filter(t => {
            const l = tLog[t.id];
            return !l || l.rejected;
          }).length === 0 && (
            <div className='text-center p-5 text-qteal font-semibold text-lg animate-confetti'>
              <FontAwesomeIcon
                icon={faPartyHorn}
                style={FA_ICON_STYLE}
                className='mr-2'
              />
              All done for today!
            </div>
          )}
        </div>
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
