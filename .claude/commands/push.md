---
description: Use when the user asks to "push", "git push", "push to remote", or "create a PR". Pushes the current branch. If on main, does a simple push. If on a feature branch, pushes and creates a pull request.
---

# Git Push

## Step 1 — Determine branch and status
Run these in parallel:
- `git branch --show-current` — current branch name
- `git status` — ensure working tree is clean (warn if not)
- `git log --oneline @{upstream}..HEAD 2>/dev/null || echo "no upstream"` — unpushed commits

If there are uncommitted changes, warn the user and suggest running `/commit` first.
If there are no unpushed commits, report "already up to date" and stop.

## Step 2 — Push

### If on `main`:
```bash
git push
```
Report success with the commit range pushed.

### If on a feature branch:
1. Push with upstream tracking:
```bash
git push -u origin HEAD
```
2. Check if a PR already exists:
```bash
gh pr view --json number,url 2>/dev/null
```
3. If no PR exists, create one:
   - Run `git log --oneline main..HEAD` and `git diff main...HEAD --stat` to understand the changes
   - Write a concise PR title (imperative mood, under 70 chars)
   - Write a summary from the commit history
   - Create the PR:
```bash
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Test plan
<bulleted checklist>

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Step 3 — Report
- Print the push result
- If a PR was created or already exists, print the PR URL
