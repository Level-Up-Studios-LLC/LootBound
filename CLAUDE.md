# CLAUDE.md — Quest Board

## Project Overview

Quest Board is a gamified chore/task reward system for children, built as a React web app. It was designed for the Johnson family (Marc and Pheline) to help their kids develop responsibility and good habits through a video-game-inspired point system.

The app runs on iPads and uses localStorage for persistence. The long-term plan is to deploy it as a PWA and eventually migrate storage to a real backend (Supabase, Firebase, etc.) for multi-device sync.

## Tech Stack

- **Framework:** React 18 (functional components, hooks only)
- **Build Tool:** Vite 6
- **Storage:** localStorage (adapted from Claude artifact `window.storage` API)
- **Styling:** Inline styles via JS objects (no CSS files, no Tailwind)
- **Fonts:** Google Fonts — Fredoka (headings/display), Nunito (body)
- **Deployment Target:** iPad Safari (designed as a mobile-first 480px max-width app)

## File Structure

```
quest-board/
├── index.html              # Entry HTML with mobile meta tags
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite config (port 3000, auto-open)
├── .gitignore
├── CLAUDE.md               # This file — project context for Claude Code
├── public/                 # Static assets (empty for now)
└── src/
    ├── main.jsx            # React DOM entry point
    ├── App.jsx             # Main application component (all-in-one)
    └── storage.js          # localStorage adapter (async API)
```

## Running the Project

```bash
npm install
npm run dev       # Starts dev server on http://localhost:3000
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

## Default Parent PIN: 1234

---

## Core Concepts

### Point System

Tasks earn points based on their assigned tier. Points scale based on when the task is completed relative to its time window:

| Timing  | Multiplier | Description                       |
| ------- | ---------- | --------------------------------- |
| Early   | x 1.25     | Completed before the window opens |
| On Time | x 1.0      | Completed within the window       |
| Late    | x 0.5      | Completed after the window closes |
| Missed  | -Base      | Not completed by bedtime (9 PM)   |

### Tier System

Tasks are assigned a tier (1–4). Each tier has a configurable base point value. Defaults:

| Tier | Default Points |
| ---- | -------------- |
| 1    | 5 pts          |
| 2    | 10 pts         |
| 3    | 20 pts         |
| 4    | 30 pts         |

Parents can change tier point values in Settings. When a parent assigns a task a tier, the points are derived automatically — there is no separate points field.

### Time Windows

Each task has a start and end time defining its "on-time" window. For example, "Make bed" might be 7:00 AM – 9:00 AM. Completing before 7 AM = early bonus. Completing after 9 AM = late penalty. Not done by 9 PM bedtime = missed.

### Recurring Tasks

- **Daily tasks**: Repeat every day automatically
- **Weekly tasks**: Repeat on their assigned day of the week (e.g., "Clean room" every Saturday)

Task definitions persist in config. Only the completion log resets.

### Bedtime Cutoff

All task windows hard-cap at 9:00 PM. After bedtime:
- The app shows a red "Tasks locked" banner
- Incomplete tasks auto-mark as missed with full point deductions
- The "Done" button is disabled
- Streaks break if any tasks were missed

### Weekly Reset

On Sunday at midnight (checked on first load each week):
- All task completion logs clear
- Points, streaks, and redemption history carry over
- The `lastWeeklyReset` field in config prevents double-resets

### Streak System

Completing ALL daily tasks on time (or early) earns a perfect day. Consecutive perfect days build a streak.

| Streak  | Bonus    |
| ------- | -------- |
| 3 days  | +20 pts  |
| 7 days  | +75 pts  |
| 30 days | +300 pts |

A missed task (not late — missed) breaks the streak. The app tracks both current streak and all-time best.

---

## Features Implemented (v5)

### Kid Features

- **Login screen** with profile cards, optional 4-digit PIN per child
- **Dashboard** — today's progress %, streak, points badge, "Up Next" task list
- **Tasks screen** — full daily quest list with status badges, photo capture on completion, point breakdown per task
- **Scoreboard** — dedicated tab ranking all children by points with stats (today's completion, streak, best streak), crown icon for leader
- **Reward Store** — browse rewards, see limits and availability, redeem or request approval, pending approval status, redemption history

### Parent Features

- **Overview** — all children at a glance with points, today's progress, streak, quick +/- point adjustment buttons
- **Approvals** — queue for high-value or flagged redemptions, approve/deny each
- **Review** — see all completed tasks for today with photo proof, reject tasks that don't meet standards (sends back for redo, deducts points)
- **Tasks** — add/edit/delete tasks per child with tier, time window, daily/weekly toggle, day-of-week selector for weekly tasks
- **Rewards** — full CRUD for rewards with cost, icon, active/inactive toggle, redemption limits (per day, per week, or none), require-approval flag
- **Children** — add new children (name, age, avatar, color), remove children (with confirmation), manage PINs per child
- **Settings** — edit tier point values, set approval threshold, change parent PIN, system info display, reset all data

### Abuse Prevention

| Guard                     | What it prevents                                |
| ------------------------- | ----------------------------------------------- |
| 60-second task cooldown   | Rapid-fire spam completing tasks                |
| Camera-only photo capture | Uploading old/fake photos from gallery          |
| Per-reward limits         | Burning points on the same reward repeatedly    |
| Parent approval queue     | High-value redemptions without oversight        |
| Approval threshold        | Auto-flags rewards above X points (default 300) |
| Kid PINs                  | Sibling tampering / cross-account access        |
| Bedtime lockout           | Late-night task manipulation                    |
| Full audit log            | All redemptions logged with timestamps          |

---

## Data Architecture

### Config (stored at key `qb-cfg-v5`)

```js
{
  children: [
    { id: "donovan", name: "Donovan", age: 12, avatar: "🎮", color: "#3b82f6", pin: null },
    { id: "imani", name: "Imani", age: 6, avatar: "🌟", color: "#ec4899", pin: null },
  ],
  tasks: {
    donovan: [ { id, name, tier, windowStart, windowEnd, daily, dueDay }, ... ],
    imani: [ ... ],
  },
  rewards: [
    { id, name, cost, icon, active, limitType, limitMax, requireApproval },
  ],
  parentPin: "1234",
  tierPoints: { 1: 5, 2: 10, 3: 20, 4: 30 },
  approvalThreshold: 300,
  lastWeeklyReset: "2026-03-08",  // ISO date string of last Sunday
}
```

### Per-Child Data (stored at key `qb-child-{id}-v5`)

```js
{
  points: 0,
  streak: 0,
  bestStreak: 0,
  lastPerfectDate: null,       // ISO date string
  lastTaskTime: 0,             // Unix seconds (for cooldown)
  taskLog: {
    "2026-03-11": {
      "d1": { completedAt: 540, status: "ontime", points: 10, photo: "data:image/jpeg;base64,...", rejected: false },
      "_bedtimeApplied": true,  // Flag to prevent double-penalizing
    },
  },
  redemptions: [
    { rewardId: "r1", name: "15 min extra screen time", cost: 50, date: "2026-03-11" },
  ],
  pendingRedemptions: [
    { rewardId: "r7", name: "Big reward", cost: 500, icon: "🏆", date: "2026-03-11", requestedAt: 1741700000000 },
  ],
}
```

### Storage Key Scheme

- `qb-cfg-v5` — app config (children, tasks, rewards, settings)
- `qb-child-{id}-v5` — per-child data (points, logs, redemptions)

The `v5` suffix is a schema version. If you make breaking changes to the data shape, bump this to avoid corrupting old data.

---

## Design Decisions

- **Single-file component (App.jsx):** The entire app lives in one file. This was intentional for the prototype phase. The next step is to break it into components: LoginScreen, Dashboard, TasksScreen, ScoreBoard, Store, AdminPanel, etc.

- **Inline styles:** No CSS framework. All styles are defined in the `ns` object at the bottom of App.jsx. This kept the prototype self-contained but should migrate to CSS modules or Tailwind when the codebase grows.

- **Async storage API:** Even though localStorage is synchronous, the storage adapter uses async functions. This makes the eventual migration to a real database seamless — swap out `storage.js` and nothing else changes.

- **Camera capture:** The file input uses `capture="environment"` to force the device camera on iPads/phones. This prevents kids from picking old photos from their camera roll. On desktop browsers, it falls back to a normal file picker.

- **No routing library:** Screen navigation uses a simple `screen` state variable. React Router would be the right move once the app grows.

---

## Memory Maintenance

At the end of each conversation (or when significant work is completed), review and update your memory files to capture important decisions, new patterns, version changes, or user feedback. Check existing memories for accuracy and update any that have become outdated.

---

## What's Next (Roadmap)

### Immediate priorities
- [ ] Break App.jsx into separate component files
- [ ] Add CSS modules or Tailwind for styling
- [ ] Add React Router for navigation
- [ ] PWA manifest + service worker for offline support and "Add to Home Screen"
- [ ] Add Melody (age 2) as a child when ready

### Medium-term
- [ ] Backend storage (Supabase or Firebase) for multi-device sync
- [ ] Push notifications for task reminders
- [ ] Weekly summary report for parents (email or in-app)
- [ ] Task history / points-over-time chart
- [ ] Custom reward images instead of just emoji icons
- [ ] Configurable bedtime per child (not just global 9 PM)
- [ ] Configurable weekly reset day

### Nice-to-have
- [ ] Achievement badges (e.g., "First 100 pts", "7-day streak")
- [ ] Sound effects / animations on task completion
- [ ] Dark/light theme toggle
- [ ] Multiple parent accounts with separate PINs
- [ ] Export data as CSV/JSON from admin

---

## Conventions

- **No arrow functions in component body:** Regular `function` declarations are used throughout to avoid minification issues with React's hook ordering detection.
- **Object.assign over spread:** The component uses `Object.assign({}, obj, {key: val})` instead of `{...obj, key: val}` for broader compatibility.
- **Deep clone before mutation:** User data is always `JSON.parse(JSON.stringify(data))` before modification to prevent reference-sharing bugs.
- **Storage keys are prefixed and versioned:** Always use the `qb-` prefix and `-v5` suffix pattern.

---

## Family Context

- **Marc** (Dad) — owner of Level Up Studios LLC, Senior Web Developer at Guardian Recovery Network. Built Quest Board as a family project.
- **Pheline** (Mom) — co-parent, both parents share the admin PIN.
- **Donovan** (age 12) — pre-loaded with age-appropriate tasks including homework, reading, shower, chores.
- **Imani** (age 6) — pre-loaded with simpler tasks like picking up toys, putting shoes away, practicing reading.
- **Melody** (age 2) — not yet in the system. Will be added when she's ready for structured tasks.

The app is designed to run on iPads — each kid logs into their own profile on a shared family tablet or their personal device. PINs prevent kids from accessing each other's profiles.
