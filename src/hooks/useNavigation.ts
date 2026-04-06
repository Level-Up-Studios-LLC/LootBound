import { useCallback } from 'react';
import { triggerHaptic } from '../services/platform.ts';

const SCREEN_ORDER: Record<string, number> = {
  dashboard: 1,
  tasks: 2,
  scores: 3,
  store: 4,
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useNavigation(setScreen: (s: string) => void) {
  const navigate = useCallback(
    (
      target: string,
      direction?: 'forward' | 'back',
      currentScreen?: string
    ) => {
      triggerHaptic('light');

      if (prefersReducedMotion() || !document.startViewTransition) {
        setScreen(target);
        return;
      }

      // Auto-determine direction for BNav tabs
      let dir = direction;
      if (!dir && currentScreen) {
        const from = SCREEN_ORDER[currentScreen];
        const to = SCREEN_ORDER[target];
        if (from !== undefined && to !== undefined) {
          dir = to >= from ? 'forward' : 'back';
        }
      }
      if (!dir) dir = 'forward';

      if (dir === 'back') {
        document.documentElement.classList.add('nav-back');
      } else {
        document.documentElement.classList.remove('nav-back');
      }

      const transition = document.startViewTransition(() => {
        setScreen(target);
      });

      transition.finished
        .then(() => {
          document.documentElement.classList.remove('nav-back');
        })
        .catch(() => {
          // Transition aborted (rapid navigation) — still clean up
          document.documentElement.classList.remove('nav-back');
        });
    },
    [setScreen]
  );

  return navigate;
}
