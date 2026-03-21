# CLAUDE.md — LootBound

## Memory Maintenance

At the end of each conversation (or when significant work is completed), review and update your memory files to capture important decisions, new patterns, version changes, or user feedback. Check existing memories for accuracy and update any that have become outdated.

## Project Overview

LootBound is a gamified chore/task reward system for children, built as a React web app. It was designed for the Joseph family (Marc and Pheline) to help their kids develop responsibility and good habits through a video-game-inspired coin + XP system.

The app runs on all devices, uses Firebase (Firestore + Storage + Auth) for persistence and multi-device sync, and is deployed via Firebase Hosting.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 8
- **Language:** TypeScript (strict mode)
- **Auth:** Firebase Authentication (email/password for parents, anonymous for kids)
- **Database:** Cloud Firestore (real-time sync via onSnapshot listeners)
- **File Storage:** Firebase Storage (photo proof uploads)
- **Hosting:** Firebase Hosting
- **Styling:** Tailwind CSS v4
- **Icons:** FontAwesome Pro 7 (duotone + classic solid + brands, registered in `src/fa.ts`)
- **Error Tracking:** Sentry
- **Fonts:** Google Fonts — Fredoka (display), Nunito (body)
- **Deployment Target:** iPad Safari (mobile-first 480px max-width app)

## Running the Project

```bash
npm install
npm run dev          # Starts dev server on http://localhost:3000
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run type-check   # TypeScript strict checking
npm run format       # Prettier formatting
```

Always run `npm run type-check` after TypeScript changes before committing.

Copy `.env.example` to `.env` and fill in Firebase config values.

---

## Core Concepts

### Tier System (S-F Letter Grades)

Missions are assigned a tier from S (hardest) to F (easiest). Each tier has configurable coin and XP values stored in `Config.tierConfig`:

| Tier | Coins | XP  | Description                    |
| ---- | ----- | --- | ------------------------------ |
| S    | 50    | 40  | Epic — rare, high-effort       |
| A    | 30    | 25  | Hard — real effort required    |
| B    | 20    | 18  | Medium — core daily chores     |
| C    | 12    | 12  | Light — quick responsibilities |
| D    | 7     | 7   | Easy — simple habits           |
| F    | 3     | 3   | Trivial — participation-level  |

Parents can change tier coin/XP values in Settings.

### Timing Multipliers

Coins and XP scale based on when a mission is completed relative to its time window:

| Timing  | Multiplier   | Description                       |
| ------- | ------------ | --------------------------------- |
| Early   | x1.25        | Completed before the window opens |
| On Time | x1.0         | Completed within the window       |
| Late    | x0.5         | Completed after the window closes |
| Missed  | -Coins, 0 XP | Not completed by bedtime          |

**Key rule: XP never goes negative.** Missed tasks deduct coins but award 0 XP. Rejected tasks deduct both coins and XP (clamped to 0).

### XP & Leveling System (20 Levels)

Kids earn XP alongside coins. XP feeds into a 20-level progression system.

**Level titles:** Rookie (1-3) → Adventurer (4-6) → Guardian (7-9) → Champion (10-12) → Hero (13-15) → Legend (16-18) → Mythic (19-20)

**Level coin bonus:** Higher levels earn a percentage bonus on coins per mission: `Math.min(Math.floor(level * 1.32), 25)` percent (+1% at Lv.1, +25% at Lv.20).

**Streak XP multiplier (capped at 2.0x):**

| Streak     | Multiplier |
| ---------- | ---------- |
| 0-2 days   | 1.0x       |
| 3-6 days   | 1.1x       |
| 7-13 days  | 1.25x      |
| 14-20 days | 1.4x       |
| 21-29 days | 1.6x       |
| 30+ days   | 2.0x (cap) |

### Streak System

Completing ALL daily tasks on time (or early) earns a perfect day. Consecutive perfect days build a streak.

| Streak  | Bonus      |
| ------- | ---------- |
| 3 days  | +20 coins  |
| 7 days  | +75 coins  |
| 15 days | +150 coins |
| 30 days | +300 coins |

**Grace day:** Kids get 1 missed day per week without breaking their streak. Tracked via `missedDaysThisWeek` (resets on weekly reset).

### Time Windows

Each task has a start and end time defining its "on-time" window. Completing before start = early bonus. Completing after end = late penalty. Not done by bedtime = missed.

### Recurring Tasks

- **Daily tasks**: Repeat every day automatically
- **Weekly tasks**: Repeat on their assigned day of the week

Task definitions persist in config. Only the completion log resets.

### Bedtime Cutoff

Configurable per family (default 9:00 PM). After bedtime:
- The app shows a "missions locked" banner with the configured time
- Incomplete tasks auto-mark as missed (coins deducted, 0 XP)
- Grace day logic applies (1 missed day/week doesn't break streak)

### Weekly Reset

Configurable reset day (default Sunday). On reset:
- All task completion logs clear
- Coins, XP, levels, streaks, and redemption history carry over
- `missedDaysThisWeek` resets to 0
- `lastWeeklyReset` field prevents double-resets

---

## Features

### Kid Features

- **Dashboard (HQ)** — progress %, streak, coins badge, XP progress bar with level + title, streak multiplier indicator, "Up Next" task list
- **Missions** — daily mission list with colored tier badges (S-F), status indicators, time windows, coin + XP breakdowns, photo capture on completion
- **Leaderboard** — multi-kid: ranked by perfect days with "Top Adventurer" highlight, level titles; solo kid: personal stats view with milestones
- **Loot Shop** — browse rewards, see limits and availability, redeem or request approval, pending status, redemption history with double-submit guard
- **PIN Protection** — optional per-child 4-digit PIN

### Parent Features

- **Overview** — all children with coins, levels, progress, quick +/- adjustments
- **Approvals** — queue for high-value redemptions
- **Review** — completed missions with photo proof; reject sub-standard work (deducts coins + XP, clamped to 0)
- **Mission Management** — CRUD per child with tier (S-F), time windows, daily/weekly scheduling
- **Loot Management** — CRUD for rewards with cost, icon, limits, approval flags
- **Children Management** — add/remove children, manage profiles and PINs
- **Settings** — tier coin/XP values, approval threshold, parent PIN, bedtime, weekly reset day, cooldown
- **Feedback** — links to Canny.io board for feedback, feature requests, and voting

### Abuse Prevention

| Guard                     | What it prevents                            |
| ------------------------- | ------------------------------------------- |
| Configurable cooldown     | Rapid-fire spam completing tasks            |
| Camera-only photo capture | Uploading old/fake photos from gallery      |
| Per-reward limits         | Burning coins on the same reward repeatedly |
| Parent approval queue     | High-value redemptions without oversight    |
| Configurable threshold    | Auto-flags rewards above X coins            |
| Kid PINs                  | Sibling tampering / cross-account access    |
| Bedtime lockout           | Late-night task manipulation                |
| Full audit log            | All redemptions logged with timestamps      |
| XP multiplier cap (2.0x)  | Prevents streak abuse of XP system          |

---

## Data Architecture

### Firestore Collections

```text
families/{familyId}              — Family config
  /children/{childId}            — Child profiles
  /tasks/{taskId}                — Mission definitions (includes childId field)
  /rewards/{rewardId}            — Reward definitions
  /childData/{childId}           — Runtime data (coins, XP, level, streaks, logs)

parentMembers/{uid}              — Per-parent data (familyId, PIN, name)
familyCodes/{code}               — Maps family codes to family IDs
```

### Parent Member (Firestore document: `parentMembers/{uid}`)

```js
{
  familyId: "abc123",              // Links parent to their family
  parentPin: "1234",               // Per-parent PIN (empty string = no PIN set)
  parentName: "Marc",              // Per-parent display name
}
```

**Roles:** Owner (uid === familyId) vs Member (joined via family code). Each parent has their own PIN and name.

### Family Config (Firestore document)

```js
{
  tierConfig: {
    S: { coins: 50, xp: 40 },
    A: { coins: 30, xp: 25 },
    B: { coins: 20, xp: 18 },
    C: { coins: 12, xp: 12 },
    D: { coins: 7, xp: 7 },
    F: { coins: 3, xp: 3 },
  },
  approvalThreshold: 300,
  lastWeeklyReset: "2026-03-08",
  familyCode: "ABC123",
  bedtime: 1260,                   // Minutes from midnight (21:00 = 1260)
  weeklyResetDay: 0,               // 0=Sunday
  cooldown: 60,                    // Seconds between task completions
}
```

### Per-Child Data (Firestore document)

```js
{
  points: 0,                       // Coin balance
  xp: 0,                           // Total XP earned
  level: 1,                        // Current level (1-20)
  streak: 0,
  bestStreak: 0,
  missedDaysThisWeek: 0,           // For grace day tracking
  lastPerfectDate: null,
  lastTaskTime: 0,                 // Unix seconds (cooldown)
  taskLog: {
    "2026-03-11": {
      "taskId": { completedAt: 540, status: "ontime", points: 10, xp: 12, photo: "https://...", rejected: false },
      "_bedtimeApplied": true,
    },
  },
  redemptions: [...],
  pendingRedemptions: [...],
}
```

### Data Migration

When AppContext loads config, it checks for the old numeric `tierPoints` format and auto-migrates to `tierConfig` with letter-grade tiers. Task tiers are migrated from numbers (1→D, 2→C, 3→B, 4→A) with S and F added as defaults. Migration is idempotent — config is only saved after all task migrations succeed.

---

## Auth Flow

1. **Role Selection** — "I'm a Parent" or "I'm a Kid"
2. **Parent Sign-Up** — Step 1: email/Google → Step 2: name, password, family code, referral → PIN creation (skippable) → App
3. **Parent Sign-In** — Step 1: email/Google → Step 2: password → PIN (if set) → App
4. **Returning Parent** — Firebase session persists → PIN screen (if set) or auto-verify → App
5. **Kid Flow** — Enter family code → Select profile → Enter/create PIN → App
6. **PIN semantics** — Per-parent, stored on `parentMembers/{uid}`. Empty string = no PIN set.
7. **Family code** — 6-character alphanumeric, persisted in localStorage for kid devices
8. **Session persistence** — `sessionStorage` with 24h TTL. Parent session bound to UID. Kid session validated against `cfg.children`.
9. **Google linking** — Firebase "one account per email" auto-links. Google-only users can set password from Account page.

---

## Conventions

- **FontAwesome icons** — must be imported in `src/fa.ts` and added to `library.add()`
- **No Co-Authored-By** — do not add "Co-Authored-By: Claude" to commit messages
- **TypeScript only** — all source files must be `.ts`/`.tsx`. Never create `.js`/`.jsx` files in `src/`.
- **Post-feature cleanup** — after completing a major change or feature, scan for and remove dead code, unused imports, orphaned files, and leftover artifacts before committing.
- **Firestore writes** — always use `{ merge: true }` via `fsSaveConfig`/`fsSaveChild` etc.

### Branch Workflow

Always checkout the correct branch before making changes:

| Branch           | Purpose                       |
| ---------------- | ----------------------------- |
| `feature`        | New features                  |
| `bugfix`         | Non-critical bug fixes        |
| `hotfix`         | Critical fixes from main      |
| `release`        | Preparing production releases |
| `docs`           | Documentation                 |
| `refactor`       | Code restructuring            |
| `ui-adjustments` | UI polish and tweaks          |
| `capacitor`      | iOs/Android native features   |

GitHub repo: https://github.com/Level-Up-Studios-LLC/LootBound.git

### Syncing Branches After Merging to Main

After PRs are merged to `main`, update active working branches so they have the latest code:

```bash
git checkout main && git pull                # get latest main
git checkout <branch> && git merge main      # bring main into your branch
```

**When to sync:**
- Before starting new work on a branch
- Before opening a PR (keeps the diff clean and avoids conflicts)
- When main has changes your branch depends on (e.g., a bugfix or shared utility)

**When you can skip it:**
- Branches you're not actively working on — update them when you pick them back up
- Branches already in PR review with no conflicts

### Versioning

Uses semantic versioning (SemVer). Update `package.json` version and CHANGELOG.md for each release.

- **Patch** (X.X.+1) — Bug fixes
- **Minor** (X.+1.0) — New features, backward-compatible
- **Major** (+1.0.0) — Breaking changes

---

## Family Context

- **Marc** (Dad) — owner of Level Up Studios LLC, Senior Web Developer. Built LootBound as a family project.
- **Pheline** (Mom) — co-parent, both parents share the admin PIN.
- **Donovan** (age 12) — age-appropriate tasks including homework, reading, chores.
- **Imani** (age 6) — simpler tasks like picking up toys, putting shoes away.
- **Melody** (age 2) — not yet in the system. Will be added when ready.

The app is designed to run on iPads — each kid logs into their own profile on a shared family tablet or personal device.
