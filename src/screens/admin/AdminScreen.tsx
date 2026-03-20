import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCircleQuestion } from '../../fa.ts';
import { getToday } from '../../utils.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { getCurrentUid } from '../../services/auth.ts';
import { onParentMemberSnapshot } from '../../services/firestoreStorage.ts';
import { copyToClipboard } from '../../services/platform.ts';
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
  const [, setCodeCopied] = useState<boolean>(false);
  const [myName, setMyName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid) return;
    return onParentMemberSnapshot(uid, (member) => {
      setMyName(member && member.parentName ? member.parentName : undefined);
    });
  }, []);

  const ctx = useAppContext();
  const cfg = ctx.cfg;
  const pendingCount = ctx.pendingCount;

  // Count reviewable items (completed, not rejected, not missed)
  let reviewCount = 0;
  if (cfg) {
    const d = getToday();
    ctx.children.forEach((c) => {
      const udata = ctx.allU[c.id];
      if (!udata) return;
      const log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
      (cfg.tasks[c.id] || []).forEach((t) => {
        const entry = log[t.id];
        if (entry && !entry.rejected && entry.status !== 'missed') reviewCount++;
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

  const handleCopyCode = (): void => {
    if (!cfg || !cfg.familyCode) return;
    copyToClipboard(cfg.familyCode).then((ok) => {
      if (ok) {
        setCodeCopied(true);
        ctx.notify('Copied!');
        setTimeout(() => {
          setCodeCopied(false);
        }, 2000);
      } else {
        ctx.notify('Long-press the code to copy', 'error');
      }
    });
  };

  return (
    <div className='pb-[72px]'>
      <div className='sticky top-0 z-[90] bg-white px-4 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <div className='flex justify-between items-center mb-3'>
          <div className='font-display text-2xl font-bold text-qslate'>
            {myName
              ? `Hey, ${myName}!`
              : 'Parent Dashboard'}
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
      {cfg && cfg.familyCode && (
        <div className='flex items-center justify-between bg-qcoral rounded-btn px-4 py-3'>
          <div className='flex items-center gap-1.5'>
            <span className='font-semibold'>Family Code</span>
            <div className='relative group'>
              <span className='text-[12px] cursor-help inline-flex items-center justify-center rounded-full'>
                <FontAwesomeIcon icon={faCircleQuestion} />
              </span>
              <div className='absolute top-3/4 left-full -translate-y-1/2 mb-1 px-3 py-2 bg-white rounded-badge text-xs w-52 hidden group-hover:block z-10 text-center leading-relaxed shadow-lg'>
                Share this code with family members so they can join your
                LootBound family on their devices.
              </div>
            </div>
          </div>
          <div className='flex flex-col items-end relative'>
            <button
              onClick={handleCopyCode}
              className='font-display text-base font-bold text-qslate tracking-[4px] bg-transparent border-none cursor-pointer p-0 hover:opacity-80 transition-opacity flex items-center gap-1.5'
            >
              {cfg.familyCode}
              <FontAwesomeIcon icon={faCopy} className='text-xs' />
            </button>
          </div>
        </div>
      )}
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
        {bottomTabs.map((t) => {
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