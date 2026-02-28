## Feature Development Workflow

Read the file `doc/roadmap.md` and pick the first unchecked item (`- [ ]`) that is NOT marked as [WIP].

### Process

1. **Understand the feature** — Read the feature description. Explore the existing codebase thoroughly to understand how the feature integrates with current architecture (components, socket events, state management, server logic). Mark the feature as [WIP] in `doc/roadmap.md`.

2. **Ask clarifying questions** — Before writing any code, ask the developer targeted questions about:
   - UX details: what exactly should the user see and interact with?
   - Edge cases: what happens in unusual situations?
   - Scope: what's the minimum viable version vs nice-to-haves?
   - Integration: how should this interact with existing features?
   Do NOT proceed until you have clear answers.

3. **Plan the implementation** — Use EnterPlanMode to create a detailed implementation plan. Include:
   - All files to create/modify
   - Socket events needed (shared types)
   - Server-side logic
   - Client-side components and state
   - Animations and visual polish
   - Test strategy
   Wait for plan approval before coding.

4. **Write tests first (TDD)** — For every use case:
   - Write a failing test that describes expected behavior
   - Run it and confirm it FAILS
   - Only then implement the feature code
   - Aim for thorough coverage: happy paths, edge cases, error states, integration with other features

5. **Implement with polish** — Build the feature with:
   - **Stunning UI** — smooth animations (transitions, spring physics, opacity fades), responsive layout, consistent with existing design language
   - **Snappy interactions** — instant visual feedback, no perceived lag, optimistic updates where appropriate
   - **Full integration** — verify the feature works correctly with ALL existing features (hand history, showdown, RIT, rebuy, sit out, disconnect/reconnect, table view, player view, multi-table if applicable)

6. **Run all tests** — Run `bun run test` and ensure:
   - All new tests pass
   - No existing tests are broken
   - Build succeeds (`bun run build`)

7. **Manual testing** — Start the local server and test the feature end-to-end yourself. YOU are the tester:
   - Test the happy path
   - Test edge cases
   - Test on both watching view and player view (phone)
   - Verify animations look smooth and polished
   - Check that existing functionality still works

8. **Mark as done** — Update `doc/roadmap.md` and mark the feature as done (`- [x]`).

9. **Commit** — Use /commit to commit all changes.

### Important rules

- Do NOT skip TDD — always write tests before implementation code.
- Do NOT ask the user to test — you develop the tests and do the manual testing yourself.
- Do NOT ship ugly UI — every visual element must have smooth animations, proper spacing, and consistent styling.
- Do NOT break existing features — verify full integration before marking done.
- ASK clarifying questions early — it's cheaper to ask than to rebuild.
- Keep the scope focused — implement the feature described, don't gold-plate beyond what's needed.
