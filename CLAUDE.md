# Project Guidelines

## Codebase Structure
Read `doc/structure.md` before starting any task. It contains:
- Directory structure and feature-to-file mapping
- Largest files (hotspots) that most tasks touch
- Test file organization

Use it to determine which files to read — never scan the whole repo from scratch. If `doc/structure.md` doesn't cover what you need, ask the user for guidance and update the file with what you learn.

## Documentation Maintenance
After completing any feature or bug fix, review `doc/` files and update them if your changes made them stale:
- `doc/structure.md` — update if files were added/removed/renamed or new features introduced
- `doc/bugs.md` — update if a documented bug was fixed
- `doc/roadmap.md` — update if a roadmap item was completed

## Code Quality
Keep changes minimal and elegant. No boilerplate, no verbose patterns. After completing a feature or fix, look for opportunities to simplify, modularize, or clean up — then do it before committing.

## Package Manager
Always use `bun` instead of `npm`. This applies to all commands: install, run, build, test, etc.
- `bun install` instead of `npm install`
- `bun run build` instead of `npm run build`
- `bun run test` instead of `npm run test`
- `bunx` instead of `npx`

## Testing: TDD
Use Test-Driven Development. For use-case testing:
1. Write a test with a description of what should happen on screen
2. Implement the feature
3. Verify the implementation matches the test
4. If it doesn't match, fix until it does

## Starting a New Task
Always fetch and check out the latest `main` before starting any new task: `git fetch origin && git checkout main && git pull origin main`. This ensures you're building on the most up-to-date code and avoids unnecessary merge conflicts.

## Worktree
Always use a git worktree when working on bugs or features. This keeps the main workspace clean and runnable for the user at all times. Merge changes back to main only when the work is complete, tested, and committed.

When merging back to main, always rebase the dev branch onto main first (`git rebase main`) and then fast-forward merge (`git merge --ff-only <branch>`). This keeps the git history linear without merge commits. After merging, delete the worktree branch both locally and from remote (`git branch -d <branch>` and `git push origin --delete <branch>`).

**Never create GitHub Pull Requests.** Always merge worktree/feature branches directly to main via rebase + fast-forward merge, then push main. Use `/push` to do this automatically.

## Local Testing
When starting a local server for manual testing, always use a random free port to avoid conflicts with other running instances (e.g. the user's dev server or another Claude instance). Use `--port 0` or pick a random port in the 4000–5999 range. Never use the default ports 3000 or 5173 for testing.

## Skills / Slash Commands
When the user invokes a skill (e.g. `/commit`, `/push`, `/deploy`, `/work`), execute it immediately without asking for confirmation. Never ask "should I proceed?" or "do you want me to run this?" — just do it.

## Version Bumping
Always bump the version number when a feature or bugfix is complete (before committing). Use semver:
- **patch** (x.y.Z) — bug fixes
- **minor** (x.Y.0) — new features
- **major** (X.0.0) — breaking changes

All 4 `package.json` files must be updated together: root, `shared/`, `server/`, `client/`. Use `/bump` to do this automatically.

**Rebase version conflicts:** If during `git rebase main` the version in your branch conflicts with main (i.e. someone else already bumped to the same version), you must re-bump to a higher version after resolving the conflict. For example, if you set 1.4.0 but main is already at 1.4.0, bump to 1.4.1 (or 1.5.0 if appropriate).

## Bug Tracking
When testing a bug fix or feature, if you discover an unrelated bug, check if it already exists in `doc/bugs.md`. If not, add it there. Do not fix unrelated bugs during the current task — just document them.

## Bug Fix Post-Mortem
After every bug fix, perform a root cause analysis:
1. **Why did this bug exist?** — Identify the root cause (missing validation, wrong assumption, unclear spec, missing test coverage, etc.)
2. **How to prevent recurrence?** — Make the necessary changes:
   - Add or update tests to cover the exact failure scenario (should already exist if bugfix was done with TDD)
   - Update skills, CLAUDE.md, or other process docs if the bug reveals a gap in conventions or workflows
   - Add guardrails (assertions, type checks, validation) if the root cause was a class of error that can happen elsewhere
3. **Apply the changes** — Don't just document; actually implement the preventive measures as part of the bug fix commit.

## Deployment Architecture
The app runs on two separate services that must ALWAYS be deployed together:
- **Vercel** — static frontend (React SPA), URL: https://pokersofta.vercel.app
- **Railway** — backend server (Node/Express/Socket.IO), URL: https://homegame-poker-production.up.railway.app

The client connects to Railway via `VITE_SERVER_URL` env var (set in Vercel dashboard, baked into bundle at build time). Deploying only one service causes client–server version mismatch bugs. Always use `/deploy` which handles both.

## Design System

### Token Namespace
All design tokens are CSS custom properties with `--ftp-` prefix, defined in `client/src/styles/index.css` under `:root`. Always use these tokens — never hardcode colors or timing values.

### Styling Approach (3 layers)
1. **Tailwind CSS v4** — layout utilities (`flex`, `grid`, `fixed`, `gap-*`, `w-full`, `min-h-screen`). No `tailwind.config.js` — v4 CSS-first config via `@import "tailwindcss"`.
2. **Inline `style={{}}` props** — dominant for poker-specific visuals (table, seats, cards, chips, buttons). Use `var(--ftp-*)` for tokens. Complex gradients and programmatic mutations go here.
3. **Global animation classes** — keyframe animations defined in `index.css` as `.animate-*` classes (e.g. `.animate-winner-glow`, `.animate-chip-fly`, `.animate-card-flip`).

No CSS Modules, no styled-components, no Sass.

### Key Token Groups
- **Colors:** `--ftp-red`, `--ftp-bg-*`, `--ftp-felt-*`, `--ftp-gold-*`, `--ftp-text-*`
- **Action buttons:** `--ftp-btn-fold`, `--ftp-btn-check`, `--ftp-btn-call`, `--ftp-btn-raise` (each with `-dark` and `-shadow`)
- **Cards:** 4-color deck — spade=#000, heart=#CC0000, diamond=#0066CC (blue), club=#008800 (green)
- **Chips:** `--ftp-chip-white/red/green/black/blue`
- **Animation timing:** `--ftp-anim-*` (e.g. `--ftp-anim-card-deal: 350ms`)
- **Easing:** `--ftp-ease-*` (e.g. `--ftp-ease-overshoot` for pop-in effects)

### Two Rendering Targets
- **Watching view** (WatchingScreen) — full-screen `w-screen h-screen`, dark radial gradient bg, large text, no scrolling
- **Phone view** (GameScreen) — `min-h-screen flex flex-col`, 79vh mini-table + action area, scaled via CSS `transform`

### Component Patterns
- Shared components in `client/src/components/` (Card, CardBack, ChipStack, SoundToggle, BugReport*)
- Size variants via prop (`sm | md | lg`) mapped to pixel lookup objects
- Modals use `fixed inset-0 bg-black/70 z-50` overlay pattern
- No icon library — only inline SVG and emoji avatars
- No external image assets — everything is CSS gradients, inline SVG, or emoji
- Typography: system font `'Helvetica Neue', Arial, sans-serif`; `font-mono` (Tailwind) for all numbers
- Framer Motion only for screen transitions (`AnimatePresence` + `motion.div`) and card-fold exit animations
