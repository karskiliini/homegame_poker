# Project Guidelines

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

## Worktree
Always use a git worktree when working on bugs or features. This keeps the main workspace clean and runnable for the user at all times. Merge changes back to main only when the work is complete, tested, and committed.

## Local Testing
When starting a local server for manual testing, always use a random free port to avoid conflicts with other running instances (e.g. the user's dev server or another Claude instance). Use `--port 0` or pick a random port in the 4000–5999 range. Never use the default ports 3000 or 5173 for testing.

## Bug Tracking
When testing a bug fix or feature, if you discover an unrelated bug, check if it already exists in `doc/bugs.md`. If not, add it there. Do not fix unrelated bugs during the current task — just document them.

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
- **TV view** (`/table`) — full-screen `w-screen h-screen`, dark radial gradient bg, large text, no scrolling
- **Phone view** (`/*`) — `min-h-screen flex flex-col`, 58vh mini-table + 42vh action area, scaled via CSS `transform`

### Component Patterns
- Shared components in `client/src/components/` (Card, CardBack, ChipStack, SoundToggle, BugReport*)
- Size variants via prop (`sm | md | lg`) mapped to pixel lookup objects
- Modals use `fixed inset-0 bg-black/70 z-50` overlay pattern
- No icon library — only inline SVG and emoji avatars
- No external image assets — everything is CSS gradients, inline SVG, or emoji
- Typography: system font `'Helvetica Neue', Arial, sans-serif`; `font-mono` (Tailwind) for all numbers
- Framer Motion only for screen transitions (`AnimatePresence` + `motion.div`) and card-fold exit animations
