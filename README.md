<p align="center">
  <img src="https://img.shields.io/badge/LootBound-Gamified%20Chores-FF8C94?style=for-the-badge&labelColor=4B4E6D" alt="LootBound" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Font%20Awesome-Pro%206-528DD7?style=flat-square&logo=fontawesome&logoColor=white" alt="FontAwesome" />
  <img src="https://img.shields.io/badge/Sentry-Error%20Tracking-362D59?style=flat-square&logo=sentry&logoColor=white" alt="Sentry" />
</p>

<p align="center">
  <strong>A gamified chore and reward system for families.</strong><br />
  Kids complete real-world missions to earn coins and XP, level up from Rookie to Mythic, climb the leaderboard, and redeem loot — all managed by parents through an admin panel with approval workflows, photo proof review, and full audit trails.
</p>

<p align="center">
  <a href="https://quest-board-app-2973b.web.app"><strong>🌐 Live App</strong></a>
</p>

---

## 🚀 Quick Start

```bash
git clone <repo-url>
cd LootBound
npm install
npm run dev
```

Dev server starts at **http://localhost:3000**.

> **Note:** Copy `.env.example` to `.env` and fill in your Firebase config values before running.

### 🛠 Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `firebase deploy` | Deploy to Firebase Hosting |

---

## 🎮 Features

### 👦 Kid Features

- **🏠 Dashboard (HQ)** — Today's progress, active streak, coin balance, XP bar with level + title, and upcoming missions
- **🎯 Missions** — Daily mission list with tier badges (S through F), status indicators, time windows, and coin + XP breakdowns
- **📸 Photo Proof** — Camera capture on completion (camera-only on mobile to prevent gallery uploads)
- **🏆 Leaderboard** — Rankings by perfect days with "Top Adventurer" highlight, level titles, and streaks
- **🛒 Loot Shop** — Browse and redeem rewards, view limits, track pending approvals and history
- **🔥 Streaks** — Perfect days build streaks with escalating bonuses and XP multipliers (up to 2.0x)
- **🔒 PIN Protection** — Per-child 4-digit PIN to prevent sibling access

### 👨‍👩‍👧‍👦 Parent Features

- **📊 Overview** — All children at a glance with coins, levels, progress, and quick +/- adjustments
- **✅ Approvals** — Queue for high-value redemptions with approve/deny actions
- **🔍 Review** — Completed missions with photo proof; reject sub-standard work (deducts coins + XP)
- **📋 Mission Management** — Add, edit, delete missions per child with tier (S-F), time windows, and scheduling
- **🎁 Loot Management** — Full CRUD for rewards with cost, icon, limits, and approval flags
- **👶 Children Management** — Add/remove children, manage profiles and PINs
- **⚙️ Settings** — Tier coin/XP values, approval threshold, parent PIN, bedtime, weekly reset day, cooldown
- **💬 Feedback** — In-app feedback submission

---

## 🗣 App Terminology

| App Term | Traditional Term |
| --- | --- |
| 🎯 Missions | Tasks / Chores |
| 🪙 Coins | Points |
| 🎁 Loot | Rewards |
| 🏅 Tiers (S-F) | Difficulty levels |
| 🏆 Leaderboard | Scoreboard |
| 🛒 Loot Shop | Reward Store |
| 🏠 HQ | Dashboard |

---

## 💰 Tier & Coin System

### Letter-Grade Tiers

Missions are assigned a tier from **S** (hardest) to **F** (easiest), each with configurable coin and XP values:

| Tier | Coins | XP | Description |
| --- | --- | --- | --- |
| **S** 🥇 | 50 | 40 | Epic — rare, high-effort |
| **A** 🔴 | 30 | 25 | Hard — real effort required |
| **B** 🔵 | 20 | 18 | Medium — core daily chores |
| **C** 🟢 | 12 | 12 | Light — quick responsibilities |
| **D** 🟣 | 7 | 7 | Easy — simple habits |
| **F** ⚪ | 3 | 3 | Trivial — participation-level |

### ⏱ Timing Multipliers

Coins and XP scale based on when a mission is completed relative to its time window:

| Timing | Multiplier | Description |
| --- | --- | --- |
| ⚡ Early | x1.25 | Completed before the window opens |
| ✅ On Time | x1.0 | Completed within the window |
| ⏰ Late | x0.5 | Completed after the window closes |
| ❌ Missed | -Coins, 0 XP | Not completed by bedtime |

### 🔥 Streak Bonuses

| Streak | Bonus |
| --- | --- |
| 3 days | +20 coins |
| 7 days | +75 coins |
| 15 days | +150 coins |
| 30 days | +300 coins |

> **Grace day:** Kids get 1 missed day per week without breaking their streak.

---

## ⬆️ XP & Leveling System

Kids earn XP alongside coins. XP never goes negative — missed tasks deduct coins but award 0 XP.

### 📊 Streak XP Multiplier

| Streak | Multiplier |
| --- | --- |
| 0-2 days | 1.0x |
| 3-6 days | 1.1x |
| 7-13 days | 1.25x |
| 14-20 days | 1.4x |
| 21-29 days | 1.6x |
| 30+ days | 2.0x (cap) |

### 🎖 Level Titles (1-20)

| Levels | Title | Color |
| --- | --- | --- |
| 1-3 | Rookie | Gray |
| 4-6 | Adventurer | Green |
| 7-9 | Guardian | Blue |
| 10-12 | Champion | Purple |
| 13-15 | Hero | Orange |
| 16-18 | Legend | Gold |
| 19-20 | Mythic | Red |

Higher levels earn a coin bonus on every mission (up to +25% at Level 20).

---

## 🔐 Auth Flow

1. **🎭 Role Selection** — User chooses "I'm a Parent" or "I'm a Kid"
2. **👨‍💼 Parent Flow** — Sign up or sign in with email/password. Optional PIN creation for quick access on return visits. Parents can join an existing family with a family code.
3. **👦 Kid Flow** — Enter a 6-character family code to access profiles. Select a profile and enter or create a PIN. Code is persisted locally.

---

## 🛡 Abuse Prevention

| Guard | Purpose |
| --- | --- |
| ⏱ Mission cooldown | Prevents rapid-fire spam completion |
| 📸 Camera-only capture | Blocks uploading old/fake photos |
| 🔢 Per-reward limits | Prevents burning coins on the same reward |
| ✅ Approval queue | High-value redemptions require parent oversight |
| 🎯 Configurable threshold | Auto-flags rewards above a coin amount |
| 🔒 Child PINs | Prevents sibling tampering |
| 🌙 Bedtime lockout | Disables missions after bedtime cutoff |
| 📋 Audit log | All redemptions logged with timestamps |
| 🧢 XP multiplier cap | Streak XP bonus capped at 2.0x |

---

## 🗄 Firebase Collections

```text
families/{familyId}              — Family config (PIN, tier values, thresholds)
  /children/{childId}            — Child profiles (name, age, avatar, color, PIN)
  /tasks/{taskId}                — Mission definitions (name, tier, time window, schedule)
  /rewards/{rewardId}            — Reward definitions (name, cost, icon, limits)
  /childData/{childId}           — Runtime data (coins, XP, level, streak, task logs, redemptions)

parentMembers/{uid}              — Maps parent auth UIDs to family IDs
familyCodes/{code}               — Maps family codes to family IDs
feedback/{docId}                 — User-submitted feedback
```

---

## 🚢 Deployment

```bash
npm run build
firebase deploy --project quest-board-app-2973b
```

Deploys:
- **Hosting** — Static files from `dist/`
- **Firestore Rules** — From `firestore.rules`
- **Storage Rules** — From `storage.rules`

---

## 📁 Project Structure

```text
LootBound/
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
    utils.ts                    # Utility functions (coins, XP, time, tasks, images)
    fa.ts                       # FontAwesome icon imports and library registration
    context/
      AppContext.tsx             # App state provider
      AuthContext.tsx            # Auth state provider
    hooks/
      useApprovalActions.ts     # Approve/deny pending redemptions
      useChildActions.ts        # Child CRUD operations
      useFirestoreSync.ts       # Real-time Firestore listeners
      useNotification.ts        # Toast notification management
      useRewardActions.ts       # Reward CRUD and redemption logic
      useTaskActions.ts         # Task completion logic with XP/coin calculation
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
      NotificationToast.tsx     # Toast notifications (with level-up celebration)
      PhotoViewer.tsx           # Photo proof viewer
      ui/                       # Reusable UI primitives
      forms/                    # Form components
    screens/
      RoleSelectScreen.tsx      # Parent/Kid role selection
      LoginScreen.tsx           # Child profile selection
      KidCodeScreen.tsx         # Kid family code entry
      AuthScreen.tsx            # Parent auth (login/signup)
      ParentPinScreen.tsx       # Parent PIN verification
      CreatePinPrompt.tsx       # PIN setup prompt
      DashboardScreen.tsx       # Kid HQ with XP bar
      TasksScreen.tsx           # Kid missions list
      ScoresScreen.tsx          # Leaderboard / personal stats
      StoreScreen.tsx           # Loot shop
      admin/                    # Parent admin panel screens
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development setup, code conventions, and PR process.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## 📄 License

Proprietary software. Copyright 2026 Level Up Studios LLC. All rights reserved. See [LICENSE](LICENSE) for details.
