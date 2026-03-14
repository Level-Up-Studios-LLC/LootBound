import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faFire, faPartyHorn, faCheck, faCoins } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV, FA_ICON_STYLE } from '../constants.ts';
import Badge from '../components/Badge.tsx';
import BNav from '../components/BNav.tsx';
import { getTaskStatus, fmtTime, timeToMin } from '../utils.ts';

export default function DashboardScreen(): React.ReactElement | null {
  var ctx = useAppContext();
  var ch = ctx.currentChild;
  var ud = ctx.currentUserData;
  var todayTasks = ctx.todayTasks;
  var tLog = ctx.tLog;
  var bedLock = ctx.bedLock;
  var startCapture = ctx.startCapture;

  if (!ch || !ud) return null;

  var done = todayTasks.filter(function (t) {
    var l = tLog[t.id];
    return l && !l.rejected && l.status !== 'missed';
  }).length;
  var total = todayTasks.length;
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
          <div className='bg-qcoral-dim rounded-badge px-4 py-2.5 mt-3 text-[13px] text-qcoral text-center'>
            <FontAwesomeIcon
              icon={faBed}
              style={FA_ICON_STYLE}
              className='mr-1.5'
            />
            Past 9 PM bedtime. Missions are locked for today.
          </div>
        )}
      </div>
      <div className='px-4 pt-4'>
      <div className='grid grid-cols-3 gap-3.5 mb-6'>
        <div className='bg-qmint rounded-btn p-4'>
          <div className='font-display text-[22px] font-bold text-qslate'>
            {pct}%
          </div>
          <div className='text-xs text-qmuted'>Today</div>
          <div className='h-1 bg-qmint-dim rounded-sm mt-1.5'>
            <div
              className={
                'h-full rounded-sm transition-all duration-500 ' +
                (pct === 100 ? 'bg-qteal' : 'bg-qyellow')
              }
              style={{
                width: pct + '%',
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
          .filter(function (t) {
            var l = tLog[t.id];
            return !l || l.rejected;
          })
          .sort(function (a, b) {
            return timeToMin(a.windowStart) - timeToMin(b.windowStart);
          })
          .slice(0, 4)
          .map(function (t, idx) {
            var entry = tLog[t.id];
            var isRej = entry && entry.rejected;
            var status = isRej
              ? 'rejected'
              : getTaskStatus(t, null, ctx.cfg ? ctx.cfg.bedtime : undefined);
            var cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
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
                {status !== 'missed' && (
                  <button
                    onClick={function () {
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
        {todayTasks.filter(function (t) {
          var l = tLog[t.id];
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
