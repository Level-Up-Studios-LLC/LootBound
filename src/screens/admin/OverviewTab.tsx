import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faFamilyPants } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { FA_ICON_STYLE, altBg } from '../../constants.ts';
import {
  freshUser,
  getToday,
  isTaskActiveToday,
  getLevelTitle,
} from '../../utils.ts';
import ChildProfileSlideUp from '../../components/ChildProfileSlideUp.tsx';
import PurchasesToggle from '../../components/ui/PurchasesToggle.tsx';

interface OverviewTabProps {
  onSwitchTab: (tab: string) => void;
}

export default function OverviewTab(
  props: OverviewTabProps
): React.ReactElement {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
                className='bg-transparent border-none cursor-pointer p-0 font-display text-qslate flex items-center gap-1'
                aria-label={`View ${c.name}'s coin balance and history`}
              >
                <FontAwesomeIcon
                  icon={faCoins}
                  style={FA_ICON_STYLE}
                  className='text-xs'
                />
                <span className='font-bold'>
                  {(udata.points || 0).toLocaleString()} coins
                </span>
              </button>
            </div>
            <div className='flex gap-4 text-[13px] text-qmuted mb-2'>
              <span>
                Today: {done}/{tasks.length}
              </span>
              <span>Streak: {udata.streak || 0}</span>
            </div>
            <PurchasesToggle
              id={c.id}
              redeems={udata.redemptions || []}
              isOpen={expanded[c.id] || false}
              onToggle={id => {
                const next = { ...expanded };
                next[id] = !next[id];
                setExpanded(next);
              }}
            />
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
