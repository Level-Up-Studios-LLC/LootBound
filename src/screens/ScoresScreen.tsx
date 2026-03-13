import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown } from '../fa.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { KID_NAV } from '../constants.ts';
import BNav from '../components/BNav.tsx';
import { freshUser, getToday, isTaskActiveToday } from '../utils.ts';
import type { UserData } from '../types.ts';

export default function ScoresScreen(): React.ReactElement | null {
  var ctx = useAppContext();
  var children = ctx.children;
  var allU = ctx.allU;
  var cfg = ctx.cfg;
  var curUser = ctx.curUser;
  var ch = ctx.currentChild;
  var ud = ctx.currentUserData;
  var d = getToday();

  if (!ch || !ud) return null;

  var sorted = children.slice().sort(function (a, b) {
    return (
      ((allU[b.id] || ({} as UserData)).points || 0) -
      ((allU[a.id] || ({} as UserData)).points || 0)
    );
  });

  return (
    <div className='p-4 pb-20'>
      <div className='font-display text-2xl font-bold mb-4 text-qslate'>
        Scoreboard
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
          var cardBg = idx % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
          // var statBg = idx % 2 === 0 ? 'bg-qyellow' : 'bg-qmint';
          return (
            <div
              key={c.id}
              className={
                'rounded-card p-4 transition-all animate-slide-up ' + cardBg
              }
            >
              <div className='flex justify-between items-center mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='text-[28px]'>
                    {idx === 0 && (
                      <FontAwesomeIcon
                        icon={faCrown}
                        style={
                          {
                            '--fa-primary-color': '#4B4E6D',
                            '--fa-secondary-color': '#FF8C94',
                            '--fa-secondary-opacity': '1',
                          } as any
                        }
                        className='mr-1'
                      />
                    )}
                    {c.avatar}
                  </div>
                  <div>
                    <div className='font-display text-lg font-bold text-qslate'>
                      {c.name}
                      {isMe ? ' (You)' : ''}
                    </div>
                    <div className='text-xs text-qmuted'>Age {c.age}</div>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-display text-[26px] font-bold text-qslate'>
                    {(udata.points || 0).toLocaleString()}
                  </div>
                  <div className='text-[11px] text-qmuted font-bold'>PTS</div>
                </div>
              </div>
              <div className='grid grid-cols-3 gap-3'>
                {(
                  [
                    [done + '/' + tasks.length, 'Today'],
                    [udata.streak || 0, 'Streak'],
                    [udata.bestStreak || 0, 'Best'],
                  ] as [string | number, string][]
                ).map(function (s) {
                  return (
                    <div
                      key={s[1]}
                      // className={statBg + ' rounded-badge p-3 text-center'}
                      className='rounded-badge p-3 text-center bg-qbg'
                    >
                      <div className='font-display text-lg font-bold text-qslate'>
                        {s[0]}
                      </div>
                      <div className='text-[10px] text-qmuted'>{s[1]}</div>
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
