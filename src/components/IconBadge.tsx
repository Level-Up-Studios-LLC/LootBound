import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconName } from '@fortawesome/fontawesome-svg-core';

interface IconBadgeProps {
  icon: IconName | string;
  badge?: number;
}

export default function IconBadge(p: IconBadgeProps) {
  var display = p.badge != null && p.badge > 99 ? '99+' : p.badge;
  return (
    <span className="text-xl relative">
      <FontAwesomeIcon icon={['fas', p.icon as IconName]} />
      {p.badge != null && p.badge > 0 && (
        <span
          className="absolute -top-1.5 -right-2.5 min-w-[16px] max-w-[28px] h-[16px] bg-qcoral text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none overflow-hidden"
          role="status"
          aria-label={p.badge + ' pending'}
          title={String(p.badge)}
        >
          {display}
        </span>
      )}
    </span>
  );
}
