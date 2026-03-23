import React from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FA_ICON_STYLE } from '../../constants.ts';

interface EmptyStateProps {
  icon: any;
  title: string;
  description: string;
  ctaText?: string;
  onCta?: () => void;
}

export default function EmptyState(props: EmptyStateProps): React.ReactElement {
  const spring = useSpring({
    from: { opacity: 0, y: 16 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  });

  return (
    <animated.div
      className='text-center py-10 px-5 text-qmuted'
      style={{
        opacity: spring.opacity,
        transform: spring.y.to(v => `translateY(${v}px)`),
      }}
    >
      <div className='text-[32px] mb-3'>
        <FontAwesomeIcon icon={props.icon} style={FA_ICON_STYLE} />
      </div>
      <div className='font-bold text-base mb-2 text-qslate'>{props.title}</div>
      <div className='text-[13px] leading-relaxed max-w-[300px] mx-auto'>
        {props.description}
      </div>
      {props.ctaText && props.onCta && (
        <div className='text-[13px] mt-4 text-qmuted'>
          <button
            onClick={props.onCta}
            className='bg-transparent border-none text-qteal font-bold cursor-pointer font-body text-[13px] p-0'
          >
            {props.ctaText}
          </button>
        </div>
      )}
    </animated.div>
  );
}
