# Error & Changes Log — AeroView

---

## Format — Errors
```
### [TIMESTAMP] — Error Title
- **Error:** <verbatim error message>
- **Stack Trace:** <excerpt>
- **Root Cause:** <explanation>
- **Fix Applied:** <what was changed>
- **Files Changed:** <list>
```

## Format — Changes
```
### [TIMESTAMP] — Change: <description>
- **Requested by:** User / System
- **Reason:** <why>
- **Files Changed:** <list>
```

---

## Log

### 2026-04-12T00:00Z — create-next-app capital-letter naming failure
- **Error:** `Could not create a project called "AeroView" because of npm naming restrictions: name can no longer contain capital letters`
- **Stack Trace:** Exit code 1 from `npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --yes`
- **Root Cause:** npm package names must be lowercase. The working directory name "AeroView" was used as the package name by create-next-app.
- **Fix Applied:** Manually created `package.json` with `"name": "aeroview"` (lowercase), then installed next@15, react@19, react-dom@19 and all devDeps individually. Created all config files (tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, jest.config.ts, .eslintrc.json) manually.
- **Files Changed:** package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, jest.config.ts, .eslintrc.json

---

### 2026-04-12T00:00Z — TS2882: Cannot find module for side-effect CSS import
- **Error:** `src/app/layout.tsx(2,8): error TS2882: Cannot find module or type declarations for side-effect import of './globals.css'`
- **Stack Trace:** Exit code 2 from `npx tsc --noEmit`
- **Root Cause:** Next.js normally auto-generates `next-env.d.ts` and CSS module type declarations when `create-next-app` runs. Since we scaffolded manually, the CSS type declarations were missing.
- **Fix Applied:** Created `src/types/globals.d.ts` with `declare module '*.css'`. Also created `next-env.d.ts` with Next.js reference types (Next.js then updated it automatically on build).
- **Files Changed:** src/types/globals.d.ts (created), next-env.d.ts (created)

---

### 2026-04-12T00:00Z — ESLint circular structure warning during next build (non-fatal)
- **Error:** `ESLint: Converting circular structure to JSON — property 'plugins' -> ... --- property 'react' closes the circle`
- **Stack Trace:** Printed during `next build` linting phase; build still completed successfully.
- **Root Cause:** Known issue with `eslint-config-next` and Next.js 15 when using legacy `.eslintrc.json` format. ESLint tries to JSON-serialize its internal config graph for caching but hits a circular reference in the `react` plugin object.
- **Fix Applied:** None required — build completed successfully (✓ Compiled, 4 static pages generated). Can be resolved in a future phase by migrating to flat `eslint.config.mjs` format if linting is needed.
- **Files Changed:** None
