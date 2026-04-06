import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faGamepadModern } from '../fa.ts';
import { FA_ICON_STYLE } from '../constants.ts';

interface RoleSelectScreenProps {
  onSelectRole: (role: 'parent' | 'kid') => void;
}

export default function RoleSelectScreen(
  props: RoleSelectScreenProps
): React.ReactElement {
  return (
    <main className='page-wrapper page-centered'>
      <h1 className='font-display text-5xl font-bold text-qslate tracking-wider mb-4'>
        LOOTBOUND
      </h1>
      <div className='text-base text-qmuted mb-5'>Who are you?</div>

      <div className='flex gap-6 justify-center'>
        <button
          onClick={() => {
            props.onSelectRole('parent');
          }}
          className='flex flex-col items-center justify-center gap-3 py-8 px-6 bg-qmint rounded-card cursor-pointer min-w-[140px] max-w-[200px] font-body text-qslate transition-all duration-200 hover:scale-105 active:scale-95'
        >
          <div className='text-5xl' aria-hidden='true'>
            <FontAwesomeIcon icon={faShieldHalved} style={FA_ICON_STYLE} />
          </div>
          <div className='font-display text-xl font-semibold'>I'm a Parent</div>
          <div className='text-xs text-qmuted'>Manage missions &amp; loot</div>
        </button>

        <button
          onClick={() => {
            props.onSelectRole('kid');
          }}
          className='flex flex-col items-center justify-center gap-3 py-8 px-6 bg-qyellow rounded-card cursor-pointer min-w-[140px] max-w-[200px] font-body text-qslate transition-all duration-200 hover:scale-105 active:scale-95'
        >
          <div className='text-5xl' aria-hidden='true'>
            <FontAwesomeIcon icon={faGamepadModern} style={FA_ICON_STYLE} />
          </div>
          <div className='font-display text-xl font-semibold'>I'm a Kid</div>
          <div className='text-xs text-qmuted'>
            Complete missions &amp; earn coins
          </div>
        </button>
      </div>
    </main>
  );
}
