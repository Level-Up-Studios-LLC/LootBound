import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCircleQuestion } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { FA_ICON_STYLE } from '../../constants.ts';
import HamburgerMenu from '../../components/HamburgerMenu.tsx';
import OverviewTab from './OverviewTab.tsx';
import ApprovalsTab from './ApprovalsTab.tsx';
import ReviewTab from './ReviewTab.tsx';
import TasksTab from './TasksTab.tsx';
import RewardsTab from './RewardsTab.tsx';
import ChildrenTab from './ChildrenTab.tsx';
import SettingsTab from './SettingsTab.tsx';

export default function AdminScreen(): React.ReactElement {
  var _atab = useState<string>('overview'),
    atab = _atab[0],
    setAtab = _atab[1];
  var _codeCopied = useState<boolean>(false),
    setCodeCopied = _codeCopied[1];

  var ctx = useAppContext();
  var cfg = ctx.cfg;
  var pendingCount = ctx.pendingCount;

  var bottomTabs: [string, string, string][] = [
    ['overview', 'chart-bar', 'Overview'],
    [
      'approvals',
      'circle-check',
      'Approvals' + (pendingCount > 0 ? ' (' + pendingCount + ')' : ''),
    ],
    ['review', 'magnifying-glass', 'Review'],
    ['tasks', 'list-check', 'Missions'],
    ['rewards', 'treasure-chest', 'Loot'],
  ];

  function handleCopyCode(): void {
    if (cfg && cfg.familyCode) {
      navigator.clipboard.writeText(cfg.familyCode).then(function () {
        setCodeCopied(true);
        ctx.notify('Copied!');
        setTimeout(function () {
          setCodeCopied(false);
        }, 2000);
      });
    }
  }

  return (
    <div className='p-4 pb-[72px]'>
      <div className='flex justify-between items-center mb-4'>
        <div className='font-display text-2xl font-bold text-qslate'>
          Parent Dashboard
        </div>
        <HamburgerMenu
          items={[
            {
              id: 'children',
              icon: 'children',
              label: 'Children',
              onClick: function () {
                setAtab('children');
              },
            },
            {
              id: 'settings',
              icon: 'gear',
              label: 'Settings',
              onClick: function () {
                setAtab('settings');
              },
            },
            {
              id: 'logout',
              icon: 'door-open',
              label: 'Logout',
              onClick: function () {
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
        <div className='flex items-center justify-between bg-qcoral rounded-btn px-4 py-3 mb-4'>
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

      {/* Tab Content */}
      {atab === 'overview' && <OverviewTab onSwitchTab={setAtab} />}
      {atab === 'approvals' && <ApprovalsTab />}
      {atab === 'review' && <ReviewTab />}
      {atab === 'tasks' && <TasksTab onSwitchTab={setAtab} />}
      {atab === 'rewards' && <RewardsTab />}
      {atab === 'children' && <ChildrenTab />}
      {atab === 'settings' && <SettingsTab />}

      {/* Bottom Navigation */}
      <div className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex justify-around bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] pt-1.5 pb-2 z-[100]'>
        {bottomTabs.map(function (t) {
          return (
            <button
              key={t[0]}
              onClick={function () {
                setAtab(t[0]);
              }}
              className={
                'flex flex-col items-center gap-0.5 bg-transparent px-1.5 py-2 rounded-badge border-none cursor-pointer font-body relative ' +
                (atab === t[0] ? 'text-qteal' : 'text-qslate')
              }
            >
              <span className='text-base'>
                <FontAwesomeIcon icon={['fas', t[1]] as any} />
              </span>
              <span className='text-[10px] font-semibold'>{t[2]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
