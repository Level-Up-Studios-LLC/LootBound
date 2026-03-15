import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faTrophy, faMedal } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV, FA_ICON_STYLE } from '../constants.ts';
import BNav from '../components/BNav.tsx';
import { freshUser, getToday, getWeekStart, isTaskActiveToday, getLevelTitle, getStreakMultiplier } from '../utils.ts';
import type { UserData } from '../types.ts';

function countPerfectDays(ud: UserData, tasks: import('../types.ts').Task[], weekStart: string): number {
  if (!ud.taskLog) return 0;
  var count = 0;
  var dates = Object.keys(ud.taskLog);
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i];
    if (dt < weekStart || dt.charAt(0) === '_') continue;
    var log = ud.taskLog[dt];
    if (!log) continue;
    // Filter tasks to only those active on this date
    var dow = new Date(dt + 'T12:00:00').getDay();
    var activeTasks = tasks.filter(function (t) {
      if (t.daily) return true;
      if (t.dueDay != null) return t.dueDay === dow;
      return true;
    });
    if (activeTasks.length === 0) continue;
    var allGood = true;
    for (var j = 0; j < activeTasks.length; j++) {
      var entry = log[activeTasks[j].id];
      if (!entry || entry.rejected || entry.status === 'missed') {
        allGood = false;
        break;
      }
    }
    if (allGood) count++;
  }
  return count;
}

export default function ScoresScreen(): React.ReactElement | null {
  var ctx = useAppContext();
  var children = ctx.children;
  var allU = ctx.allU;
  var cfg = ctx.cfg;
  var curUser = ctx.curUser;
  var ch = ctx.currentChild;
  var ud = ctx.currentUserData;
  var d = getToday();
  var ws = getWeekStart(cfg ? cfg.weeklyResetDay : undefined);

  if (!ch || !ud || !cfg) return null;

  // Solo kid: show personal stats instead of leaderboard
  if (children.length === 1) {
    var myTasks = (cfg!.tasks[ch.id] || []).filter(isTaskActiveToday);
    var myLog = ud.taskLog && ud.taskLog[d] ? ud.taskLog[d] : {};
    var myDone = myTasks.filter(function (t) {
      var l = myLog[t.id];
      return l && !l.rejected && l.status !== 'missed';
    }).length;
    var myPerfect = countPerfectDays(ud, cfg!.tasks[ch.id] || [], ws);
    var lt = getLevelTitle(ud.level || 1);
    var sMult = getStreakMultiplier(ud.streak || 0);

    return (
      <div className='p-4 pb-20'>
        <div className='font-display text-2xl font-bold mb-4 text-qslate'>
          My Stats
        </div>
        <div className='bg-qmint rounded-card p-5 mb-4 text-center animate-slide-up'>
          <div className='text-[40px] mb-1'>{ch.avatar}</div>
          <div className='font-display text-xl font-bold text-qslate'>{ch.name}</div>
          <div className='font-bold text-sm' style={{ color: lt.color }}>
            Lv.{ud.level || 1} {lt.title}
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-qyellow rounded-btn p-4 text-center'>
            <div className='font-display text-2xl font-bold text-qslate'>
              {(ud.points || 0).toLocaleString()}
            </div>
            <div className='text-[10px] text-qmuted font-bold'>COINS</div>
          </div>
          <div className='bg-qmint rounded-btn p-4 text-center'>
            <div className='font-display text-2xl font-bold text-qslate'>
              {myDone}/{myTasks.length}
            </div>
            <div className='text-[10px] text-qmuted font-bold'>TODAY</div>
          </div>
        </div>
        <div className='grid grid-cols-3 gap-3 mb-4'>
          <div className='bg-qyellow rounded-btn p-4 text-center'>
            <div className='font-display text-xl font-bold text-qslate'>
              <FontAwesomeIcon icon={faFire} style={FA_ICON_STYLE} className='mr-1 text-sm' />
              {ud.streak || 0}
            </div>
            <div className='text-[10px] text-qmuted font-bold'>STREAK</div>
          </div>
          <div className='bg-qmint rounded-btn p-4 text-center'>
            <div className='font-display text-xl font-bold text-qslate'>
              {ud.bestStreak || 0}
            </div>
            <div className='text-[10px] text-qmuted font-bold'>BEST</div>
          </div>
          <div className='bg-qyellow rounded-btn p-4 text-center'>
            <div className='font-display text-xl font-bold text-qslate'>
              {myPerfect}
            </div>
            <div className='text-[10px] text-qmuted font-bold'>PERFECT DAYS</div>
          </div>
        </div>
        {sMult > 1 && (
          <div className='bg-qmint rounded-btn p-3 mb-4 text-center text-[13px] text-qmuted font-semibold'>
            <FontAwesomeIcon icon={faFire} style={FA_ICON_STYLE} className='mr-1' />
            {sMult}x XP streak bonus active
          </div>
        )}
        <div className='bg-qyellow rounded-card p-4'>
          <div className='font-bold text-sm text-qslate mb-3 flex items-center gap-2'>
            <FontAwesomeIcon icon={faMedal} style={FA_ICON_STYLE} />
            Milestones
          </div>
          <div className='flex flex-col gap-2'>
            {(
              [
                [3, '+20 coins', ud.bestStreak >= 3],
                [7, '+75 coins', ud.bestStreak >= 7],
                [15, '+150 coins', ud.bestStreak >= 15],
                [30, '+300 coins', ud.bestStreak >= 30],
              ] as [number, string, boolean][]
            ).map(function (m) {
              return (
                <div
                  key={m[0]}
                  className={'flex justify-between items-center rounded-badge px-3 py-2 ' + (m[2] ? 'bg-qteal-dim' : 'bg-qbg')}
                >
                  <span className={'text-[13px] font-semibold ' + (m[2] ? 'text-qteal' : 'text-qmuted')}>
                    {m[0]}-day streak
                  </span>
                  <span className={'text-[13px] font-bold ' + (m[2] ? 'text-qteal' : 'text-qmuted')}>
                    {m[2] ? '✓ ' : ''}{m[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <BNav tabs={KID_NAV} />
      </div>
    );
  }

  // Multi-kid: leaderboard with top adventurer highlight
  // Calculate perfect days per child this week
  var perfects: Record<string, number> = {};
  var topPerfect = 0;
  var topIds: string[] = [];
  children.forEach(function (c) {
    var udata = allU[c.id] || freshUser();
    var cTasks = cfg!.tasks[c.id] || [];
    var pd = countPerfectDays(udata, cTasks, ws);
    perfects[c.id] = pd;
    if (pd > topPerfect) {
      topPerfect = pd;
      topIds = [c.id];
    } else if (pd === topPerfect && pd > 0) {
      topIds.push(c.id);
    }
  });

  var sorted = children.slice().sort(function (a, b) {
    // Primary sort: perfect days (desc)
    var pdDiff = (perfects[b.id] || 0) - (perfects[a.id] || 0);
    if (pdDiff !== 0) return pdDiff;
    // Secondary: coins (desc)
    return (
      ((allU[b.id] || ({} as UserData)).points || 0) -
      ((allU[a.id] || ({} as UserData)).points || 0)
    );
  });

  return (
    <div className='p-4 pb-20'>
      <div className='font-display text-2xl font-bold mb-4 text-qslate'>
        Leaderboard
      </div>
      <div className='flex flex-col gap-4'>
        {sorted.map(function (c, idx) {
          var udata = allU[c.id] || freshUser();
          var tasks = (cfg!.tasks[c.id] || []).filter(isTaskActiveToday);
          var log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
          var done = tasks.filter(function (t) {
            var l = log[t.id];
            return l && !l.rejected && l.status !== 'missed';
          }).length;
          var isMe = c.id === curUser;
          var isTop = topPerfect > 0 && topIds.indexOf(c.id) !== -1;
          var cardBg = isTop ? 'bg-qyellow' : idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          return (
            <div
              key={c.id}
              className={
                'rounded-card p-4 transition-all animate-slide-up ' + cardBg
              }
              style={isTop ? { border: '2px solid #eab308', boxShadow: '0 0 12px rgba(234,179,8,0.2)' } : {}}
            >
              {isTop && (
                <div className='text-[11px] font-bold text-center mb-2' style={{ color: '#eab308' }}>
                  <FontAwesomeIcon icon={faTrophy} className='mr-1' />
                  Top Adventurer
                </div>
              )}
              <div className='flex justify-between items-center mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='text-[28px]'>
                    {c.avatar}
                  </div>
                  <div>
                    <div className='font-display text-lg font-bold text-qslate'>
                      {c.name}
                      {isMe ? ' (You)' : ''}
                    </div>
                  {(function () {
                    var lt = getLevelTitle(udata.level || 1);
                    return (
                    <div className='text-xs font-semibold' style={{ color: lt.color }}>
                      Lv.{udata.level || 1} {lt.title}
                    </div>
                    );
                  })()}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-display text-[26px] font-bold text-qslate'>
                    {(udata.points || 0).toLocaleString()}
                  </div>
                  <div className='text-[11px] text-qmuted font-bold'>COINS</div>
                </div>
              </div>
              <div className='grid grid-cols-4 gap-2'>
                {(
                  [
                    [done + '/' + tasks.length, 'Today'],
                    [perfects[c.id] || 0, 'Perfect'],
                    [udata.streak || 0, 'Streak'],
                    [udata.bestStreak || 0, 'Best'],
                  ] as [string | number, string][]
                ).map(function (s) {
                  return (
                    <div
                      key={s[1]}
                      className='rounded-badge p-2.5 text-center bg-qbg'
                    >
                      <div className='font-display text-base font-bold text-qslate'>
                        {s[0]}
                      </div>
                      <div className='text-[9px] text-qmuted font-bold'>{s[1]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <BNav tabs={KID_NAV} />
    </div>
  );
}
