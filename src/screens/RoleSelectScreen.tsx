import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faGamepadModern } from '../fa.ts';

interface RoleSelectScreenProps {
  onSelectRole: (role: 'parent' | 'kid') => void;
}

var duotoneStyle = {
  "--fa-primary-color": "#4B4E6D",
  "--fa-secondary-color": "#FF8C94",
  "--fa-secondary-opacity": "1"
} as any;

export default function RoleSelectScreen(
  props: RoleSelectScreenProps
): React.ReactElement {
  return (
    <div className='page-wrapper page-centered'>
      <div className='font-display text-5xl font-bold text-qslate tracking-wider mb-1'>
        QUEST BOARD
      </div>
      <div className='text-base text-qmuted mb-10'>Who are you?</div>

      <div className='flex gap-6 justify-center'>
        <button
          onClick={function () {
            props.onSelectRole('parent');
          }}
          className='flex flex-col items-center gap-3 py-8 px-9 bg-qmint rounded-card cursor-pointer min-w-[140px] max-w-[200px] font-body text-qslate transition-all duration-200 hover:scale-105 active:scale-95'
        >
          <div className='text-5xl'>
            <FontAwesomeIcon icon={faShieldHalved} style={duotoneStyle} />
          </div>
          <div className='font-display text-xl font-semibold'>I'm a Parent</div>
          <div className='text-xs text-qmuted'>Manage tasks &amp; rewards</div>
        </button>

        <button
          onClick={function () {
            props.onSelectRole('kid');
          }}
          className='flex flex-col items-center gap-3 py-8 px-9 bg-qyellow rounded-card cursor-pointer min-w-[140px] max-w-[200px] font-body text-qslate transition-all duration-200 hover:scale-105 active:scale-95'
        >
          <div className='text-5xl'>
            <FontAwesomeIcon icon={faGamepadModern} style={duotoneStyle} />
          </div>
          <div className='font-display text-xl font-semibold'>I'm a Kid</div>
          <div className='text-xs text-qmuted'>
            Complete quests &amp; earn points
          </div>
        </button>
      </div>
    </div>
  );
}
