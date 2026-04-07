import React from 'react';
import SlideScreen from '../../components/ui/SlideScreen.tsx';
import { LOOT_PRESETS, type LootPreset } from '../../data/lootPresets.ts';

interface LootPresetScreenProps {
  onSelect: (preset: LootPreset) => void;
  onBack: () => void;
}

export default function LootPresetScreen(
  p: LootPresetScreenProps
): React.ReactElement {
  return (
    <SlideScreen title='Choose Preset Loot' onBack={p.onBack}>
      <div className='grid grid-cols-2 gap-3'>
        {LOOT_PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => p.onSelect(preset)}
            className='flex flex-col items-center gap-2 bg-white rounded-badge px-3 py-4 border border-qborder cursor-pointer font-body hover:bg-qmint/30 transition-colors'
          >
            <span className='text-3xl'>{preset.icon}</span>
            <span className='font-semibold text-qslate text-xs text-center leading-tight'>
              {preset.name}
            </span>
            <span className='text-qteal text-xs font-bold'>
              {preset.cost} coins
            </span>
          </button>
        ))}
      </div>
    </SlideScreen>
  );
}
