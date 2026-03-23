import React from 'react';
import { useSpring, animated, config } from '@react-spring/web';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  bgColor?: string;
}

export default function Modal(props: ModalProps): React.ReactElement {
  const overlaySpring = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: config.stiff,
  });

  const cardSpring = useSpring({
    from: { opacity: 0, y: 30, scale: 0.9 },
    to: { opacity: 1, y: 0, scale: 1 },
    config: config.stiff,
  });

  return (
    <animated.div
      className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'
      style={{ opacity: overlaySpring.opacity }}
    >
      <animated.div
        className={
          (props.bgColor || 'bg-qyellow') +
          ' rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto shadow-lg'
        }
        style={{
          opacity: cardSpring.opacity,
          transform: cardSpring.y.to(
            y => `translateY(${y}px) scale(${cardSpring.scale.get()})`
          ),
        }}
      >
        <div className='font-display text-xl font-bold mb-4 text-qslate'>
          {props.title}
        </div>
        {props.children}
      </animated.div>
    </animated.div>
  );
}
