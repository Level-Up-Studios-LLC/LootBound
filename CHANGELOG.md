# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-03-23

### Added
- Unified registration flow with CompleteProfileScreen (Google + email/password in one step)
- GSAP animations across all kid-facing screens (dashboard, missions, leaderboard, loot shop, login)
- Web Audio API sound synthesis replacing MP3 placeholders (success, error, approval, level-up, streak)
- Victory celebration sound on completing all daily missions
- Confetti canvas celebration and collapsible next-day mission preview on dashboard
- Confirm dialogs with "Don't ask me again" option for mission, loot, and child deletion
- Edit child dialog in Children management tab
- Parent profile photo support (Google photoURL, Gravatar fallback)
- Admin header redesign with profile avatar, name, Owner/Member role badge, and date display
- Family code tappable to copy with hint text on profile completion
- Sentry instrumentation on all Firestore writes, snapshot listeners, and auth retry paths

### Fixed
- Number fields not clearable when value is zero (reward cost, tier coins/XP, threshold, cooldown)
- Firebase permission error when joining an existing family (Firestore rules too restrictive on parentMembers)
- Email verification screen flashing before profile completion (isNewUser timing guard)
- Sound effects not playing (empty 4-byte MP3 placeholders replaced with Web Audio API synthesis)
- Victory sound replaying on every dashboard visit (now only on incomplete→complete transition)
- Kid profile cards not visible (GSAP fromTo opacity fix)
- Tomorrow's preview showing wrong weekly tasks (isTaskActiveTomorrow logic)
- Task form time inputs overflowing on narrow screens (switched to CSS grid)
- React 19 stack overflow caused by React Spring circular observer (migrated to GSAP)
- Error message color too light for readability (darkened qcoral from #ff8c94 to #e05260)

### Changed
- Replaced React Spring with GSAP for all animations (React 19 compatibility)
- Simplified AuthScreen by moving profile setup to CompleteProfileScreen
- Removed CreatePinPrompt screen (PIN creation integrated into CompleteProfileScreen)
- Admin header no longer shows family code banner (moved to Account page)
- Settings sections reordered with alternating mint/yellow colors
- Tier coin/XP input fields widened from 60px to 72px

## [1.5.0] - 2026-03-22

### Added
- Email verification gate — blocks unverified email/password users from accessing the app
- Email verification screen with resend button, check status button, and action-specific loading states
- Password reveal eye icon on all password and PIN fields (new `PasswordInput` component)
- Sentry toggle in Settings — parents can enable/disable error reporting via localStorage
- Comprehensive Sentry instrumentation across all Firestore writes, snapshot listeners, and auth retry paths
- Sentry Session Replay integration for debugging production issues
- In-app notification system with cross-device Firestore sync and configurable sounds
- Notification preferences in Settings (sound toggles per notification type)
- Badge counts on parent nav tabs (approvals, review) and kid nav tab (missions)
- Next-day mission preview on kid dashboard after bedtime cutoff
- `isTaskVisibleToday` utility for showing tomorrow's tasks after bedtime
- Google re-authentication support for account deletion and leaving family
- Alternating mint/yellow section colors in Settings for visual clarity
- Accessibility: `role="status"` and `aria-live="polite"` on verification feedback
- `IconBadge` component to deduplicate icon + badge rendering in nav
- Shared `FEEDBACK_URL` constant pointing to Canny.io board
- Outer `ErrorBoundary` wrapping the full app for uncaught errors

### Fixed
- UTC date bug in `getToday()`, `getWeekStart()`, and `prevDate()` — now uses local dates
- XP thresholds had non-monotonic increments — replaced with exponential curve (`50 * level^1.5`)
- `resetAll` used `merge: true` leaving stale taskLog entries — now uses `replaceChildData`
- Coins could go infinitely negative — clamped at -300 floor
- Photo uploads failed with expired anonymous auth — added `signInAnonymousKid()` before Storage ops
- Late-added tasks incorrectly penalized as missed — bedtime penalty now checks active tasks only
- Missed status now correctly overrides rejected status after bedtime
- Preview/upcoming tasks are no longer completable by kids
- `createdAt` field preserved through task hydration and edit cycles
- Firestore persistence lock error — switched to multi-tab cache mode
- `parentMembers` update rule now allows partial updates
- `auth/user-mismatch` handled in delete re-auth flow
- Verification button labels showed wrong action (both said "Sending..."/"Checking..." simultaneously)
- Sign-out from verification screen now clears `justSignedIn` flag
- `verifyAction` state resets on auth/role transitions to prevent stale in-flight state
- `deletePass` snapshot captured before async work to prevent closure bug
- `resetAll` closure-over-loop-variable crash fixed
- Notification cleanup handles Firestore `Timestamp` type correctly in expiry comparison

### Changed
- Modernized codebase to ES6+ TypeScript (const/let, spread, arrows, structuredClone, template literals)
- Upgraded to React 19, Vite 8, TypeScript 5.9
- Capacitor platform abstraction layer for iOS/Android native builds
- CI updated to Node.js 22, GitHub Actions v6
- Deploy workflow triggers from production branch instead of main
- Feedback links point to Canny.io board instead of GitHub Discussions
- `ConfirmDialog` component refactored for cleaner prop types

## [1.4.0] - 2026-03-19

### Added
- Capacitor setup with platform abstraction layer (iOS/Android, haptics, biometrics, camera)
- In-app notification system with Firestore-backed cross-device sync and sound effects
- Badge counts on parent bottom nav (approvals, review) and kid bottom nav (missions)
- `IconBadge` component for reusable icon + badge rendering

### Changed
- Modernized entire codebase to ES6+ TypeScript (const/let, spread, arrows, structuredClone)
- Upgraded React 18 → 19, Vite 6 → 8, TypeScript 5.7 → 5.9
- Updated CLAUDE.md: removed legacy JS conventions, added Capacitor branch

### Fixed
- UTC date bug in date utilities causing wrong day calculations
- XP level thresholds replaced with monotonic exponential curve
- `resetAll` merge behavior leaving stale task log entries
- Negative coin balance uncapped — added -300 floor
- Photo upload auth failures for anonymous kid sessions

## [1.3.0] - 2026-03-18

### Added
- Multi-step sign-up form (Step 1: email/Google, Step 2: name, password, family code, referral)
- Multi-step sign-in form (Step 1: email/Google, Step 2: password)
- Per-parent data model: PIN and name stored on `parentMembers/{uid}` instead of shared family config
- Owner/Member role system with role badge on Account page
- "Leave Family" option for members (only removes own account, preserves family data)
- Editable parent name and email on Account page with inline edit mode
- Initials-based avatar (e.g. "MJ" for Marc Joseph) on Account page
- Google + email/password account linking (auto-link via Firebase, set password for Google-only users)
- `hasPasswordProvider()` helper to detect sign-in methods
- `setPassword()` using `linkWithCredential` for Google-only users
- `changeEmail()` using `verifyBeforeUpdateEmail` with app action URL redirect
- Email verification confirmation page with `applyActionCode` server-side verification
- Auto-refresh email verification status on app load (once per user via ref guard)
- Session persistence for parents (sessionStorage with 24h TTL, per-user binding)
- Session persistence for kids (sessionStorage, validated against cfg.children before dashboard)
- Collapsible purchase history (PurchasesToggle component) on Overview and Children tabs
- "How did you hear about us?" referral dropdown on signup (saved to family doc)
- Personalized dashboard greeting ("Hey, Marc!")
- Settings save debounce (1.5s delay with unmount flush)
- `ParentMember` interface and CRUD helpers (get, save, delete, onSnapshot)
- `deleteParentMember` helper for member account removal
- `prompt: 'select_account'` on Google sign-in to force account picker
- CreatePinPrompt shown after signup (skippable)

### Fixed
- Parent name not persisting: added `parentName` to initial config load and Firestore sync
- PIN creation prompt not appearing after signup (state update during render timing fix)
- PIN screen flash on load (inline auto-verify instead of async useEffect)
- Family deletion failing with insufficient permissions (parentMembers query scope)
- Session leakage between parent accounts (per-UID session binding with mismatch clearing)
- `getSession` now validates parsed shape and uses `Number.isFinite` for timestamps
- Malformed sessionStorage entries cleaned up in catch block
- Sign-out clears sessionStorage (parent + kid sessions)
- Kid session validated against cfg.children before promoting to dashboard
- `saveParentMember` filters to known fields only (prevents accidental familyId removal)
- Firestore rules: `familyId` immutable on `parentMembers` updates
- Firestore rules: family owner can read/delete other members' docs for deletion cleanup
- `FamilyConfig` interface updated with all fields (was missing parentName, bedtime, cooldown, etc.)
- Real-time snapshot listener for parent name in AdminScreen and AccountTab
- PIN save now awaited before UI update
- Tailwind v4 important modifier syntax (prefix `!` → suffix `!`)
- `sendEmailVerification` catch blocks now log warnings

### Changed
- Delete Family dialog simplified to password-only (removed family code typed confirmation)
- Reset All Data restricted to owner role only
- `doSignUp` and `doJoinFamily` return familyId for immediate post-signup data saves
- All `parentMembers` setDoc calls use `{ merge: true }`
- `useFirestoreSync` config snapshot cleaned up: removed `(fc as any)` casts

## [1.2.0] - 2026-03-17

### Added
- Google sign-in for parents (redirect-based, iPad-compatible)
- Email verification flow with resend and refresh
- Custom branded password reset page with Firebase action URL handling
- Sentry error tracking at critical points across contexts, hooks, and screens
- `sendDefaultPii: false` in Sentry init for privacy protection
- `VITE_APP_URL` env var for configurable password reset redirect URL
- Retryable error state on reset code verification (network errors show retry button)
- GitHub Actions workflow for automatic Firebase Hosting deploy on push to main
- Account page with password change, PIN management, and family deletion
- Forgot/reset password flow on parent sign-in screen
- Password confirmation required before deleting family account
- `reauthenticate()` helper for session freshness before destructive operations
- `children` prop on ConfirmDialog for embedded content (e.g., password input)
- TypeScript-only and post-feature cleanup conventions in CLAUDE.md
- Branch syncing workflow documentation in CLAUDE.md

### Fixed
- `var` closure bug in weekly reset photo cleanup loop (IIFE with typed parameter)
- Raw email PII removed from Sentry user context (now only sends familyId)
- `doRemoveChild` now surfaces partial failure when child data deletion fails
- `doRefreshVerification` missing error handling (added try/catch)
- `doSendVerification` not clearing prior auth error state
- Google sign-in redirect landing on role selector instead of app
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
