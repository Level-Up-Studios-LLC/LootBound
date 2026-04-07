import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faMinus, faPlus } from '../fa.ts';
import { FA_ICON_STYLE, MIN_COINS } from '../constants.ts';
import { useAppContext } from '../context/AppContext.tsx';
import { freshUser, getLevelTitle, getToday } from '../utils.ts';
import FullScreenSlideUp from './ui/FullScreenSlideUp.tsx';
import Modal from './ui/Modal.tsx';
import type { Redemption, CoinAdjustment } from '../types.ts';

interface ChildProfileSlideUpProps {
  childId: string;
  onClose: () => void;
}

type HistoryFilter = 'all' | 'tasks' | 'rewards' | 'adjustments';

interface HistoryItem {
  type: 'task' | 'reward' | 'adjustment';
  label: string;
  coins: number;
  date: string;
}

export default function ChildProfileSlideUp(
  p: ChildProfileSlideUpProps
): React.ReactElement {
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const ctx = useAppContext();
  const child = ctx.getChild(p.childId);
  const ud = ctx.allU[p.childId] || freshUser();
  const lt = getLevelTitle(ud.level || 1);

  // Build history items
  const history: HistoryItem[] = [];

  // Rewards (redemptions)
  if (ud.redemptions) {
    ud.redemptions.forEach((r: Redemption) => {
      history.push({
        type: 'reward',
        label: `Loot "${r.name}" purchased`,
        coins: -r.cost,
        date: r.date,
      });
    });
  }

  // Adjustments
  if (ud.adjustments) {
    ud.adjustments.forEach((a: CoinAdjustment) => {
      history.push({
        type: 'adjustment',
        label: a.reason
          ? `Balance adjustment: ${a.reason}`
          : 'Balance adjustment',
        coins: a.amount,
        date: a.date,
      });
    });
  }

  // Tasks (from taskLog) — include completed and missed entries
  if (ud.taskLog) {
    Object.entries(ud.taskLog).forEach(([date, logs]) => {
      Object.values(logs as Record<string, any>).forEach((entry: any) => {
        if (!entry || entry.rejected) return;
        const name = entry.taskName || 'Mission';
        if (entry.status === 'missed') {
          history.push({
            type: 'task',
            label: `Mission "${name}" missed`,
            coins: typeof entry.points === 'number' ? entry.points : 0,
            date,
          });
        } else if (typeof entry.points === 'number') {
          const statusLabel =
            entry.status === 'early'
              ? 'completed early'
              : entry.status === 'late'
                ? 'completed late'
                : 'completed';
          history.push({
            type: 'task',
            label: `Mission "${name}" ${statusLabel}`,
            coins: entry.points,
            date,
          });
        }
      });
    });
  }

  // Sort by date descending
  history.sort((a, b) => b.date.localeCompare(a.date));

  const filtered = history.filter(h => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return h.type === 'task';
    if (filter === 'rewards') return h.type === 'reward';
    if (filter === 'adjustments') return h.type === 'adjustment';
    return true;
  });

  // Group by date
  const grouped: Record<string, HistoryItem[]> = {};
  filtered.forEach(h => {
    const key =
      h.date === getToday()
        ? 'Today'
        : new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });

  const previewBalance = Math.max(MIN_COINS, (ud.points || 0) + adjustAmount);

  const doAdjust = async () => {
    if (adjustAmount === 0) return;
    try {
      await ctx.addBonus(p.childId, adjustAmount, adjustReason.trim());
      setAdjustAmount(0);
      setAdjustReason('');
      setShowAdjust(false);
    } catch (_e) {
      // addBonus handles its own error notification; keep dialog open
    }
  };

  const initials = child
    ? (() => {
        const parts = child.name.trim().split(/\s+/);
        return parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : child.name.slice(0, 2).toUpperCase();
      })()
    : '?';

  return (
    <FullScreenSlideUp title='Coin Balance' onCancel={p.onClose}>
      {/* Profile header */}
      <div className='bg-qmint rounded-card p-5 flex flex-col items-center mb-5'>
        <div className='w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl mb-2'>
          {child?.avatar || initials}
        </div>
        <div className='font-display text-lg font-bold text-qslate'>
          {child?.name || 'Child'}
        </div>
        <div className='flex items-center gap-1.5 mt-1'>
          <FontAwesomeIcon
            icon={faCoins}
            style={FA_ICON_STYLE}
            className='text-sm'
          />
          <span className='font-display text-2xl font-bold text-qslate'>
            {(ud.points || 0).toLocaleString()}
          </span>
        </div>
        <div className='text-xs font-bold mt-0.5' style={{ color: lt.color }}>
          Lv.{ud.level || 1} {lt.title}
        </div>
      </div>

      {/* Adjust button */}
      <div className='flex justify-center mb-5'>
        <button
          onClick={() => setShowAdjust(true)}
          className='bg-qteal-btn text-white rounded-badge px-6 py-2.5 text-sm font-bold border-none cursor-pointer font-body hover:brightness-110 active:scale-[0.97] transition-all'
        >
          Adjust Coins
        </button>
      </div>

      {/* History */}
      <div className='bg-qyellow rounded-card p-4 mb-0'>
        <div className='flex justify-between items-center mb-3'>
          <span className='font-display text-base font-bold text-qslate'>
            History
          </span>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as HistoryFilter)}
          className='quest-input mb-3 text-sm'
        >
          <option value='all'>All Records</option>
          <option value='tasks'>Tasks Only</option>
          <option value='rewards'>Rewards Only</option>
          <option value='adjustments'>Adjustments Only</option>
        </select>

        {Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel} className='mb-4'>
            <div className='text-[11px] font-bold text-qmuted uppercase tracking-wide mb-2'>
              {dateLabel}
            </div>
            <div className='flex flex-col gap-2'>
              {items.map((item, i) => (
                <div
                  key={i}
                  className='flex items-center gap-3 bg-white rounded-badge px-3 py-2.5 border border-qborder'
                >
                  <div
                    className={
                      'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ' +
                      (item.coins >= 0 ? 'bg-qteal' : 'bg-qcoral')
                    }
                  >
                    {item.type === 'task'
                      ? '\u2714'
                      : item.type === 'adjustment'
                        ? '\u2696'
                        : '\u{1F381}'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-[13px] text-qslate font-medium leading-snug'>
                      {item.label}
                    </div>
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <FontAwesomeIcon
                      icon={faCoins}
                      style={FA_ICON_STYLE}
                      className='text-[10px]'
                    />
                    <span
                      className={
                        'text-sm font-bold ' +
                        (item.coins >= 0 ? 'text-qteal' : 'text-qcoral')
                      }
                    >
                      {item.coins > 0 ? '+' : ''}
                      {item.coins}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className='text-center text-qmuted text-sm py-8'>
            No records yet.
          </div>
        )}
      </div>

      {/* Adjust dialog */}
      {showAdjust && (
        <Modal title='Adjust' onClose={() => setShowAdjust(false)}>
          {/* Stop Escape from propagating to parent FullScreenSlideUp */}
          <div
            onKeyDown={e => {
              if (e.key === 'Escape') e.stopPropagation();
            }}
            className='flex flex-col gap-4'
          >
            {/* +/- stepper */}
            <div className='flex items-center gap-3'>
              <button
                onClick={() => setAdjustAmount(a => a - 1)}
                className='w-10 h-10 rounded-full bg-qcoral-dim text-qcoral flex items-center justify-center border-none cursor-pointer text-lg font-bold'
                aria-label='Decrease by 1'
              >
                <FontAwesomeIcon icon={faMinus} />
              </button>
              <input
                type='number'
                value={adjustAmount}
                onChange={e => {
                  const v = e.target.value === '' ? 0 : Number(e.target.value);
                  setAdjustAmount(Number.isFinite(v) ? v : 0);
                }}
                className='quest-input flex-1 text-center font-display text-xl font-bold'
              />
              <button
                onClick={() => setAdjustAmount(a => a + 1)}
                className='w-10 h-10 rounded-full bg-qteal-dim text-qteal flex items-center justify-center border-none cursor-pointer text-lg font-bold'
                aria-label='Increase by 1'
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>

            {/* Updated balance preview (clamped to MIN_COINS) */}
            <div className='text-sm text-qmuted'>
              Updated Balance:{' '}
              <span className='font-bold text-qslate'>
                {previewBalance.toLocaleString()}
              </span>
            </div>

            {/* Preset amounts */}
            <div className='grid grid-cols-3 gap-2'>
              {[5, 10, 25, 50, 100, -10, -25, -50].map(amt => (
                <button
                  key={amt}
                  type='button'
                  onClick={() => setAdjustAmount(amt)}
                  className={
                    'rounded-badge px-3 py-2 text-xs font-bold border-none cursor-pointer font-body ' +
                    (amt > 0
                      ? 'bg-qblue-dim text-qblue'
                      : 'bg-qred-dim text-qred')
                  }
                >
                  {amt > 0 ? '+' : ''}
                  {amt}
                </button>
              ))}
            </div>

            {/* Reason field */}
            <div>
              <input
                placeholder='Write your reason (Optional)'
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className='quest-input'
              />
            </div>

            {/* Save button */}
            <button
              onClick={doAdjust}
              disabled={adjustAmount === 0}
              className={
                'w-full rounded-badge py-3 text-sm font-bold border-none font-body ' +
                (adjustAmount !== 0
                  ? 'bg-qteal text-white cursor-pointer'
                  : 'bg-qslate-dim text-qmuted cursor-not-allowed')
              }
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </FullScreenSlideUp>
  );
}
