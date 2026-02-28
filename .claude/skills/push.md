---
name: push
description: Push current branch. If on a worktree/feature branch, rebase onto main and fast-forward merge before pushing.
user_invocable: true
---

Push the current work to the remote repository.

## If on `main`

Simply push:
```
git push origin main
```

## If on a feature/worktree branch

Always merge to main instead of creating a PR. Follow the worktree merge workflow from CLAUDE.md:

1. **Fetch latest main**: `git fetch origin main`
2. **Rebase onto main**: `git rebase origin/main`
   - If version conflicts occur, re-bump to a higher version after resolving
3. **Switch to main in the main repo** and fast-forward merge:
   ```
   git -C /Users/marski/git/poker_softa checkout main
   git -C /Users/marski/git/poker_softa merge --ff-only <branch-name>
   ```
4. **Push main**: `git -C /Users/marski/git/poker_softa push origin main`
5. **Delete remote branch**: `git push origin --delete <branch-name>`

Never create GitHub Pull Requests — always merge directly to main.
