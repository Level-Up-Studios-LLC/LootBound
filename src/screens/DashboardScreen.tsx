import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faFire, faPartyHorn, faCheck, faHandshake } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV, FA_ICON_STYLE } from '../constants.ts';
import Badge from '../components/Badge.tsx';
import BNav from '../components/BNav.tsx';
import CoopBadge from '../components/CoopBadge.tsx';
import KidHeader from '../components/KidHeader.tsx';
import {
  getTaskStatus,
  fmtTime,
  timeToMin,
  getStreakMultiplier,
  getToday,
  getCoopForTask,
} from '../utils.ts';
import { playSound } from '../services/notificationSound.ts';

// --- GSAP + Canvas confetti ---
const CONFETTI_COLORS = [
  '#4ac7a8',
  '#ffe08a',
  '#ff8c94',
  '#8b7ec8',
  '#5ec4d4',
  '#e6a817',
];
const CONFETTI_COUNT = 50;

function Confetti(): React.ReactElement | null {
  const ref = useRef<HTMLCanvasElement>(null);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: CONFETTI_COUNT }, () => ({
      x: Math.random() * w,
      y: -10 - Math.random() * 40,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 10,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      opacity: 1,
      // Targets for GSAP
      targetY: h + 40 + Math.random() * 100,
      drift: (Math.random() - 0.5) * 120,
      spin: (Math.random() - 0.5) * 8,
    }));

    // GSAP animates the JS objects; we render them to canvas via onUpdate
    let frame: number;
    let running = true;
    function render() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of pieces) {
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.globalAlpha = p.opacity;
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      if (running) frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);

    const tl = gsap.timeline({
      onComplete: () => {
        running = false;
        cancelAnimationFrame(frame);
      },
    });
    tl.to(pieces, {
      y: (i: number) => pieces[i].targetY,
      x: (i: number) => pieces[i].x + pieces[i].drift,
      rot: (i: number) => pieces[i].rot + pieces[i].spin,
      duration: 2.5,
      ease: 'power1.in',
      stagger: { each: 0.03, from: 'random' },
    });
    tl.to(pieces, { opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=1');

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      tl.kill();
    };
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <canvas
      ref={ref}
      className='fixed inset-0 pointer-events-none'
      style={{ zIndex: 200, width: '100%', height: '100%' }}
    />
  );
}

export default function DashboardScreen(): React.ReactElement | null {
  const ctx = useAppContext();
  const ch = ctx.currentChild;
  const ud = ctx.currentUserData;
  const activeTasks = ctx.activeTasks;
  const tLog = ctx.tLog;
  const bedLock = ctx.bedLock;
  const startCapture = ctx.startCapture;
  const soundPlayedRef = useRef(false);
  const lastChildIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const done = activeTasks.filter(t => {
    const l = tLog[t.id];
    if (!l || l.rejected || l.status === 'missed') return false;
    // Co-op entries only count as done when both kids completed
    if (l.coopRequestId && !l.coopPartnerCompleted) return false;
    return true;
  }).length;
  const total = activeTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  // Track whether celebration (confetti + sound) already played for this completion
  const confettiPlayedRef = useRef(false);

  // Play victory sound + confetti only on a real incomplete→complete transition
  useEffect(() => {
    // Reset tracking when child changes (before ud guard)
    if (ch && lastChildIdRef.current !== ch.id) {
      lastChildIdRef.current = ch.id;
      soundPlayedRef.current = allDone;
      confettiPlayedRef.current = allDone;
      return;
    }
    if (!ch || !ud) return;
    if (!allDone) {
      soundPlayedRef.current = false;
      confettiPlayedRef.current = false;
      return;
    }
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      confettiPlayedRef.current = true;
      const prefs = ctx.cfg ? ctx.cfg.notificationPrefs || {} : {};
      if ((prefs as Record<string, boolean>).soundEnabled !== false) {
        playSound('victory');
      }
    }
  }, [allDone, ch?.id, !!ud, ctx.cfg?.notificationPrefs?.soundEnabled]);

  const showConfetti = allDone && confettiPlayedRef.current;

  // GSAP entrance animations (skipped when user prefers reduced motion)
  useGSAP(
    () => {
      if (!ch || !ud) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.from('.dash-header', { opacity: 0, y: -10, duration: 0.4 });
      tl.from('.dash-xp', { opacity: 0, scale: 0.95, duration: 0.4 }, '-=0.2');
      tl.from(
        '.dash-stat',
        { opacity: 0, y: 20, duration: 0.35, stagger: 0.08 },
        '-=0.2'
      );
      tl.from(
        '.dash-task',
        { opacity: 0, x: -20, duration: 0.35, stagger: 0.08 },
        '-=0.2'
      );
      if (allDone) {
        tl.from(
          '.dash-celebrate',
          { opacity: 0, scale: 0.5, duration: 0.5, ease: 'back.out(1.7)' },
          '-=0.1'
        );
      }
    },
    {
      scope: containerRef,
      dependencies: [allDone, ch?.id, !!ud],
      revertOnUpdate: true,
    }
  );

  if (!ch || !ud) return null;

  const sMult = getStreakMultiplier(ud.streak || 0);

  const coopRequests = ctx.coopRequests;
  const todayStr = getToday();

  const upNextTasks = activeTasks
    .filter(t => {
      const l = tLog[t.id];
      if (l && !l.rejected && l.status !== 'missed') return false; // completed
      if (getTaskStatus(t, null, ctx.cfg?.bedtime) === 'missed') return false;
      // Exclude co-op tasks where this kid's part is already done
      const coopReq = getCoopForTask(t.id, coopRequests, ctx.curUser, todayStr);
      if (coopReq) {
        // Exclude terminal co-op requests (completed, expired, cancelled, denied, declined)
        if (
          ['completed', 'expired', 'cancelled', 'denied', 'declined'].includes(
            coopReq.status
          )
        )
          return false;
        if (coopReq.status === 'approved') {
          const init = coopReq.initiatorId === ctx.curUser;
          if (init ? coopReq.initiatorCompleted : coopReq.partnerCompleted)
            return false;
        }
      }
      return !l || l.rejected;
    })
    .sort((a, b) => timeToMin(a.windowStart) - timeToMin(b.windowStart))
    .slice(0, 4);

  return (
    <div className='pb-20' ref={containerRef}>
      {showConfetti && <Confetti />}
      <KidHeader child={ch} userData={ud} />
      <div className='px-4 pt-4'>
        {bedLock && (
          <div
            className='bg-qcoral-dim rounded-badge px-4 py-2.5 mb-4 text-[13px] text-qcoral text-center'
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
        <h1 className='font-display text-2xl font-bold text-qslate mb-4 dash-header'>
          Dashboard
        </h1>
        {sMult > 1 && (
          <div className='text-[12px] text-qmuted mb-3 font-semibold'>
            <FontAwesomeIcon
              icon={faFire}
              style={FA_ICON_STYLE}
              className='mr-1'
            />
            {sMult}x XP streak bonus
          </div>
        )}
        <div className='grid grid-cols-3 gap-3.5 mb-6'>
          <div className='bg-qmint rounded-btn p-4 dash-stat'>
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
          <div className='bg-qyellow rounded-btn p-4 dash-stat'>
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
          <div className='bg-qmint rounded-btn p-4 dash-stat'>
            <div className='font-display text-[22px] font-bold text-qslate'>
              {done}/{total}
            </div>
            <div className='text-xs text-qmuted'>Done</div>
          </div>
        </div>
        <h2 className='font-display text-lg font-semibold mb-3 mt-5 text-qslate'>
          Up Next
        </h2>
        <ul role='list' className='flex flex-col gap-3 list-none p-0 m-0'>
          {upNextTasks.map((t, idx) => {
            const entry = tLog[t.id];
            const isRej = entry && entry.rejected;
            const baseStatus = getTaskStatus(
              t,
              null,
              ctx.cfg ? ctx.cfg.bedtime : undefined
            );

            const coopReq = getCoopForTask(
              t.id,
              coopRequests,
              ctx.curUser,
              todayStr
            );
            const isCoop = !!coopReq;
            const isInitiator = coopReq?.initiatorId === ctx.curUser;
            const coopPending =
              coopReq &&
              (coopReq.status === 'pending_partner' ||
                coopReq.status === 'pending_parent');
            const coopTerminal =
              coopReq &&
              [
                'completed',
                'expired',
                'cancelled',
                'denied',
                'declined',
              ].includes(coopReq.status);

            const status = coopPending
              ? 'coopPending'
              : coopTerminal
                ? 'coopFailed'
                : coopReq && coopReq.status === 'approved'
                  ? 'coopReady'
                  : isRej && baseStatus !== 'missed'
                    ? 'rejected'
                    : baseStatus;

            const cardBg = isCoop
              ? 'bg-qcoop'
              : idx % 2 === 0
                ? 'bg-qmint'
                : 'bg-qyellow';
            const coopMyPartDone =
              coopReq &&
              coopReq.status === 'approved' &&
              (isInitiator
                ? coopReq.initiatorCompleted
                : coopReq.partnerCompleted);
            const canComplete =
              !coopPending &&
              status !== 'missed' &&
              !coopTerminal &&
              !coopMyPartDone &&
              // Co-op tasks can be completed when approved
              (!isCoop || coopReq?.status === 'approved');

            return (
              <li
                key={t.id}
                className={
                  'flex items-center gap-3 rounded-btn p-4 dash-task ' + cardBg
                }
              >
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-semibold text-qslate flex items-center gap-1.5'>
                    {isCoop && (
                      <FontAwesomeIcon
                        icon={faHandshake}
                        className='text-qcyan text-xs'
                      />
                    )}
                    {t.name}
                  </div>
                  <div className='text-[11px] text-qmuted'>
                    {fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}
                  </div>
                  {isCoop && coopReq && (
                    <div className='mt-0.5'>
                      <CoopBadge
                        partnerName={
                          isInitiator
                            ? coopReq.partnerName
                            : coopReq.initiatorName
                        }
                        partnerAvatar={(() => {
                          const p = ctx.getChild(
                            isInitiator
                              ? coopReq.partnerId
                              : coopReq.initiatorId
                          );
                          return p?.avatar;
                        })()}
                      />
                    </div>
                  )}
                  {isRej && !isCoop && (
                    <div className='text-[11px] text-qpink'>
                      Parent requested redo
                    </div>
                  )}
                  {coopPending && (
                    <div className='text-[11px] text-qmuted italic'>
                      {coopReq!.status === 'pending_partner'
                        ? 'Waiting for sibling...'
                        : 'Awaiting parent approval'}
                    </div>
                  )}
                </div>
                <Badge status={status} />
                {canComplete && (
                  <button
                    type='button'
                    aria-label={
                      isRej ? `Redo ${t.name}` : `Mark ${t.name} as done`
                    }
                    onClick={() => startCapture(t.id)}
                    className={
                      'text-xs py-2 px-4 rounded-badge cursor-pointer font-body font-bold text-white transition-all hover:scale-105 active:scale-95 border-none ' +
                      (isCoop ? 'bg-qcyan' : isRej ? 'bg-qcoral' : 'bg-qteal')
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
              </li>
            );
          })}
          {allDone && (
            <li className='text-center p-6 dash-celebrate'>
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
            </li>
          )}
        </ul>
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
