import { SL } from '../constants.ts';
import type { StatusLabel } from '../types.ts';

interface BadgeProps {
  status: string;
}

export default function Badge(p: BadgeProps) {
  const sl: StatusLabel = SL[p.status] || {
    text: '',
    color: '#a0a3b5',
    bg: 'transparent',
  };
  return (
    <span
      className='text-[10px] font-bold px-2.5 py-1 rounded-badge tracking-wide'
      style={{ color: sl.color, background: sl.bg }}
    >
      {sl.text}
    </span>
  );
}
