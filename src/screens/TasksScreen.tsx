import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faCamera, faChevronRight, faGamepadModern } from '../fa.ts';
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
import { getTaskStatus, fmtTime, timeToMin } from '../utils.ts';

export default function TasksScreen(): React.ReactElement | null {
  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const activeTasks = ctx.activeTasks;
  const tomorrowTasks = ctx.tomorrowTasks;
  const tLog = ctx.tLog;
  const bedLock = ctx.bedLock;
  const startCapture = ctx.startCapture;
  const setViewPhoto = ctx.setViewPhoto;
  const tp = ctx.tp;
  const tierCfgFn = ctx.tierCfg;
  const [previewOpen, setPreviewOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLSpanElement>(null);
  const tomorrowRef = useRef<HTMLDivElement>(null);

  if (!ch || !ud) return null;

  const sorted = activeTasks.slice().sort((a, b) => {
    const al = tLog[a.id],
      bl = tLog[b.id];
    const ac = al && !al.rejected && al.status !== 'missed',
      bc = bl && !bl.rejected && bl.status !== 'missed';
    if (ac !== bc) return ac ? 1 : -1;
    return timeToMin(a.windowStart) - timeToMin(b.windowStart);
  });

  const sortedTomorrow = tomorrowTasks
    .slice()
    .sort((a, b) => timeToMin(a.windowStart) - timeToMin(b.windowStart));

  // Entrance animations
  useGSAP(() => {
    gsap.from('.task-card', {
      opacity: 0, y: 16, duration: 0.35, stagger: 0.06, ease: 'power2.out',
    });
  }, { scope: containerRef });

  // Chevron + tomorrow preview toggle
  const togglePreview = () => {
    const opening = !previewOpen;
    setPreviewOpen(opening);
    if (chevronRef.current) {
      gsap.to(chevronRef.current, { rotation: opening ? 90 : 0, duration: 0.25, ease: 'power2.out' });
    }
    if (opening) {
      // Animate tomorrow cards after state update renders them
      requestAnimationFrame(() => {
        if (tomorrowRef.current) {
          gsap.from(tomorrowRef.current.children, {
            opacity: 0, y: 12, duration: 0.3, stagger: 0.05, ease: 'power2.out',
          });
        }
      });
    }
  };

  return (
    <div className='pb-20' ref={containerRef}>
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
        {activeTasks.length === 0 && (
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
          const baseStatus = getTaskStatus(t, null, ctx.cfg ? ctx.cfg.bedtime : undefined);
          const status = isDone
            ? entry.status
            : isMissed
              ? 'missed'
              : isRej
                ? (baseStatus === 'missed' ? 'missed' : 'rejected')
                : baseStatus;
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

          const cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          const dimBg = idx % 2 === 0 ? 'bg-qmint-dim' : 'bg-qyellow-dim';

          return (
            <div
              key={t.id}
              className={
                (isDone || isMissed ? dimBg : cardBg) +
                ' rounded-btn p-4 task-card'
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
              {!isDone && !isMissed && status !== 'missed' && (
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
        {tomorrowTasks.length > 0 && (
          <button
            onClick={togglePreview}
            aria-expanded={previewOpen}
            className='flex items-center justify-center gap-2 text-[13px] text-qmuted font-semibold font-body bg-transparent border-none cursor-pointer py-3 mt-2 hover:text-qslate transition-colors'
          >
            <span ref={chevronRef} style={{ display: 'inline-block' }}>
              <FontAwesomeIcon
                icon={faChevronRight}
                style={FA_ICON_STYLE}
                className='text-[10px]'
              />
            </span>
            Preview tomorrow's missions
          </button>
        )}
        {previewOpen && tomorrowTasks.length > 0 && (
          <div className='flex flex-col gap-2' ref={tomorrowRef}>
            {sortedTomorrow.map(t => (
              <div
                key={t.id}
                className='bg-qslate/5 rounded-btn p-3 flex justify-between items-center'
              >
                <div>
                  <div className='text-sm font-semibold text-qmuted flex items-center gap-1.5'>
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
                  <div className='text-[11px] text-qdim'>
                    {fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}
                  </div>
                </div>
                <div className='text-[11px] text-qmuted font-semibold'>
                  {tp(t.tier)} coins
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
