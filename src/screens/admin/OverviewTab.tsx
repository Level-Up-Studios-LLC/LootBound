import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFamilyPants } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { FA_ICON_STYLE, altBg } from '../../constants.ts';
import { freshUser, getToday, isTaskActiveToday, getLevelTitle } from '../../utils.ts';

interface OverviewTabProps {
  onSwitchTab: (tab: string) => void;
}

export default function OverviewTab(
  props: OverviewTabProps
): React.ReactElement {
  var ctx = useAppContext();
  var children = ctx.children;
  var allU = ctx.allU;
  var cfg = ctx.cfg;
  var d = getToday();

  if (children.length === 0) {
    return (
      <div className='text-center py-10 px-5 text-qmuted'>
        <div className='text-[32px] mb-3'>
          <FontAwesomeIcon icon={faFamilyPants} style={FA_ICON_STYLE} />
        </div>
        <div className='font-bold text-base mb-2 text-qslate'>
          Children Overview
        </div>
        <div className='text-[13px] leading-relaxed max-w-[300px] mx-auto'>
          This tab shows a summary of each child's coins, daily progress, and
          streak at a glance. You can also quickly adjust coins here.
        </div>
        <div className='text-[13px] mt-4 text-qmuted'>
          Add a child in the{' '}
          <button
            onClick={function () {
              props.onSwitchTab('children');
            }}
            className='bg-transparent border-none text-qteal font-bold cursor-pointer font-body text-[13px] p-0'
          >
            Children
          </button>{' '}
          tab to get started.
        </div>
      </div>
    );
  }

  return (
    <div>
      {children.map(function (c, ci) {
        var udata = allU[c.id] || freshUser();
        var tasks = (cfg!.tasks[c.id] || []).filter(isTaskActiveToday);
        var log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
        var done = tasks.filter(function (t) {
          var l = log[t.id];
          return l && !l.rejected && l.status !== 'missed';
        }).length;
        var lt = getLevelTitle(udata.level || 1);
        return (
          <div key={c.id} className={altBg(ci) + ' rounded-btn p-4 mb-4'}>
            <div className='flex justify-between font-bold mb-1.5'>
              <div>
                <span className='text-qslate'>
                  {c.avatar} {c.name} (age {c.age})
                </span>
                <div className='text-[11px] font-semibold' style={{ color: lt.color }}>
                  Lv.{udata.level || 1} {lt.title}
                </div>
              </div>
              <span className='text-qslate font-display'>
                {(udata.points || 0).toLocaleString()} coins
              </span>
            </div>
            <div className='flex gap-4 text-[13px] text-qmuted mb-2'>
              <span>
                Today: {done}/{tasks.length}
              </span>
              <span>Streak: {udata.streak || 0}</span>
            </div>
            <div className='flex gap-2 flex-wrap items-center'>
              <span className='text-xs text-qmuted'>Adjust:</span>
              {[10, 25, 50, -10, -25, -50].map(function (p) {
                return (
                  <button
                    key={p}
                    onClick={function () {
                      ctx.addBonus(c.id, p);
                    }}
                    className={
                      'rounded-[6px] px-3 py-1.5 text-xs font-bold border-none cursor-pointer font-body ' +
                      (p > 0
                        ? 'bg-qblue-dim text-qblue'
                        : 'bg-qred-dim text-qred')
                    }
                  >
                    {p > 0 ? '+' : ''}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
