# CLAUDE.md — LootBound

## Memory Maintenance

At the end of each conversation (or when significant work is completed), review and update your memory files to capture important decisions, new patterns, version changes, or user feedback. Check existing memories for accuracy and update any that have become outdated.

## Running the Project

Always run `npm run type-check` after TypeScript changes before committing.

---

## Conventions

- **FontAwesome icons** — must be imported in `src/fa.ts` and added to `library.add()`
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


### Versioning

Uses semantic versioning (SemVer). Update `package.json` version and CHANGELOG.md for each release.

- **Patch** (X.X.+1) — Bug fixes
- **Minor** (X.+1.0) — New features, backward-compatible
- **Major** (+1.0.0) — Breaking changes
