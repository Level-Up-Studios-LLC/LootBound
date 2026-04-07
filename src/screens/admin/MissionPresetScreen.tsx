import React from 'react';
import SlideScreen from '../../components/ui/SlideScreen.tsx';
import { TIER_COLORS } from '../../constants.ts';
import {
  MISSION_PRESETS,
  type MissionPreset,
} from '../../data/missionPresets.ts';

interface MissionPresetScreenProps {
  onSelect: (preset: MissionPreset) => void;
  onBack: () => void;
}

export default function MissionPresetScreen(
  p: MissionPresetScreenProps
): React.ReactElement {
  return (
    <SlideScreen title='Choose Preset Task' onBack={p.onBack}>
      <div className='flex flex-col gap-2'>
        {MISSION_PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => p.onSelect(preset)}
            className='flex items-center gap-3 w-full bg-white rounded-badge px-4 py-3 border border-qborder cursor-pointer font-body text-left hover:bg-qmint/30 transition-colors'
          >
            <span className='text-2xl shrink-0'>{preset.icon}</span>
            <span className='flex-1 font-semibold text-qslate text-sm'>
              {preset.name}
            </span>
            <span
              className='text-xs font-bold shrink-0'
              style={{ color: TIER_COLORS[preset.tier] || '#6b7280' }}
            >
              {preset.tier}
            </span>
          </button>
        ))}
      </div>
    </SlideScreen>
  );
}
