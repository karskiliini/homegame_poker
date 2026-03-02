# Design System

## Token Namespace
All design tokens are CSS custom properties with `--ftp-` prefix, defined in `client/src/styles/index.css` under `:root`. Always use these tokens — never hardcode colors or timing values.

## Styling Approach (3 layers)
1. **Tailwind CSS v4** — layout utilities (`flex`, `grid`, `fixed`, `gap-*`, `w-full`, `min-h-screen`). No `tailwind.config.js` — v4 CSS-first config via `@import "tailwindcss"`.
2. **Inline `style={{}}` props** — dominant for poker-specific visuals (table, seats, cards, chips, buttons). Use `var(--ftp-*)` for tokens. Complex gradients and programmatic mutations go here.
3. **Global animation classes** — keyframe animations defined in `index.css` as `.animate-*` classes (e.g. `.animate-winner-glow`, `.animate-chip-fly`, `.animate-card-flip`).

No CSS Modules, no styled-components, no Sass.

## Key Token Groups
- **Colors:** `--ftp-red`, `--ftp-bg-*`, `--ftp-felt-*`, `--ftp-gold-*`, `--ftp-text-*`
- **Action buttons:** `--ftp-btn-fold`, `--ftp-btn-check`, `--ftp-btn-call`, `--ftp-btn-raise` (each with `-dark` and `-shadow`)
- **Cards:** 4-color deck — spade=#000, heart=#CC0000, diamond=#0066CC (blue), club=#008800 (green)
- **Chips:** `--ftp-chip-white/red/green/black/blue`
- **Animation timing:** `--ftp-anim-*` (e.g. `--ftp-anim-card-deal: 350ms`)
- **Easing:** `--ftp-ease-*` (e.g. `--ftp-ease-overshoot` for pop-in effects)

## Rendering
- **Phone view** (GameScreen) — `min-h-screen flex flex-col`, 79vh mini-table + action area, scaled via CSS `transform`
- **Watching view** (WatchingScreen) — spectator view using same layout as phone view

## Component Patterns
- Shared components in `client/src/components/` (Card, CardBack, ChipStack, SoundToggle, BugReport*)
- Size variants via prop (`sm | md | lg`) mapped to pixel lookup objects
- Modals use `fixed inset-0 bg-black/70 z-50` overlay pattern
- No icon library — only inline SVG and emoji avatars
- No external image assets — everything is CSS gradients, inline SVG, or emoji
- Typography: system font `'Helvetica Neue', Arial, sans-serif`; `font-mono` (Tailwind) for all numbers
- Framer Motion only for screen transitions (`AnimatePresence` + `motion.div`) and card-fold exit animations
