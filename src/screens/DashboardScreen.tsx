import React, { useEffect, useRef, useMemo } from 'react';
import { useTrail, useSpring, animated, config } from '@react-spring/web';
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
} from '../utils.ts';
import { playSound } from '../services/notificationSound.ts';

// --- Confetti ---
const CONFETTI_COLORS = ['#4ac7a8', '#ffe08a', '#ff8c94', '#8b7ec8', '#5ec4d4', '#e6a817'];
const CONFETTI_COUNT = 35;

interface ConfettiPiece {
  x: number;
  w: number;
  h: number;
  color: string;
  drift: number;
  spin: number;
}

function Confetti(): React.ReactElement {
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        x: Math.random() * 100,
        w: 4 + Math.random() * 6,
        h: 6 + Math.random() * 10,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        drift: (Math.random() - 0.5) * 60,
        spin: Math.random() * 720 - 360,
      })),
    []
  );

  const trail = useTrail(CONFETTI_COUNT, {
    from: { y: -20, opacity: 1, rotate: 0 },
    to: { y: 110, opacity: 0, rotate: 360 },
    config: { tension: 30, friction: 14, clamp: true },
    trail: 40,
  });

  return (
    <div className='fixed inset-0 pointer-events-none overflow-hidden' style={{ zIndex: 200 }}>
      {trail.map((spring, i) => {
        const p = pieces[i];
        return (
          <animated.div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: 2,
              top: spring.y.to(v => `${v}%`),
              opacity: spring.opacity,
              transform: spring.rotate.to(
                v => `translateX(${(v / 360) * p.drift}px) rotate(${v * (p.spin / 360)}deg)`
              ),
            }}
          />
        );
      })}
    </div>
  );
}

// --- Stat cards data ---
const STAT_CARDS = ['today', 'streak', 'done'] as const;

export default function DashboardScreen(): React.ReactElement | null {
  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const activeTasks = ctx.activeTasks;
  const tLog = ctx.tLog;
  const bedLock = ctx.bedLock;
  const startCapture = ctx.startCapture;
  const soundPlayed = useRef(false);

  if (!ch || !ud) return null;

  const done = activeTasks.filter(t => {
    const l = tLog[t.id];
    return l && !l.rejected && l.status !== 'missed';
  }).length;
  const total = activeTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  // Play victory sound once when all missions complete
  useEffect(() => {
    if (allDone && !soundPlayed.current) {
      soundPlayed.current = true;
      const prefs = ctx.cfg ? ctx.cfg.notificationPrefs || {} : {};
      if ((prefs as Record<string, boolean>).soundEnabled !== false) {
        playSound('victory');
      }
    }
  }, [allDone]);

  // --- Animations ---
  const headerSpring = useSpring({
    from: { opacity: 0, y: -10 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  });

  const xpSpring = useSpring({
    from: { opacity: 0, scale: 0.95 },
    to: { opacity: 1, scale: 1 },
    config: config.wobbly,
    delay: 100,
  });

  const statTrail = useTrail(STAT_CARDS.length, {
    from: { opacity: 0, y: 20 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
    delay: 200,
  });

  const upNextTasks = activeTasks
    .filter(t => {
      const l = tLog[t.id];
      return !l || l.rejected;
    })
    .sort((a, b) => timeToMin(a.windowStart) - timeToMin(b.windowStart))
    .slice(0, 4);

  const taskTrail = useTrail(upNextTasks.length, {
    from: { opacity: 0, x: -20 },
    to: { opacity: 1, x: 0 },
    config: config.gentle,
    delay: 350,
  });

  const celebrationSpring = useSpring({
    from: { opacity: 0, scale: 0.5 },
    to: allDone ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 },
    config: config.wobbly,
  });

  const lvl = ud.level || 1;
  const lt = getLevelTitle(lvl);
  const xpProg = getXpProgress(ud.xp || 0, lvl);
  const sMult = getStreakMultiplier(ud.streak || 0);

  return (
    <div className='pb-20'>
      {allDone && <Confetti />}
      <div className='sticky top-0 z-[90] bg-white pl-4 pr-14 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <animated.div
          className='flex justify-between items-center'
          style={{
            opacity: headerSpring.opacity,
            transform: headerSpring.y.to(v => `translateY(${v}px)`),
          }}
        >
          <div>
            <div className='font-display text-[22px] font-bold'>
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
        </animated.div>
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
        <animated.div
          className='bg-qmint rounded-btn p-4 mb-5'
          style={{
            opacity: xpSpring.opacity,
            transform: xpSpring.scale.to(v => `scale(${v})`),
          }}
        >
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
        </animated.div>
        <div className='grid grid-cols-3 gap-3.5 mb-6'>
          {statTrail.map((spring, i) => {
            const card = STAT_CARDS[i];
            return (
              <animated.div
                key={card}
                className={
                  (card === 'streak' ? 'bg-qyellow' : 'bg-qmint') +
                  ' rounded-btn p-4'
                }
                style={{
                  opacity: spring.opacity,
                  transform: spring.y.to(v => `translateY(${v}px)`),
                }}
              >
                {card === 'today' && (
                  <>
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
                  </>
                )}
                {card === 'streak' && (
                  <>
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
                  </>
                )}
                {card === 'done' && (
                  <>
                    <div className='font-display text-[22px] font-bold text-qslate'>
                      {done}/{total}
                    </div>
                    <div className='text-xs text-qmuted'>Done</div>
                  </>
                )}
              </animated.div>
            );
          })}
        </div>
        <div className='font-display text-lg font-semibold mb-3 mt-5 text-qslate'>
          Up Next
        </div>
        <div className='flex flex-col gap-3'>
          {taskTrail.map((spring, idx) => {
            const t = upNextTasks[idx];
            const entry = tLog[t.id];
            const isRej = entry && entry.rejected;
            const baseStatus = getTaskStatus(
              t,
              null,
              ctx.cfg ? ctx.cfg.bedtime : undefined
            );
            const status =
              isRej && baseStatus !== 'missed' ? 'rejected' : baseStatus;
            const cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
            return (
              <animated.div
                key={t.id}
                className={
                  'flex items-center gap-3 rounded-btn p-4 ' + cardBg
                }
                style={{
                  opacity: spring.opacity,
                  transform: spring.x.to(v => `translateX(${v}px)`),
                }}
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
                {status !== 'missed' && (
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
              </animated.div>
            );
          })}
          {allDone && (
            <animated.div
              className='text-center p-6'
              style={{
                opacity: celebrationSpring.opacity,
                transform: celebrationSpring.scale.to(v => `scale(${v})`),
              }}
            >
              <FontAwesomeIcon
                icon={faPartyHorn}
                style={FA_ICON_STYLE}
                className='text-3xl text-qteal mb-2'
              />
              <div className='font-display text-lg font-bold text-qteal'>
                All done for today!
              </div>
              <div className='text-sm text-qmuted mt-1'>
                Great job, {ch.name}!
              </div>
            </animated.div>
          )}
        </div>
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
