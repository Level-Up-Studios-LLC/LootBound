import React, { useState, useEffect } from 'react';
import { getToday } from '../../utils.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { getCurrentUid } from '../../services/auth.ts';
import { onParentMemberSnapshot } from '../../services/firestoreStorage.ts';
import HamburgerMenu from '../../components/HamburgerMenu.tsx';
import IconBadge from '../../components/IconBadge.tsx';
import OverviewTab from './OverviewTab.tsx';
import ApprovalsTab from './ApprovalsTab.tsx';
import ReviewTab from './ReviewTab.tsx';
import TasksTab from './TasksTab.tsx';
import RewardsTab from './RewardsTab.tsx';
import ChildrenTab from './ChildrenTab.tsx';
import SettingsTab from './SettingsTab.tsx';
import AccountTab from './AccountTab.tsx';

export default function AdminScreen(): React.ReactElement {
  const [atab, setAtab] = useState<string>('overview');
  const [myName, setMyName] = useState<string | undefined>(undefined);
  const [myPhoto, setMyPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid) return;
    return onParentMemberSnapshot(uid, member => {
      setMyName(member && member.parentName ? member.parentName : undefined);
      setMyPhoto(member && member.parentPhotoURL ? member.parentPhotoURL : undefined);
    });
  }, []);

  const ctx = useAppContext();
  const cfg = ctx.cfg;
  const pendingCount = ctx.pendingCount;

  // Count reviewable items (completed, not rejected, not missed)
  let reviewCount = 0;
  if (cfg) {
    const d = getToday();
    ctx.children.forEach(c => {
      const udata = ctx.allU[c.id];
      if (!udata) return;
      const log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
      (cfg.tasks[c.id] || []).forEach(t => {
        const entry = log[t.id];
        if (entry && !entry.rejected && entry.status !== 'missed')
          reviewCount++;
      });
    });
  }

  const bottomTabs: [string, string, string, number][] = [
    ['overview', 'chart-bar', 'Overview', 0],
    ['approvals', 'circle-check', 'Approvals', pendingCount],
    ['review', 'magnifying-glass', 'Review', reviewCount],
    ['tasks', 'crosshairs', 'Missions', 0],
    ['rewards', 'treasure-chest', 'Loot', 0],
  ];

  return (
    <div className='pb-[72px]'>
      <div className='sticky top-0 z-[90] bg-white px-4 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <div className='flex justify-between items-center mb-3'>
          <div className='flex items-center gap-2.5'>
            {myPhoto ? (
              <img
                src={myPhoto}
                alt=''
                className='w-9 h-9 rounded-full object-cover shrink-0'
                referrerPolicy='no-referrer'
              />
            ) : myName ? (
              <div className='w-9 h-9 rounded-full bg-qteal/20 flex items-center justify-center font-display font-bold text-qteal text-sm shrink-0'>
                {myName[0].toUpperCase()}
              </div>
            ) : null}
            <div>
              <div className='font-display text-xl font-bold text-qslate leading-tight'>
                {myName || 'Parent Dashboard'}
              </div>
              <div className='text-[12px] text-qmuted'>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
          <HamburgerMenu
            items={[
              {
                id: 'account',
                icon: 'circle-user',
                label: 'Account',
                onClick: () => {
                  setAtab('account');
                },
              },
              {
                id: 'children',
                icon: 'children',
                label: 'Children',
                onClick: () => {
                  setAtab('children');
                },
              },
              {
                id: 'settings',
                icon: 'gear',
                label: 'Settings',
                onClick: () => {
                  setAtab('settings');
                },
              },
              {
                id: 'logout',
                icon: 'left-from-bracket',
                label: 'Logout',
                onClick: () => {
                  if (ctx.onLogout) {
                    ctx.onLogout();
                  } else {
                    ctx.setCurUser(null);
                    ctx.setScreen('login');
                  }
                },
              },
            ]}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className='px-4 pt-3'>
        {atab === 'overview' && <OverviewTab onSwitchTab={setAtab} />}
        {atab === 'approvals' && <ApprovalsTab />}
        {atab === 'review' && <ReviewTab />}
        {atab === 'tasks' && <TasksTab onSwitchTab={setAtab} />}
        {atab === 'rewards' && <RewardsTab />}
        {atab === 'children' && <ChildrenTab />}
        {atab === 'settings' && <SettingsTab />}
        {atab === 'account' && <AccountTab />}
      </div>

      {/* Bottom Navigation */}
      <div className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex justify-around bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] pt-1.5 pb-2 z-[100]'>
        {bottomTabs.map(t => {
          const badge = t[3];
          return (
            <button
              key={t[0]}
              onClick={() => {
                setAtab(t[0]);
              }}
              className={
                'flex flex-col items-center gap-0.5 bg-transparent px-1.5 py-2 rounded-badge border-none cursor-pointer font-body relative ' +
                (atab === t[0] ? 'text-qteal' : 'text-qslate')
              }
            >
              <IconBadge icon={t[1]} badge={badge} />
              <span className='text-xs font-semibold'>{t[2]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
