# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-15

### Added
- GitHub Actions workflow for automatic Firebase Hosting deploy on push to main
- Account page with password change, PIN management, and family deletion
- Forgot/reset password flow on parent sign-in screen
- Password confirmation required before deleting family account
- `reauthenticate()` helper for session freshness before destructive operations
- `children` prop on ConfirmDialog for embedded content (e.g., password input)

### Fixed
- Firestore rules: restrict familyCodes create to parents (`isParent` check)
- Firestore rules: restrict familyCodes delete to family owner
- AccountTab hooks ordering — moved null guard after all useState calls
- `deleteAuthAccount` now handles `auth/requires-recent-login` with re-auth retry
- `deleteFamily` chunks batches to stay under Firestore 500-operation limit
- `deleteFamily` deletes all parentMembers for the family, not just current user
- `doResetPassword` no longer inconsistently re-throws after setting error state
- Orphaned family codes on account deletion (code now persisted on config doc)
- Photo cleanup awaited before account deletion instead of fire-and-forget

### Changed
- Consolidated `getCurrentUid`/`getCurrentFamilyId` into single helper
- Tier redesign: S/A/B/C/D/F letter grades replacing numeric 1-4 tiers
- XP leveling system with 20 levels, titles, streak multiplier, level coin bonus

## [1.0.0] - 2026-03-14

### Summary
First production release of LootBound — a gamified chore/reward system for families. Deployed to Firebase Hosting with full Firestore backend, Firebase Auth, and photo storage.

### Highlights
- Role-based auth (parent email/password, kid family code + anonymous auth)
- Mission system with S-F tier grades, time windows, and timing multipliers
- XP & leveling (20 levels), streak system with grace days
- Loot Shop with redemption limits and parent approval queue
- Photo proof on mission completion (camera-only on mobile)
- Full admin dashboard with mission/loot/children management
- Real-time sync via Firestore onSnapshot listeners
- PIN protection for both parents and kids
- Sentry error tracking
- In-app feedback submission

## [0.13.0] - 2026-03-14

### Added
- Sticky headers on all kid screens (HQ, Missions, Leaderboard, Loot Shop)
- Sticky header on parent dashboard (title, menu, family code)
- Kid-friendly empty state on missions page ("No missions today!")
- Improved empty states for admin tabs (Approvals, Review, Children, Loot)
- Back buttons with angle-left icon on AuthScreen and KidCodeScreen
- `execCommand` clipboard fallback for iOS Safari family code copy

### Fixed
- Feedback FAB overlapping delete icons on parent dashboard
- PIN creation race condition where seed config overwrote new PIN
- Sign-in loop when parent had no PIN set
- CreatePinPrompt not showing on new account signup
- Kids unable to create PIN (Firestore rules blocked anonymous writes)
- Coins badge overlapping hamburger menu on kid dashboard

### Changed
- FAB button only visible on parent dashboard (removed from kid screens)
- Coins display moved from separate card into sticky header on kid dashboard

## [0.12.0] - 2026-03-14

### Removed
- Legacy files: App.jsx, main.jsx, storage.js (~1,280 lines of dead code)
- Unused utils/ directory (duplicate of utils.ts)
- Unused seed data constants (DEF_CHILDREN, DEF_TASKS, DEF_REWARDS)
- Unused FA_ICON_STYLE import from AdminScreen

### Changed
- Consolidated 11 inline duotone style objects into shared FA_ICON_STYLE constant
- Cleaned up unused type imports in constants.ts

## [0.11.0] - 2026-03-14

### Added
- Firebase Hosting configuration with SPA rewrites and cache headers
- Deployed to https://quest-board-app-2973b.web.app
- Storage rules: 5MB file size limit and image-only content type restriction

### Changed
- Firestore security rules hardened with `isParent()` helper function
- Joined parents now properly authorized via parentMembers lookup
- Anonymous kids granted read access to family data
- Family codes locked to create-only (no update/delete)

## [0.10.0] - 2026-03-14

### Added
- HamburgerMenu component (ellipsis-vertical icon, top-right dropdown)
- New FA icons registered: house-chimney, crosshairs, crown, treasure-chest, ellipsis-vertical, left-from-bracket

### Changed
- Full language rebrand: Tasks to Missions, Points to Coins, Rewards to Loot, Store to Loot Shop, Scoreboard to Leaderboard, Tier to Rank
- Kid bottom nav redesigned: HQ, Missions, Ranks, Loot (4 items)
- Parent bottom nav redesigned: Overview, Approvals, Review, Missions, Loot (5 items)
- Logout moved from bottom nav to hamburger menu (both dashboards)
- Children and Settings moved to hamburger menu on parent dashboard
- Bottom nav icon size increased to text-xl, labels to text-xs
- Updated nav icons to FontAwesome Classic Solid library

## [0.9.0] - 2026-03-14

### Changed
- App renamed from "Quest Board" to "LootBound" across all files
- Updated package name, page title, loading screens, auth screens, service comments, photo download filename, Sentry project name
- Updated CLAUDE.md and README.md documentation

## [0.8.0] - 2026-03-14

### Added
- Sentry error tracking with tracing integration (instrument.ts)
- ErrorBoundary in App.tsx with fallback UI
- Source map upload via sentryVitePlugin
- Feedback form writing to Firestore /feedback collection
- Feedback available in SettingsTab and as global floating action button (FAB)
- Main App.tsx shell with screen routing and auth gates

## [0.7.0] - 2026-03-14

### Added
- Admin dashboard with tab-based navigation
- OverviewTab: all children at a glance with quick coin adjustments
- ApprovalsTab: approval queue for high-value redemptions
- ReviewTab: photo proof review with reject workflow
- TasksTab: per-child mission CRUD with tier, time window, schedule
- RewardsTab: full reward catalog management
- ChildrenTab: add/remove children, manage PINs
- SettingsTab: tier values, approval threshold, parent PIN, reset data
- useApprovalActions and useChildActions hooks

## [0.6.0] - 2026-03-14

### Added
- DashboardScreen: today's progress, streak, coins, up-next list
- TasksScreen: daily quest list with status badges and photo capture
- ScoresScreen: leaderboard ranking all children
- StoreScreen: reward browsing with redemption limits and approval requests
- useTaskActions and useRewardActions hooks

## [0.5.0] - 2026-03-14

### Added
- Modal, ConfirmDialog, and EmptyState UI components
- Bottom navigation component (BNav)
- Badge component for status display
- NotificationToast for transient messages
- PhotoViewer with loading spinner and save/download
- TaskForm, RewardForm, and AddChildForm components
- useNotification hook

## [0.4.0] - 2026-03-14

### Added
- AppContext provider orchestrating all app state
- useFirestoreSync hook with onSnapshot real-time listeners
- Modular utility functions (points, tasks, time, strings, images)
- Config, children, tasks, rewards, and per-child data sync

## [0.3.0] - 2026-03-14

### Added
- Role selection screen (parent/kid)
- Parent signup/login with email/password (Firebase Auth)
- Kid family code entry with device persistence
- Child profile selection with optional PIN
- PIN creation prompt for new kids
- AuthContext provider
- Auth service with family code generation and multi-parent support
- Anonymous auth for kid sessions

## [0.2.0] - 2026-03-14

### Added
- Firebase initialization (App, Firestore with offline persistence, Auth, Storage)
- Firestore storage adapter with CRUD operations per family
- Photo storage service (upload, download URL, cleanup)
- Family code generation and lookup service
- Firestore and Storage security rules

## [0.1.0] - 2026-03-14

### Added
- Initial project scaffold with React 18, Vite 6, TypeScript
- Entry points (main.tsx, index.html)
- Type definitions, constants, utility functions
- FontAwesome icon setup
- Prettier and TypeScript configuration
- .gitignore, .env.example, and project documentation
