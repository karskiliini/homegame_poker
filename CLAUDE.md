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
