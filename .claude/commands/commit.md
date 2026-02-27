---
description: Use when the user asks to "commit", "make a commit", "git commit", or "save the changes". Reviews all staged and unstaged changes, writes a descriptive commit message, commits, then verifies nothing was missed. Asks the user about borderline files before including them.
---

# Git Commit

## Step 1 — Survey the working tree
Run these in parallel:
- `git status -uall` — all modified and untracked files
- `git diff` — unstaged changes
- `git diff --cached` — already staged changes
- `git log --oneline -3` — recent commit style to match tone

## Step 2 — Identify what to commit
Categorize every file:
- **Clearly in** — directly modified as part of the current feature/fix
- **Clearly out** — unrelated files, build artifacts, secrets, `.env`
- **Borderline** — new files, config changes, or anything not obviously in or out → **ask the user before staging**

Do NOT commit:
- `dist/`, `node_modules/`, `target/` (build artifacts)
- `*.env`, secrets, credentials
- Files the user hasn't mentioned and that aren't directly connected to the work

## Step 3 — Stage and commit
1. `git add <specific files>` — prefer explicit file names over `git add -A`
2. Write a commit message following the style of recent commits:
   - First line: imperative mood, ≤ 72 chars (e.g. "add OS file drag-to-timeline with snap")
   - Body (if warranted): brief bullets on what changed and why
3. Commit using a HEREDOC for clean formatting:
```bash
git commit -m "$(cat <<'EOF'
short summary line

- bullet detail 1
- bullet detail 2
EOF
)"
```

## Step 4 — Verify
Run `git status` after the commit. Report:
- What was committed (file count, summary)
- Any files still uncommitted and why they were left out
- If anything looks like it should have been included, flag it
