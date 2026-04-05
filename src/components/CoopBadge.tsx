import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandshake } from '../fa.ts';

interface CoopBadgeProps {
  partnerName: string;
  partnerAvatar?: string;
}

export default function CoopBadge({
  partnerName,
  partnerAvatar,
}: CoopBadgeProps): React.ReactElement {
  return (
    <span className='inline-flex items-center gap-1 bg-qcoop-dim text-qcyan rounded-badge px-2 py-0.5 text-[11px] font-semibold'>
      <FontAwesomeIcon
        icon={faHandshake}
        className='text-[9px]'
        aria-hidden='true'
      />
      <span className='sr-only'>Co-op </span>
      {partnerAvatar && <span>{partnerAvatar}</span>}
      with {partnerName}
    </span>
  );
}
