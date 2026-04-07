import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';
import { getLevelTitle, getXpProgress } from '../utils.ts';
import type { Child, UserData } from '../types.ts';

interface KidHeaderProps {
  child: Child;
  userData: UserData;
  onNameTap?: () => void;
  onCoinTap?: () => void;
}

export default function KidHeader(p: KidHeaderProps): React.ReactElement {
  const ch = p.child;
  const ud = p.userData;
  const lvl = ud.level || 1;
  const lt = getLevelTitle(lvl);
  const xpProg = getXpProgress(ud.xp || 0, lvl);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className='sticky top-0 z-[90] bg-white px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-2 shadow-[0_2px_6px_rgba(0,0,0,0.04)]'>
      {/* Row 1: Avatar + Name/Date (left) | Rank + Coins (right) */}
      <div className='flex justify-between items-center mb-1.5'>
        <div className='flex items-center gap-2.5'>
          <div className='text-[28px]'>{ch.avatar}</div>
          <div>
            {p.onNameTap ? (
              <button
                onClick={p.onNameTap}
                className='bg-transparent border-none cursor-pointer p-0 font-display text-lg font-bold text-qslate text-left leading-tight'
              >
                {ch.name}
              </button>
            ) : (
              <div className='font-display text-lg font-bold text-qslate leading-tight'>
                {ch.name}
              </div>
            )}
            <div className='text-[12px] text-qmuted'>{todayStr}</div>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span
            className='text-[11px] font-bold whitespace-nowrap'
            style={{ color: lt.color }}
          >
            {lt.title}
          </span>
          {p.onCoinTap ? (
            <button
              onClick={p.onCoinTap}
              className='flex items-center gap-1.5 bg-qmint rounded-badge px-3 py-1.5 border-none cursor-pointer'
              aria-label={`Coin balance: ${(ud.points || 0).toLocaleString()} coins. Tap to view details.`}
            >
              <FontAwesomeIcon
                icon={faCoins}
                style={FA_ICON_STYLE}
                className='text-sm'
              />
              <span className='font-display text-lg font-bold text-qslate'>
                {(ud.points || 0).toLocaleString()}
              </span>
            </button>
          ) : (
            <div
              className='flex items-center gap-1.5 bg-qmint rounded-badge px-3 py-1.5'
              role='status'
              aria-label={`Coin balance: ${(ud.points || 0).toLocaleString()} coins`}
            >
              <FontAwesomeIcon
                icon={faCoins}
                style={FA_ICON_STYLE}
                className='text-sm'
              />
              <span className='font-display text-lg font-bold text-qslate'>
                {(ud.points || 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Level bar */}
      <div className='flex items-center gap-2'>
        <span className='text-[11px] font-bold whitespace-nowrap shrink-0 text-qmuted'>
          Lvl. {lvl}
        </span>
        <div className='flex-1 h-4 bg-qmint-dim rounded-full relative overflow-hidden'>
          <div
            className='h-full rounded-full transition-all duration-700 ease-out'
            role='progressbar'
            aria-label='XP progress'
            aria-valuemin={0}
            {...(xpProg.needed > 0
              ? {
                  'aria-valuenow': xpProg.current,
                  'aria-valuemax': xpProg.needed,
                }
              : { 'aria-valuetext': 'Max level' })}
            style={{
              width: `${Math.max(xpProg.pct, 8)}%`,
              background: ch.color,
            }}
          />
          <span className='absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mix-blend-difference'>
            {lvl >= 20 ? 'MAX' : `${xpProg.current} / ${xpProg.needed} XP`}
          </span>
        </div>
      </div>
    </div>
  );
}
