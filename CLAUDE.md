# CLAUDE.md — LootBound

## About the Project

LootBound is a gamified family chore/reward tracker built by Level Up Studios LLC. Parents create tasks and rewards; kids complete missions, earn coins and XP, level up, and redeem loot in the store. The app supports multiple children per family with parent admin controls.

**Current version:** v1.6.0

## Memory Maintenance

At the end of each conversation (or when significant work is completed), review and update your memory files to capture important decisions, new patterns, version changes, or user feedback. Check existing memories for accuracy and update any that have become outdated.

## Running the Project

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run build:check` — Type-check + build
- `npm run type-check` — TypeScript type checking (`tsc --noEmit`)
- `npm run format` / `npm run format:check` — Prettier formatting
- `npm run cap:sync` — Build + Capacitor sync (for native apps)
- `npm run cap:open:ios` / `npm run cap:open:android` — Open native IDE

Always run `npm run type-check` after TypeScript changes before committing.

**Node requirement:** >= 20.0.0

---

## Tech Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Framework      | React 19, TypeScript 5.9                         |
| Build          | Vite 8                                           |
| Styling        | Tailwind CSS 4                                   |
| Icons          | FontAwesome (Pro kit via @awesome.me)            |
| Animations     | GSAP 3 + @gsap/react (not React Spring)          |
| Backend        | Firebase (Auth, Firestore, Storage, Hosting)     |
| Error tracking | Sentry (@sentry/react + Vite plugin)             |
| Native         | Capacitor 8 (iOS/Android, on `capacitor` branch) |
| Formatting     | Prettier                                         |

### Why GSAP over React Spring

React Spring v10 has a circular priority bug with React 19 — `useTrail` and `useSpring` with `.to()` interpolations cause infinite recursion, crashing the app. Use GSAP's `useGSAP` hook with CSS class selectors. For simple component animations (modals, toasts), CSS animations are fine.

---

## Project Structure

```text
src/
  App.tsx                    # Root component, screen routing
  main.tsx                   # Entry point, Sentry init
  instrument.ts              # Sentry instrumentation config
  constants.ts               # Shared constants
  fa.ts                      # FontAwesome icon library setup
  types.ts                   # TypeScript type definitions
  utils.ts                   # Utility functions
  index.css                  # Global styles (Tailwind)
  vite-env.d.ts              # Vite type declarations

  context/
    AppContext.tsx            # App state (children, tasks, rewards, etc.)
    AuthContext.tsx           # Auth state, login/logout, family resolution

  screens/
    AuthScreen.tsx            # Sign-up step 1 (email/password or Google)
    CompleteProfileScreen.tsx  # Sign-up step 2 (profile, family code, PIN)
    LoginScreen.tsx           # Returning user login
    ResetPasswordScreen.tsx   # Password reset flow
    RoleSelectScreen.tsx      # Parent vs kid role selection
    ParentPinScreen.tsx       # Parent PIN gate (+ biometric on native)
    KidCodeScreen.tsx         # Kid login via family code
    DashboardScreen.tsx       # Kid dashboard (tasks, progress, streaks)
    TasksScreen.tsx           # Kid task list and completion
    StoreScreen.tsx           # Kid reward store and redemption
    ScoresScreen.tsx          # Leaderboard / scores
    admin/
      AdminScreen.tsx         # Parent admin container with tabs
      OverviewTab.tsx         # Family overview
      ChildrenTab.tsx         # Manage children
      TasksTab.tsx            # Manage tasks
      RewardsTab.tsx          # Manage rewards
      ApprovalsTab.tsx        # Approve/reject pending items
      ReviewTab.tsx           # Review completed items
      SettingsTab.tsx         # Family and notification settings
      AccountTab.tsx          # Parent account management

  components/
    Badge.tsx                 # Achievement badge display
    BNav.tsx                  # Bottom navigation bar
    HamburgerMenu.tsx         # Slide-out menu
    IconBadge.tsx             # Icon with badge count
    NotificationToast.tsx     # Toast notification component
    PhotoViewer.tsx           # Photo viewing overlay
    forms/
      AddChildForm.tsx        # Add new child form
      TaskForm.tsx            # Create/edit task form
      RewardForm.tsx          # Create/edit reward form
    ui/
      ConfirmDialog.tsx       # Confirm dialog with focus trap
      EmptyState.tsx          # Empty state placeholder
      Modal.tsx               # Base modal component
      PasswordInput.tsx       # Password field with eye toggle
      PurchasesToggle.tsx     # Store purchases toggle

  hooks/
    useApprovalActions.ts     # Approval/rejection logic
    useChildActions.ts        # Child CRUD operations
    useFirestoreSync.ts       # Real-time Firestore sync (onSnapshot)
    useNotification.ts        # Send notifications
    useNotificationListener.ts # Listen for incoming notifications
    useRewardActions.ts       # Reward CRUD and redemption
    useTaskActions.ts         # Task CRUD and completion

  services/
    auth.ts                   # Firebase auth helpers
    familyCode.ts             # Family code generation/validation
    firebase.ts               # Firebase app initialization
    firestoreStorage.ts       # Firestore read/write helpers (merge: true)
    notificationSound.ts      # Web Audio API sound synthesis
    photoStorage.ts           # Firebase Storage photo upload/delete
    platform.ts               # Capacitor platform abstraction layer
```

---

## Firebase Architecture

### Auth

- Email/password + Google OAuth sign-in
- Email verification gate for password-based parent accounts
- Per-parent data stored in `parentMembers/{uid}` (PIN, name, photoURL)

### Firestore Collections

- `families/{familyId}` — Family config, settings
- `families/{familyId}/children/{childId}` — Child profiles
- `families/{familyId}/tasks/{taskId}` — Task definitions
- `families/{familyId}/rewards/{rewardId}` — Reward definitions
- `families/{familyId}/notifications/{notifId}` — Cross-device notifications (7-day TTL)
- `parentMembers/{uid}` — Parent member data (PIN, name, photoURL, familyId)

### Firestore Rules

- `firestore.rules` at project root — deploy with `firebase deploy --only firestore:rules`
- `storage.rules` at project root — deploy with `firebase deploy --only storage`
- familyId is immutable on parentMembers update
- parentMembers create restricted to own family or existing family (exists check)

### Security Notes

- All Firestore write/delete helpers instrumented with Sentry try/catch
- Real-time sync via onSnapshot listeners with Sentry error callbacks
- Auth errors that cross system boundaries attach a `.code` property; internal guard throws (e.g. "Not signed in") use plain Error instances
- Skip-confirm localStorage keys scoped to user UID
- PIN stored as plaintext — needs hashing (future security task)
- Firestore rules exists() check on parentMembers is a stopgap — needs Cloud Function for proper joinCode validation

---

## Conventions

- **FontAwesome icons** — must be imported in `src/fa.ts` and added to `library.add()`
- **TypeScript only** — all source files must be `.ts`/`.tsx`. Never create `.js`/`.jsx` files anywhere (including root config files like `vite.config.ts`)
- **Post-feature cleanup** — after completing a major change or feature, scan for and remove dead code, unused imports, orphaned files, and leftover artifacts before committing
- **Firestore writes** — always use `{ merge: true }` via the adapter helpers (`saveConfig`, `saveChild`, `saveTask`, `saveReward`, `saveChildData`). `replaceChildData` intentionally does **not** merge (used for reset flows).
- **Accessibility** — always implement a11y recommendations (focus traps, aria attributes, WCAG compliance). The app targets all devices. Never dismiss a11y based on device assumptions.
- **prefers-reduced-motion** — respected in Confetti, LoginScreen, and DashboardScreen animations
- **Focus traps** — include `a[href]` selector across all modals (ConfirmDialog, LoginScreen, StoreScreen, ResetDataDialog)
- **Sound effects** — Web Audio API synthesis (success, error, approval, levelup, streak) + victory.mp3 file. Silent MP3 data-URL unlock on first user gesture.
- **Profile pictures** — Google photoURL, Gravatar (HEAD-verified before save with 3s timeout), or initials fallback. Gravatar not auto-loaded in preview (privacy).
- **Confirm dialogs** — use focus traps, Escape handling, and "Don't ask me again" (scoped to user UID)

### Branch Workflow

Always checkout the correct branch before making changes. Route fixes to the correct branch type — don't mix concerns.

| Branch           | Purpose                       |
| ---------------- | ----------------------------- |
| `feature`        | New features                  |
| `bugfix`         | Non-critical bug fixes        |
| `hotfix`         | Critical fixes from main      |
| `release`        | Preparing production releases |
| `docs`           | Documentation                 |
| `refactor`       | Code restructuring            |
| `ui-adjustments` | UI polish and tweaks          |
| `capacitor`      | iOS/Android native features   |

GitHub repo: https://github.com/Level-Up-Studios-LLC/LootBound.git

### Git Workflow

- Always sync `main` into working branches before starting new work: `git fetch origin && git merge origin/main --no-edit`
- Use `git merge`, not `git rebase`, for syncing branches
- Production bugs (Sentry errors) go on `hotfix` branch, not directly on main
- Always commit, push, and create a PR after completing changes
- Always deploy Firestore/Storage rules after modifying them
- Do not include "Generated with Claude Code" in PR descriptions
- Do not add `Co-Authored-By` lines to commit messages
- When reviewing PRs, check CodeRabbit's nitpick, outside-diff, and duplicate comments (in review bodies, not just line comments)
- Reply inline to PR review comments (not as top-level PR comments) so CodeRabbit can track resolution
- When reviewing PRs, check for Copilot change requests, reply inline to the PR review comments, and mark as resolved when fixes are applied

### Versioning

Uses semantic versioning (SemVer). Update `package.json` version and CHANGELOG.md for each release.

- **Patch** (X.X.+1) — Bug fixes
- **Minor** (X.+1.0) — New features, backward-compatible
- **Major** (+1.0.0) — Breaking changes

### Changelog

Follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Categories in order: Added, Changed, Deprecated, Removed, Fixed, Security. Always maintain an Unreleased section at top.

---

## Key Features

- **Gamified task system** — Kids complete missions to earn coins and XP
- **Leveling and streaks** — XP-based level progression with streak tracking
- **Reward store** — Parents set up rewards; kids redeem with earned coins
- **Multi-child support** — Multiple children per family with individual progress
- **Parent admin panel** — 8-tab admin (Overview, Children, Tasks, Rewards, Approvals, Review, Settings, Account)
- **In-app notifications** — Cross-device Firestore notifications with Web Audio sounds
- **Data reset** — Parent-only control to reset family progress and rewards from the Account tab
- **Google + email/password auth** — Unified registration flow via CompleteProfileScreen
- **Family code system** — Join existing families or create new ones
- **Photo proof** — Kids can attach photos to completed tasks
- **Sentry error tracking** — Comprehensive instrumentation with user-facing toggle
- **Confetti celebrations** — Canvas-based with devicePixelRatio scaling and RAF cleanup
- **GSAP animations** — Screen-level entrance and stagger animations

---

## Roadmap (Remaining)

- **Family email invitations** — Firebase Cloud Functions, invite URLs, server-side joinCode validation
- **Email notifications for parents** — Cloud Functions digest emails (depends on invitation infra)
- **Sibling co-op feature** — Design phase, questions remain
- **Capacitor native deployment** — Push notifications, app icons, signing, TestFlight/Play Store (on `capacitor` branch)
- **PIN hashing** — Security improvement for stored PINs
- **Tiered Loots** - Loots that are unlocked at different progression levels
- **AI Integration** - AI to provide suggestions for missions and loots
- **Achievements System** - Achievements a child can unlock by completing certain milestones
- **Local Area Leaderboard** - Leaderboard to display kids score/achievements from families in the area (same zipcode or mile-radius)
- **Loot Wishlist** - Allow kids to create a wishlist on their loot screen where parent can approve and add as redeemable loots
- **Multi-photo Mission Completions** - Allow kids to take up to 3 photos at multiple angles of their completed task for parent review
