---
name: bump
description: Bump version number across all package.json files (patch/minor/major)
user_invocable: true
---

Bump the project version number. The argument specifies the bump type: `patch`, `minor`, or `major`. If no argument is given, default to `patch`.

Steps:

1. **Read current version** from the root `package.json`.

2. **Calculate new version** based on semver:
   - `patch`: increment the third number (e.g. 1.2.3 → 1.2.4)
   - `minor`: increment the second number, reset patch (e.g. 1.2.3 → 1.3.0)
   - `major`: increment the first number, reset minor and patch (e.g. 1.2.3 → 2.0.0)

3. **Update all 4 package.json files** with the new version:
   - `package.json` (root)
   - `shared/package.json`
   - `server/package.json`
   - `client/package.json`

4. **Print the result**: `Version bumped: X.Y.Z → A.B.C`
