# Quest Board

A gamified chore and reward system for kids. Built with React + Vite.

Kids earn points by completing tasks on time, lose points for missing them, and spend points on rewards. Parents manage tasks, review photo proof, and approve high-value redemptions.

## Quick Start

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

**Default Parent PIN:** `1234`

## Features

- Point-based task system with tiers, time windows, and early/late bonuses
- Photo proof required for task completion
- Parent review and reject workflow
- Reward store with per-child redemption limits
- Parent approval queue for high-value rewards
- Scoreboard with streaks and leaderboard
- Dynamic child management (add/remove from admin)
- 9 PM bedtime auto-cutoff
- Weekly reset on Sundays
- Anti-abuse guardrails (cooldowns, camera-only capture, limits)

See [CLAUDE.md](./CLAUDE.md) for full project documentation.
