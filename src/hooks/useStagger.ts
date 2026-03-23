import { useSpring, config as springConfig } from '@react-spring/web';
import type { SpringConfig, SpringValues } from '@react-spring/web';

/**
 * Staggered spring animations without useTrail's internal spring chaining.
 * Avoids the React 19 + React Spring v10 circular priority bug.
 *
 * Each item gets its own independent useSpring with an incremental delay.
 */

const MAX_ITEMS = 20;

interface StaggerConfig {
  from: Record<string, number>;
  to: Record<string, number>;
  config?: SpringConfig;
  baseDelay?: number;
  stagger?: number;
}

type StaggerResult = SpringValues<Record<string, number>>;

export function useStagger(count: number, opts: StaggerConfig): StaggerResult[] {
  const {
    from,
    to,
    config: cfg = springConfig.gentle,
    baseDelay = 0,
    stagger = 60,
  } = opts;

  // We must call hooks unconditionally (rules of hooks), so allocate
  // a fixed number and only use the first `count` results.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s0 = useSpring({ from, to, config: cfg, delay: baseDelay });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s1 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s2 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 2 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s3 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 3 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s4 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 4 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s5 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 5 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s6 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 6 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s7 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 7 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s8 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 8 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s9 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 9 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s10 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 10 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s11 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 11 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s12 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 12 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s13 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 13 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s14 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 14 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s15 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 15 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s16 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 16 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s17 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 17 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s18 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 18 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const s19 = useSpring({ from, to, config: cfg, delay: baseDelay + stagger * 19 });

  const all = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19];
  return all.slice(0, Math.min(count, MAX_ITEMS));
}
