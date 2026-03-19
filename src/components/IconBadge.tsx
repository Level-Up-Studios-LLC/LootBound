import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface IconBadgeProps {
  icon: string;
  badge?: number;
}

export default function IconBadge(p: IconBadgeProps) {
  return (
    <span className="text-xl relative">
      <FontAwesomeIcon icon={['fas', p.icon] as any} />
      {p.badge != null && p.badge > 0 && (
        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] bg-qcoral text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
          {p.badge}
        </span>
      )}
    </span>
  );
}
