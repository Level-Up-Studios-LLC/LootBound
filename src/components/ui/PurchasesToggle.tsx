import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping, faChevronRight } from '../../fa.ts';
import { FA_ICON_STYLE } from '../../constants.ts';
import type { Redemption } from '../../types.ts';

interface PurchasesToggleProps {
  id: string;
  redeems: Redemption[];
  isOpen: boolean;
  onToggle: (id: string) => void;
}

export default function PurchasesToggle(
  props: PurchasesToggleProps
): React.ReactElement | null {
  if (props.redeems.length === 0) return null;

  return (
    <div className='mt-3 pt-3 border-t border-qslate/10'>
      <button
        onClick={function () {
          props.onToggle(props.id);
        }}
        className='flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 font-body'
      >
        <FontAwesomeIcon
          icon={faCartShopping}
          className='text-[11px] text-qmuted'
          style={FA_ICON_STYLE}
        />
        <span className='text-xs font-bold text-qslate'>
          Purchases ({props.redeems.length})
        </span>
        <FontAwesomeIcon
          icon={faChevronRight}
          className={'text-[9px] text-qmuted transition-transform' + (props.isOpen ? ' rotate-90' : '')}
        />
      </button>
      {props.isOpen && (
        <div className='mt-2'>
          {props.redeems.slice().reverse().map(function (r, i) {
            return (
              <div
                key={r.rewardId + '-' + r.date + '-' + i}
                className='flex justify-between items-center rounded-badge px-2.5 py-1.5 mb-1 text-[11px] bg-white/60'
              >
                <span className='text-qslate'>{r.name}</span>
                <span className='text-qcoral font-semibold'>
                  -{r.cost}
                </span>
                <span className='text-qmuted'>{r.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
