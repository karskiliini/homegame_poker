---
description: Use when the user asks to "deploy", "deploy to vercel", "deploy to production", or "update the server". Deploys the latest committed code to both Vercel (frontend) and Railway (backend).
---

# Deploy to Production

The app has two deployment targets that must ALWAYS be deployed together:
- **Vercel** — static frontend (React SPA)
- **Railway** — backend server (Node/Express/Socket.IO)

Deploying only one without the other causes client–server version mismatch bugs.

## Step 1 — Pre-flight checks
Run these in parallel:
- `git status` — ensure working tree is clean
- `git log --oneline -1` — show what commit will be deployed

If there are uncommitted changes, warn the user and suggest running `/commit` first.

## Step 2 — Deploy both targets
Run these in parallel:
```bash
bunx vercel --prod
```
```bash
railway up
```

## Step 3 — Smoke test
Wait for Railway to finish deploying (check health endpoint), then verify the full stack works:
```bash
bun -e '
const { io } = require("socket.io-client");
const socket = io("https://homegame-poker-production.up.railway.app/player", { autoConnect: false });
socket.on("connect", () => {
  socket.on("player:connected", (data) => {
    const ok = data.stakeLevels && data.stakeLevels.length > 0;
    console.log(ok ? "SMOKE TEST PASSED" : "SMOKE TEST FAILED: no stake levels");
    socket.disconnect();
    process.exit(ok ? 0 : 1);
  });
});
socket.on("connect_error", (err) => {
  console.error("SMOKE TEST FAILED: cannot connect to Railway server:", err.message);
  process.exit(1);
});
socket.connect();
setTimeout(() => { console.error("SMOKE TEST FAILED: timeout"); process.exit(1); }, 10000);
'
```

If the smoke test fails, alert the user immediately.

## Step 4 — Report
- Print which commit was deployed
- Print both URLs:
  - Frontend: https://pokersofta.vercel.app
  - Backend: https://homegame-poker-production.up.railway.app
- Print smoke test result

## Step 5 — Sync bug reports
After successful deployment, run `/fetch_user_bugs` to sync any new user-submitted bug reports.
