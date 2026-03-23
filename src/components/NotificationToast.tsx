import { useTransition, animated, config } from '@react-spring/web';
import type { Notification } from '../types.ts';

interface NotificationToastProps {
  notif: Notification | null;
}

export default function NotificationToast(p: NotificationToastProps) {
  const transition = useTransition(p.notif, {
    from: { opacity: 0, y: -30, scale: 0.9 },
    enter: { opacity: 1, y: 0, scale: 1 },
    leave: { opacity: 0, y: -30, scale: 0.9 },
    config: config.stiff,
  });

  return transition((style, item) => {
    if (!item) return null;
    const isLevelUp = item.type === 'levelup';
    const isStreak = item.type === 'streak';
    const isSuccess = item.type === 'success' || isLevelUp || isStreak;
    const bg = isLevelUp
      ? 'bg-qpurple'
      : isStreak
        ? 'bg-gradient-to-r from-qcoral to-qpurple'
        : isSuccess
          ? 'bg-qteal'
          : 'bg-qcoral';
    return (
      <animated.div
        className={
          'fixed top-4 left-1/2 px-6 py-3 rounded-btn font-bold text-sm z-[1000] text-white shadow-lg ' +
          bg
        }
        style={{
          opacity: style.opacity,
          transform: style.y.to(
            (y) =>
              `translateX(-50%) translateY(${y}px) scale(${style.scale.get()})`
          ),
        }}
      >
        {isLevelUp ? '🎉 ' : isStreak ? '🔥 ' : ''}
        {item.msg}
      </animated.div>
    );
  });
}
