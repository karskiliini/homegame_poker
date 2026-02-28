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
