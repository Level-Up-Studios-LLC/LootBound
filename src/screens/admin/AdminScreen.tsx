import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCircleQuestion } from '../../fa.ts';
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
  var _atab = useState<string>('overview'),
    atab = _atab[0],
    setAtab = _atab[1];
  var _codeCopied = useState<boolean>(false),
    setCodeCopied = _codeCopied[1];
  var _myName = useState<string | undefined>(undefined),
    myName = _myName[0],
    setMyName = _myName[1];

  useEffect(function () {
    var uid = getCurrentUid();
    if (!uid) return;
    return onParentMemberSnapshot(uid, function (member) {
      setMyName(member && member.parentName ? member.parentName : undefined);
    });
  }, []);

  var ctx = useAppContext();
  var cfg = ctx.cfg;
  var pendingCount = ctx.pendingCount;

  // Count reviewable items (completed, not rejected, not missed)
  var reviewCount = 0;
  if (cfg) {
    var d = getToday();
    ctx.children.forEach(function (c) {
      var udata = ctx.allU[c.id];
      if (!udata) return;
      var log = udata.taskLog && udata.taskLog[d] ? udata.taskLog[d] : {};
      (cfg!.tasks[c.id] || []).forEach(function (t) {
        var entry = log[t.id];
        if (entry && !entry.rejected && entry.status !== 'missed') reviewCount++;
      });
    });
  }

  var bottomTabs: [string, string, string, number][] = [
    ['overview', 'chart-bar', 'Overview', 0],
    ['approvals', 'circle-check', 'Approvals', pendingCount],
    ['review', 'magnifying-glass', 'Review', reviewCount],
    ['tasks', 'crosshairs', 'Missions', 0],
    ['rewards', 'treasure-chest', 'Loot', 0],
  ];

  function handleCopyCode(): void {
    if (!cfg || !cfg.familyCode) return;
    var text = cfg.familyCode;

    function onSuccess() {
      setCodeCopied(true);
      ctx.notify('Copied!');
      setTimeout(function () {
        setCodeCopied(false);
      }, 2000);
    }

    // Try modern clipboard API first, fall back to execCommand for iOS Safari
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
        fallbackCopy(text, onSuccess);
      });
    } else {
      fallbackCopy(text, onSuccess);
    }
  }

  function fallbackCopy(text: string, cb: () => void): void {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      var ok = document.execCommand('copy');
      if (ok) {
        cb();
      } else {
        ctx.notify('Long-press the code to copy', 'error');
      }
    } catch (_e) {
      ctx.notify('Long-press the code to copy', 'error');
    } finally {
      document.body.removeChild(ta);
    }
  }

  return (
    <div className='pb-[72px]'>
      <div className='sticky top-0 z-[90] bg-white px-4 pt-4 pb-3 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
        <div className='flex justify-between items-center mb-3'>
          <div className='font-display text-2xl font-bold text-qslate'>
            {myName
              ? 'Hey, ' + myName + '!'
              : 'Parent Dashboard'}
          </div>
          <HamburgerMenu
          items={[
            {
              id: 'account',
              icon: 'circle-user',
              label: 'Account',
              onClick: function () {
                setAtab('account');
              },
            },
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
              icon: 'left-from-bracket',
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
        {bottomTabs.map(function (t) {
          var badge = t[3];
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
              <IconBadge icon={t[1]} badge={badge} />
              <span className='text-xs font-semibold'>{t[2]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
