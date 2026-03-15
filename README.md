# LootBound

A gamified chore and reward system for families. Children complete real-world missions to earn coins, climb the leaderboard, and redeem loot -- all managed by parents through an admin panel with approval workflows, photo proof review, and full audit trails.

Built as a mobile-first progressive web app designed for shared family tablets (iPad Safari) and personal devices.

**Live:** [quest-board-app-2973b.web.app](https://quest-board-app-2973b.web.app)

---

## Tech Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Framework      | React 18 (functional components, hooks)          |
| Build Tool     | Vite 7                                           |
| Language       | TypeScript (strict mode)                         |
| Auth           | Firebase Authentication (email/password)         |
| Database       | Cloud Firestore (real-time sync)                 |
| File Storage   | Firebase Storage (photo proof)                   |
| Hosting        | Firebase Hosting                                 |
| Styling        | Tailwind CSS v4                                  |
| Icons          | FontAwesome Pro 6 (duotone + classic solid)      |
| Error Tracking | Sentry                                           |
| Fonts          | Google Fonts -- Fredoka (display), Nunito (body) |

---

## Quick Start

```bash
git clone <repo-url>
cd LootBound
npm install
npm run dev
```

The dev server starts at **http://localhost:3000**.

**Default parent PIN:** `1234`

### Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config values.

### Available Scripts

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Start dev server on port 3000       |
| `npm run build`      | Production build to `dist/`         |
| `npm run preview`    | Preview production build            |
| `npm run type-check` | Run TypeScript type checking        |
| `npm run format`     | Format code with Prettier           |
| `npm run format:check` | Check formatting without writing  |
| `firebase deploy`    | Deploy to Firebase Hosting          |

---

## Features

### Kid Features

- **Dashboard (HQ)** -- Today's progress percentage, active streak, coin balance, and upcoming missions
- **Missions** -- Full daily mission list with status badges, tier indicators, time windows, and coin breakdowns
- **Photo Proof** -- Camera capture on mission completion (camera-only on mobile to prevent gallery uploads)
- **Leaderboard** -- Rankings across all children with stats: today's completion, streak, and personal best
- **Loot Shop** -- Browse and redeem rewards, view availability and limits, track pending approvals and redemption history
- **Streaks** -- Consecutive perfect days earn escalating bonus coins (3-day, 7-day, 30-day milestones)
- **PIN Protection** -- Optional per-child 4-digit PIN to prevent sibling access

### Parent Features

- **Overview** -- All children at a glance with coin balances, today's progress, streaks, and quick +/- coin adjustments
- **Approvals** -- Queue for high-value or flagged redemptions with approve/deny actions
- **Review** -- Completed missions with photo proof; reject missions that do not meet standards (deducts coins, sends back for redo)
- **Mission Management** -- Add, edit, and delete missions per child with rank, time window, and daily/weekly scheduling
- **Loot Management** -- Full CRUD for rewards with cost, icon, active/inactive toggle, redemption limits, and approval flags
- **Children Management** -- Add and remove children, manage profiles (name, age, avatar, color), and set PINs
- **Settings** -- Edit rank coin values, set approval threshold, change parent PIN, configure bedtime cutoff, weekly reset day, cooldown timer
- **Feedback** -- In-app feedback submission

---

## App Terminology

LootBound uses game-inspired language throughout the interface:

| App Term    | Traditional Term |
| ----------- | ---------------- |
| Missions    | Tasks / Chores   |
| Coins       | Points           |
| Loot        | Rewards          |
| Ranks       | Tiers            |
| Leaderboard | Scoreboard       |
| Loot Shop   | Reward Store     |
| HQ          | Dashboard        |

---

## Coin System

### Ranks

Missions are assigned a rank (1-4). Each rank has a configurable base coin value:

| Rank | Default Coins |
| ---- | ------------- |
| 1    | 5             |
| 2    | 10            |
| 3    | 20            |
| 4    | 30            |

### Timing Multipliers

Coins scale based on when a mission is completed relative to its time window:

| Timing  | Multiplier | Description                       |
| ------- | ---------- | --------------------------------- |
| Early   | x1.25      | Completed before the window opens |
| On Time | x1.0       | Completed within the window       |
| Late    | x0.5       | Completed after the window closes |
| Missed  | -Base      | Not completed by bedtime          |

### Streak Bonuses

| Streak  | Bonus      |
| ------- | ---------- |
| 3 days  | +20 coins  |
| 7 days  | +75 coins  |
| 30 days | +300 coins |

---

## Firebase Collections

```text
families/{familyId}              -- Family config (PIN, tier values, thresholds)
  /children/{childId}            -- Child profiles (name, age, avatar, color, PIN)
  /tasks/{taskId}                -- Mission definitions (name, tier, time window, schedule)
  /rewards/{rewardId}            -- Reward definitions (name, cost, icon, limits)
  /childData/{childId}           -- Runtime data (coins, streak, task logs, redemptions)

parentMembers/{uid}              -- Maps parent auth UIDs to family IDs
familyCodes/{code}               -- Maps family codes to family IDs
feedback/{docId}                 -- User-submitted feedback (category, message, familyId)
```

---

## Auth Flow

1. **Role Selection** -- User chooses "I'm a Parent" or "I'm a Kid" on the landing screen
2. **Parent Flow** -- Sign up or sign in with email/password via Firebase Authentication. Optional PIN creation for quick access on return visits. Parents can join an existing family by entering a family code during signup.
3. **Kid Flow** -- Enter a 6-character alphanumeric family code to access the family's child profiles. Select a profile and enter or create a PIN. The family code is persisted locally so kids do not re-enter it each session.

---

## Abuse Prevention

| Guard                      | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| Mission cooldown           | Prevents rapid-fire spam completion                |
| Camera-only photo capture  | Blocks uploading old or fake photos from gallery   |
| Per-reward redemption limits | Prevents burning coins on the same reward        |
| Parent approval queue      | High-value redemptions require oversight           |
| Configurable threshold     | Auto-flags rewards above a configurable coin amount |
| Child PINs                 | Prevents sibling tampering and cross-account access |
| Bedtime lockout            | Disables mission completion after bedtime cutoff   |
| Full audit log             | All redemptions logged with timestamps             |

---

## Deployment

LootBound is deployed via Firebase Hosting:

```bash
npm run build
firebase deploy --project quest-board-app-2973b
```

This deploys:
- **Hosting** -- Static files from `dist/`
- **Firestore Rules** -- From `firestore.rules`
- **Storage Rules** -- From `storage.rules`

Firebase configuration is managed through `.firebaserc` and `firebase.json`.

---

## Project Structure

```text
quest-board/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  firebase.json
  firestore.rules
  storage.rules
  .firebaserc
  .env.example
  src/
    main.tsx                    # Entry point
    App.tsx                     # App shell, routing, layout
    index.css                   # Tailwind directives
    instrument.ts               # Sentry initialization
    constants.ts                # App constants, nav config, default values
    types.ts                    # TypeScript interfaces
    utils.ts                    # Utility functions (points, time, tasks, images)
    fa.ts                       # FontAwesome icon imports and library registration
    vite-env.d.ts               # Vite type declarations
    context/
      AppContext.tsx             # App state provider (config, children, tasks, rewards)
      AuthContext.tsx            # Auth state provider (Firebase Auth, role, family)
    hooks/
      useApprovalActions.ts     # Approve/deny pending redemptions
      useChildActions.ts        # Child CRUD operations
      useFirestoreSync.ts       # Real-time Firestore listeners
      useNotification.ts        # Toast notification management
      useRewardActions.ts       # Reward CRUD and redemption logic
      useTaskActions.ts         # Task CRUD and completion logic
    services/
      auth.ts                   # Firebase Auth operations
      familyCode.ts             # Family code generation and lookup
      feedback.ts               # Feedback submission
      firebase.ts               # Firebase app initialization
      firestoreStorage.ts       # Firestore read/write operations
      photoStorage.ts           # Firebase Storage photo upload/retrieval
    components/
      Badge.tsx                 # Status badges
      BNav.tsx                  # Bottom navigation bar
      HamburgerMenu.tsx         # Hamburger menu overlay
      NotificationToast.tsx     # Toast notifications
      PhotoViewer.tsx           # Photo proof viewer
      ui/                       # Reusable UI primitives (Modal, ConfirmDialog, EmptyState)
      forms/                    # Form components (TaskForm, RewardForm, AddChildForm)
    screens/
      RoleSelectScreen.tsx      # Parent/Kid role selection
      LoginScreen.tsx           # Parent email/password login
      KidCodeScreen.tsx         # Kid family code entry
      AuthScreen.tsx            # Auth flow orchestrator
      ParentPinScreen.tsx       # Parent PIN verification
      CreatePinPrompt.tsx       # Child PIN setup prompt
      DashboardScreen.tsx       # Kid HQ / dashboard
      TasksScreen.tsx           # Kid missions list
      ScoresScreen.tsx          # Leaderboard
      StoreScreen.tsx           # Loot shop
      admin/                    # Parent admin panel screens
```

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development setup, code conventions, and PR process.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## License

Proprietary software. Copyright 2026 Level Up Studios LLC. All rights reserved. See [LICENSE](LICENSE) for details.
