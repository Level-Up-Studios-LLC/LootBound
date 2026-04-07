import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faChevronRight, faFamilyPants } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { FA_ICON_STYLE, altBg } from '../../constants.ts';
import {
  freshUser,
  getToday,
  isTaskActiveToday,
  getLevelTitle,
} from '../../utils.ts';
import ChildProfileSlideUp from '../../components/ChildProfileSlideUp.tsx';

interface OverviewTabProps {
  onSwitchTab: (tab: string) => void;
}

export default function OverviewTab(
  props: OverviewTabProps
): React.ReactElement {
  const [profileChildId, setProfileChildId] = useState<string | null>(null);
  const ctx = useAppContext();
  const children = ctx.children;
  const allU = ctx.allU;
  const cfg = ctx.cfg;
  const d = getToday();

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
            onClick={() => {
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
      {children.map((c, ci) => {
        const udata = allU[c.id] || freshUser();
        const tasks = (cfg!.tasks[c.id] || []).filter(isTaskActiveToday);
        const log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
        const done = tasks.filter(t => {
          const l = log[t.id];
          return l && !l.rejected && l.status !== 'missed';
        }).length;
        const lt = getLevelTitle(udata.level || 1);
        return (
          <div key={c.id} className={altBg(ci) + ' rounded-btn p-4 mb-4'}>
            <div className='flex justify-between font-bold mb-1.5'>
              <div>
                <span className='text-qslate'>
                  {c.avatar} {c.name} (age {c.age})
                </span>
                <div
                  className='text-[11px] font-semibold'
                  style={{ color: lt.color }}
                >
                  Lv.{udata.level || 1} {lt.title}
                </div>
              </div>
              <button
                onClick={() => setProfileChildId(c.id)}
                className='bg-qmint rounded-badge px-3 py-1.5 border-none cursor-pointer font-display text-qslate flex items-center gap-1.5 hover:brightness-95 active:scale-[0.97] transition-all'
                aria-label={`View ${c.name}'s coin balance and history`}
              >
                <FontAwesomeIcon
                  icon={faCoins}
                  style={FA_ICON_STYLE}
                  className='text-xs'
                />
                <span className='font-bold'>
                  {(udata.points || 0).toLocaleString()}
                </span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className='text-[10px] text-qmuted ml-0.5'
                />
              </button>
            </div>
            <div className='flex gap-4 text-[13px] text-qmuted'>
              <span>
                Today: {done}/{tasks.length}
              </span>
              <span>Streak: {udata.streak || 0}</span>
            </div>
          </div>
        );
      })}
      {profileChildId && (
        <ChildProfileSlideUp
          childId={profileChildId}
          onClose={() => setProfileChildId(null)}
        />
      )}
    </div>
  );
}
