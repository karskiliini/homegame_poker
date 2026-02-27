---
description: Use when the user asks to "deploy", "push to railway", "deploy to production", or "update the server". Pushes the latest committed code to Railway.
---

# Deploy to Railway

## Step 1 — Pre-flight checks
Run these in parallel:
- `git status` — ensure working tree is clean
- `git log --oneline -1` — show what commit will be deployed

If there are uncommitted changes, warn the user and suggest running `/commit` first.

## Step 2 — Deploy
```bash
railway up --detach
```

## Step 3 — Report
- Print which commit was deployed
- Print the Railway deployment URL if available
