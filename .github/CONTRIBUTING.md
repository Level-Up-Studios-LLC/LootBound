# Contributing to LootBound

LootBound is proprietary software owned by Level Up Studios LLC. By contributing to this project, you agree to grant Level Up Studios LLC a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, distribute, sublicense, and otherwise exploit your contributions in any form and for any purpose, as described in the [LICENSE](../LICENSE).

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Firebase CLI (`npm install -g firebase-tools`)
- FontAwesome Pro kit access (configured via `.npmrc`)

### Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Firebase config values
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)
6. Default parent PIN is `1234`

## Branch Naming

All branches are created from `main` and merged back via pull request.

| Prefix      | Purpose                    | Example                         |
| ----------- | -------------------------- | ------------------------------- |
| `feature/`  | New features               | `feature/xp-leveling-system`    |
| `bugfix/`   | Non-critical bug fixes     | `bugfix/pin-not-saving`         |
| `hotfix/`   | Critical production fixes  | `hotfix/auth-loop`              |
| `docs/`     | Documentation changes      | `docs/update-readme`            |
| `refactor/` | Code restructuring         | `refactor/split-app-context`    |
| `release/`  | Release preparation        | `release/v1.0.0`                |

## Code Conventions

These conventions are strictly enforced throughout the codebase.

### JavaScript / TypeScript

- Use `var` declarations (not `let` or `const`)
- Use `Object.assign({}, obj, { key: val })` (not spread syntax `{ ...obj, key: val }`)
- Use regular `function` declarations (not arrow functions in component bodies)
- Deep clone before mutation: `JSON.parse(JSON.stringify(data))`
- TypeScript strict mode is enabled

### Styling

- Use Tailwind CSS classes exclusively
- No CSS files, no inline style objects (except FontAwesome duotone styles via the shared `FA_ICON_STYLE` constant)
- Mobile-first design targeting 480px max-width

### FontAwesome Icons

- All icons must be imported in `src/fa.ts` from the Pro kit
- Icons must be added to `library.add()` to work with string references
- Prefer duotone icons for decorative use, classic solid for navigation

### Components

- Functional components only (no class components)
- Props destructured via parameter name `p` or `props`
- State declared with `useState` using the `var _x = useState(...), x = _x[0], setX = _x[1]` pattern

## Commit Message Format

Write clear, descriptive commit messages in imperative mood:

```text
Short summary of the change (under 72 characters)

Optional longer description explaining the why, not the what.
The diff shows what changed; the message should explain why.
```

Examples:
- "Fix PIN creation race condition on new signups"
- "Add sticky headers to kid screens for scroll context"
- "Remove legacy localStorage adapter"

## Pull Request Process

1. Create a branch from `main` using the naming conventions above
2. Make changes following the code conventions
3. Verify the build passes: `npm run build`
4. Run type checking: `npm run type-check`
5. Format code: `npm run format`
6. Push your branch and open a pull request
7. Fill out the PR template completely
8. Wait for review (CodeRabbit automated review + maintainer review)

### PR Requirements

- Build must pass without errors
- TypeScript type check must pass
- Code must be formatted with Prettier
- CHANGELOG.md must be updated for user-facing changes
- New FontAwesome icons must be registered in `fa.ts`
- Firestore security rules must be reviewed if data model changes

## Firestore Security Rules

When modifying data structures or access patterns:

1. Update `firestore.rules` accordingly
2. Test rules changes before deploying
3. Deploy rules with `firebase deploy --only firestore:rules`
4. Document any new access patterns in the PR description

## Questions

Open an issue on GitHub or use the in-app feedback form.
