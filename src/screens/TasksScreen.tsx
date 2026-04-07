import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBed,
  faCamera,
  faChevronRight,
  faGamepadModern,
  faHandshake,
  faPeopleGroup,
} from '../fa.ts';
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
import CoopBadge from '../components/CoopBadge.tsx';
import CoopInviteCard from '../components/CoopInviteCard.tsx';
import CoopRequestForm from '../components/forms/CoopRequestForm.tsx';
import KidHeader from '../components/KidHeader.tsx';
import Modal from '../components/ui/Modal.tsx';
import EmptyState from '../components/ui/EmptyState.tsx';
import {
  getTaskStatus,
  fmtTime,
  timeToMin,
  getToday,
  getCoopForTask,
} from '../utils.ts';

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
  const coopRequests = ctx.coopRequests;
  const children = ctx.cfg?.children || [];
  const curUser = ctx.curUser;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coopTask, setCoopTask] = useState<import('../types.ts').Task | null>(
    null
  );
  const [coopBusy, setCoopBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLSpanElement>(null);
  const tomorrowRef = useRef<HTMLDivElement>(null);
  const coopModalRef = useRef<HTMLDivElement>(null);
  const coopTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Focus trap for co-op request modal
  const handleModalKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!coopBusy) {
          coopTriggerRef.current?.focus();
          setCoopTask(null);
        }
        return;
      }
      if (e.key !== 'Tab' || !coopModalRef.current) return;
      const focusable = coopModalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const onWrapper = document.activeElement === coopModalRef.current;
      if (e.shiftKey && (document.activeElement === first || onWrapper)) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || onWrapper)
      ) {
        e.preventDefault();
        first.focus();
      }
    },
    [coopBusy]
  );

  // Auto-focus first focusable child on open (falls back to wrapper)
  useEffect(() => {
    if (coopTask && coopModalRef.current) {
      const first = coopModalRef.current.querySelector<HTMLElement>(
        'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'
      );
      (first || coopModalRef.current).focus();
    }
  }, [coopTask]);

  // Entrance animations — must be above early return to satisfy Rules of Hooks
  useGSAP(
    () => {
      if (!ch || !ud) return;
      gsap.from('.task-card', {
        opacity: 0,
        y: 16,
        duration: 0.35,
        stagger: 0.06,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [ch, ud] }
  );

  if (!ch || !ud) return null;

  const sorted = activeTasks.slice().sort((a, b) => {
    const al = tLog[a.id],
      bl = tLog[b.id];
    const ac = al && !al.rejected && al.status !== 'missed',
      bc = bl && !bl.rejected && bl.status !== 'missed';
    if (ac !== bc) return ac ? 1 : -1;
    return timeToMin(a.windowStart) - timeToMin(b.windowStart);
  });

  const today = getToday();

  // Pending invites for this kid (Kid 2 perspective)
  const pendingInvites = coopRequests.filter(
    r =>
      r.partnerId === curUser &&
      r.status === 'pending_partner' &&
      r.date === today
  );

  // Should the co-op button be shown on a task card?
  const canShowCoopButton = (task: import('../types.ts').Task): boolean => {
    if (!curUser) return false;
    if (children.length < 2) return false;
    if (task.id.startsWith('coop:')) return false;
    if (ctx.isTaskInActiveCoop(curUser, task.id, today)) return false;
    const hasSiblingWithTask = children.some(c => {
      if (c.id === curUser) return false;
      return (ctx.cfg?.tasks[c.id] || []).some(
        t =>
          t.name === task.name &&
          t.tier === task.tier &&
          t.windowStart === task.windowStart &&
          t.windowEnd === task.windowEnd &&
          t.frequency === task.frequency &&
          JSON.stringify([...t.dueDays].sort()) ===
            JSON.stringify([...task.dueDays].sort())
      );
    });
    if (!hasSiblingWithTask) return false;
    return true;
  };

  const sortedTomorrow = tomorrowTasks
    .slice()
    .sort((a, b) => timeToMin(a.windowStart) - timeToMin(b.windowStart));

  // Chevron + tomorrow preview toggle
  const togglePreview = () => {
    const opening = !previewOpen;
    setPreviewOpen(opening);
    if (chevronRef.current) {
      gsap.to(chevronRef.current, {
        rotation: opening ? 90 : 0,
        duration: 0.25,
        ease: 'power2.out',
      });
    }
    if (opening) {
      // Animate tomorrow cards after state update renders them
      requestAnimationFrame(() => {
        if (tomorrowRef.current) {
          gsap.from(tomorrowRef.current.children, {
            opacity: 0,
            y: 12,
            duration: 0.3,
            stagger: 0.05,
            ease: 'power2.out',
          });
        }
      });
    }
  };

  return (
    <div className='pb-20' ref={containerRef}>
      <KidHeader child={ch} userData={ud} />
      <div className='px-4 pt-3 flex flex-col gap-3'>
        <h1 className='font-display text-2xl font-bold text-qslate'>
          Today's Missions
        </h1>
        {bedLock && (
          <div
            role='alert'
            className='bg-qcoral-dim rounded-badge px-4 py-2.5 text-[13px] text-qcoral text-center'
          >
            <FontAwesomeIcon
              icon={faBed}
              style={FA_ICON_STYLE}
              className='mr-1.5'
            />
            Bedtime cutoff passed. Incomplete missions marked as missed.
          </div>
        )}
        {/* Pending co-op invites (Kid 2 perspective) */}
        {pendingInvites.length > 0 && (
          <div className='mb-2'>
            <div className='text-[11px] font-bold text-qcyan uppercase tracking-wide mb-2 flex items-center gap-1.5'>
              <FontAwesomeIcon icon={faPeopleGroup} />
              Co-op Invites
            </div>
            {pendingInvites.map(r => (
              <CoopInviteCard key={r.id} request={r} />
            ))}
          </div>
        )}
        {activeTasks.length === 0 && pendingInvites.length === 0 && (
          <EmptyState
            icon={faGamepadModern}
            title='No missions today!'
            description='Enjoy your free time. Check back tomorrow for new missions!'
          />
        )}
        <ul role='list' className='flex flex-col gap-3 list-none p-0 m-0'>
          {sorted.map((t, idx) => {
            const entry = tLog[t.id];
            const isRej = entry && entry.rejected;
            const isDone =
              entry && !entry.rejected && entry.status !== 'missed';
            const isMissed =
              entry && entry.status === 'missed' && !entry.rejected;
            const baseStatus = getTaskStatus(
              t,
              null,
              ctx.cfg ? ctx.cfg.bedtime : undefined
            );

            // Co-op awareness
            const coopReq = getCoopForTask(t.id, coopRequests, curUser, today);
            const isCoop = !!coopReq;
            const isInitiator = coopReq?.initiatorId === curUser;

            // Determine co-op-specific status label key
            const getCoopStatusKey = (): string | null => {
              if (!coopReq) return null;
              if (
                coopReq.status === 'pending_partner' ||
                coopReq.status === 'pending_parent'
              )
                return 'coopPending';
              if (coopReq.status === 'expired') return 'coopFailed';
              if (
                coopReq.status === 'cancelled' ||
                coopReq.status === 'declined' ||
                coopReq.status === 'denied'
              )
                return 'coopFailed';
              if (coopReq.status === 'completed') return 'coopComplete';
              if (coopReq.status === 'approved') {
                // Check if this kid completed their part
                const myPart = isInitiator
                  ? coopReq.initiatorCompleted
                  : coopReq.partnerCompleted;
                if (myPart) return 'coopWaiting'; // done, waiting on partner
                return 'coopReady'; // approved, ready to work
              }
              return null;
            };

            const coopStatusKey = getCoopStatusKey();
            const status =
              coopStatusKey ||
              (isDone
                ? entry.status
                : isMissed
                  ? 'missed'
                  : isRej
                    ? baseStatus === 'missed'
                      ? 'missed'
                      : 'rejected'
                    : baseStatus);

            const sl = SL[status] || {
              text: '',
              color: '#64748b',
              bg: 'transparent',
            };

            // Co-op cards waiting for partner/parent can't be completed
            const coopPending =
              coopReq &&
              (coopReq.status === 'pending_partner' ||
                coopReq.status === 'pending_parent');
            // This kid already completed their part
            const coopMyPartDone =
              coopReq &&
              coopReq.status === 'approved' &&
              (isInitiator
                ? coopReq.initiatorCompleted
                : coopReq.partnerCompleted);

            // Co-op request is in a terminal state and should not be completable
            const coopTerminal =
              coopReq &&
              [
                'completed',
                'expired',
                'cancelled',
                'denied',
                'declined',
              ].includes(coopReq.status);

            // For co-op tasks, show split coins (0 for failed co-op states)
            const coopFailed = coopStatusKey === 'coopFailed';
            const displayCoins =
              isCoop && coopReq
                ? coopFailed
                  ? 0
                  : Math.floor(
                      (coopReq.coinOverride ?? tierCfgFn(t.tier).coins) / 2
                    )
                : isDone
                  ? entry.points
                  : isMissed
                    ? entry.points
                    : tp(t.tier);
            const xpVal = isDone
              ? entry.xp || 0
              : isMissed || coopTerminal
                ? 0
                : tierCfgFn(t.tier).xp;

            const cardBg = isCoop
              ? 'bg-qcoop'
              : idx % 2 === 0
                ? 'bg-qmint'
                : 'bg-qyellow';
            const dimBg = isCoop
              ? 'bg-qcoop-dim'
              : idx % 2 === 0
                ? 'bg-qmint-dim'
                : 'bg-qyellow-dim';

            const canComplete =
              !isDone &&
              !isMissed &&
              status !== 'missed' &&
              !coopPending &&
              !coopMyPartDone &&
              !coopTerminal &&
              // Co-op tasks can be completed when approved (doComplete delegates to completeCoopTask)
              (!isCoop || coopReq?.status === 'approved');

            // Get partner info for CoopBadge
            const coopPartnerName =
              isCoop && coopReq
                ? isInitiator
                  ? coopReq.partnerName
                  : coopReq.initiatorName
                : '';
            const coopPartnerAvatar =
              isCoop && coopReq
                ? (() => {
                    const p = ctx.getChild(
                      isInitiator ? coopReq.partnerId : coopReq.initiatorId
                    );
                    return p?.avatar;
                  })()
                : undefined;

            const isSettled =
              isDone || isMissed || coopMyPartDone || coopTerminal;

            return (
              <li
                key={t.id}
                className={
                  (isSettled ? dimBg : cardBg) + ' rounded-btn p-4 task-card'
                }
                style={{
                  borderLeft: `3px solid ${isCoop ? '#5ec4d4' : sl.color}`,
                }}
              >
                <div className='flex justify-between items-start'>
                  <div className='flex-1 min-w-0'>
                    <div
                      className={
                        'text-sm font-semibold text-qslate flex items-center gap-1.5' +
                        (isDone || coopTerminal ? ' line-through' : '')
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
                      {isCoop && (
                        <FontAwesomeIcon
                          icon={faHandshake}
                          className='text-qcyan text-xs'
                          aria-hidden='true'
                        />
                      )}
                      {t.name}
                    </div>
                    <div className='text-[11px] text-qmuted'>
                      {fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}
                      {t.frequency === 'specific_days' && t.dueDays.length > 0
                        ? ` | ${t.dueDays.map(d => DAYS_SHORT[d]).join(', ')}`
                        : t.frequency === 'once'
                          ? ' | Once'
                          : ''}
                    </div>
                    {isCoop && (
                      <div className='mt-1'>
                        <CoopBadge
                          partnerName={coopPartnerName}
                          partnerAvatar={coopPartnerAvatar}
                        />
                      </div>
                    )}
                    {isRej && !isCoop && (
                      <div className='text-[11px] text-qpink mt-0.5'>
                        Parent requested redo
                      </div>
                    )}
                    {coopPending && (
                      <div className='text-[11px] text-qmuted mt-0.5 italic'>
                        {coopReq!.status === 'pending_partner'
                          ? `Waiting for ${isInitiator ? coopReq!.partnerName : coopReq!.initiatorName}...`
                          : 'Awaiting parent approval'}
                      </div>
                    )}
                    {coopMyPartDone && (
                      <div className='text-[11px] text-qcyan mt-0.5 italic'>
                        Done! Waiting for{' '}
                        {isInitiator
                          ? coopReq!.partnerName
                          : coopReq!.initiatorName}
                        ...
                      </div>
                    )}
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <Badge status={status} />
                    <div className='text-sm font-bold font-display text-qslate'>
                      {isSettled
                        ? displayCoins > 0
                          ? `+${displayCoins}`
                          : displayCoins
                        : displayCoins}{' '}
                      coins
                    </div>
                    <div className='text-[10px] text-qmuted font-semibold'>
                      {isDone || (isCoop && coopReq?.status === 'completed')
                        ? `+${xpVal} XP`
                        : isSettled
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
                    className='text-[12px] text-qteal bg-transparent border-none cursor-pointer font-body mt-1 py-1.5 px-2 -ml-2 rounded-badge hover:underline hover:bg-qteal/5'
                  >
                    View photo proof
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={() => {
                      startCapture(t.id);
                    }}
                    aria-label={`Complete ${t.name}`}
                    className={
                      'w-full text-white rounded-badge py-2.5 text-[13px] font-bold mt-3 border-none cursor-pointer font-body transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] ' +
                      (isCoop
                        ? 'bg-qcyan'
                        : isRej
                          ? 'bg-qcoral'
                          : status === 'active'
                            ? 'bg-qteal'
                            : status === 'upcoming'
                              ? 'bg-qpurple'
                              : 'bg-qorange')
                    }
                  >
                    {t.photoRequired !== false && (
                      <FontAwesomeIcon
                        icon={faCamera}
                        className='mr-1.5'
                        aria-hidden='true'
                      />
                    )}
                    {isCoop
                      ? t.photoRequired !== false
                        ? 'Complete Co-op + Photo'
                        : 'Complete Co-op'
                      : isRej
                        ? t.photoRequired !== false
                          ? 'Redo + Photo'
                          : 'Redo'
                        : status === 'upcoming'
                          ? t.photoRequired !== false
                            ? 'Early (+25%) + Photo'
                            : 'Early (+25%)'
                          : status === 'overdue'
                            ? t.photoRequired !== false
                              ? 'Late (50%) + Photo'
                              : 'Late (50%)'
                            : t.photoRequired !== false
                              ? 'Complete + Photo'
                              : 'Complete'}
                  </button>
                )}
                {/* Co-op request button for solo tasks */}
                {canComplete && !isCoop && canShowCoopButton(t) && (
                  <button
                    onClick={e => {
                      coopTriggerRef.current = e.currentTarget;
                      setCoopTask(t);
                    }}
                    aria-haspopup='dialog'
                    aria-label={`Start co-op for ${t.name}`}
                    className='w-full bg-qcoop-dim text-qcyan rounded-badge py-2 text-[12px] font-semibold mt-2 border-none cursor-pointer font-body flex items-center justify-center gap-1.5 hover:brightness-95 active:scale-[0.98] transition-all'
                  >
                    <FontAwesomeIcon icon={faHandshake} />
                    Co-op with sibling
                  </button>
                )}
                {isDone && !isCoop && (
                  <div className='text-xs mt-1.5' style={{ color: sl.color }}>
                    {status === 'early'
                      ? 'Early! Bonus coins.'
                      : status === 'ontime'
                        ? 'On time. Full coins.'
                        : 'Late. Half coins.'}
                  </div>
                )}
                {isCoop && coopReq?.status === 'completed' && (
                  <div className='text-xs mt-1.5 text-qcyan'>
                    Co-op complete! Coins split.
                  </div>
                )}
                {isMissed && !isCoop && (
                  <div className='text-xs mt-1.5 text-qred'>
                    Missed. Coins deducted.
                  </div>
                )}
                {isCoop && coopReq?.status === 'expired' && (
                  <div className='text-xs mt-1.5 text-qred'>
                    Co-op expired. Mission missed.
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {tomorrowTasks.length > 0 && (
          <button
            onClick={togglePreview}
            aria-expanded={previewOpen}
            aria-controls='tomorrow-preview'
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
          <div
            id='tomorrow-preview'
            role='region'
            aria-label="Tomorrow's missions"
            className='flex flex-col gap-2'
            ref={tomorrowRef}
          >
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
      {coopTask && (
        <div
          ref={coopModalRef}
          tabIndex={-1}
          role='dialog'
          aria-label='Start Co-op'
          aria-modal='true'
          onKeyDown={handleModalKeyDown}
        >
          <Modal title='Start Co-op' bgColor='bg-white'>
            <CoopRequestForm
              task={coopTask}
              onSend={async partnerId => {
                setCoopBusy(true);
                try {
                  await ctx.requestCoop(curUser!, coopTask.id, partnerId);
                  coopTriggerRef.current?.focus();
                  setCoopTask(null);
                } finally {
                  setCoopBusy(false);
                }
              }}
              onCancel={() => {
                if (!coopBusy) {
                  coopTriggerRef.current?.focus();
                  setCoopTask(null);
                }
              }}
            />
          </Modal>
        </div>
      )}
      <BNav tabs={KID_NAV} />
    </div>
  );
}
