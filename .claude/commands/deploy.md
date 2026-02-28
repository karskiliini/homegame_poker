---
description: Use when the user asks to "deploy", "deploy to vercel", "deploy to production", or "update the server". Deploys the latest committed code to Vercel.
---

# Deploy to Vercel

## Step 1 — Pre-flight checks
Run these in parallel:
- `git status` — ensure working tree is clean
- `git log --oneline -1` — show what commit will be deployed

If there are uncommitted changes, warn the user and suggest running `/commit` first.

## Step 2 — Deploy
```bash
bunx vercel --prod
```

## Step 3 — Report
- Print which commit was deployed
- Print the Vercel production URL (https://pokersofta.vercel.app)

## Step 4 — Sync bug reports
After successful deployment, run `/fetch_user_bugs` to sync any new user-submitted bug reports.
