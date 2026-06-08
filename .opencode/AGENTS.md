# Overleaf Project — Agent Pipeline (Single-File)

**⚠️ Read this file. Do NOT search for other instructions. Everything is here.**

---

## PHASE 0: STARTUP CHECK (always run first)

Run these 3 commands in order. Stop at first failure.

```
1. pnpm typecheck
   PASS: "4 successful"     FAIL: stop and report error

2. docker ps --filter name=postgres --format '{{.Status}}'
   PASS: "(healthy)"        FAIL: docker compose -f docker/docker-compose.yml up -d

3. curl -sf http://localhost:3001/api/v1/health
   PASS: "status":"ok"      FAIL: kill $(lsof -ti:3001); cd apps/api && npx tsx src/index.ts &
```

---

## PHASE 1: MAKE A CHANGE (one file at a time)

```
READ   → the file (use offset/limit for files >100 lines)
EDIT   → make ONE change to ONE file
CHECK  → pnpm typecheck
FIX    → if typecheck fails, go to PHASE 2
LOOP   → repeat for next file
```

**IMPORT RULES — get these wrong and typecheck breaks:**

| Directory | Import style | Example |
|-----------|-------------|---------|
| `packages/db/src/schema/*.ts` | no `.js` extension | `from './users'` |
| `packages/db/src/*.ts` | no `.js` extension | `from './schema/index'` |
| `apps/api/src/**/*.ts` | **must** have `.js` extension | `from '../middleware/auth.middleware.js'` |
| `apps/web/src/**/*.tsx` `apps/web/src/**/*.ts` | **must** have `.js` extension | `from '../../stores/editor.store.js'` |
| npm packages | no extension | `from 'fastify'` |

---

## PHASE 2: FIX COMMON ERRORS

### Error: TS2307 "Cannot find module './X.js'"
→ Change to `'./X'` (remove `.js`) — ONLY in `packages/db/`

### Error: TS2307 "Cannot find module '../X'" 
→ Add `.js` extension — ONLY in `apps/api/` or `apps/web/`

### Error: EADDRINUSE
→ `kill $(lsof -ti:3001)` then restart server

### Error: typecheck fails on first attempt
→ Run `pnpm typecheck 2>&1` — read the FIRST error line. Fix that file. Re-run. Loop until clean.

---

## PHASE 3: KNOW THIS PROJECT

### LaTeX syntax highlighting
The CodeMirror editor uses `stex` mode from `@codemirror/legacy-modes/mode/stex`. 
Commands → `"tag"`, Comments → `"comment"`, Braces → `"bracket"`, Math → `"keyword"`.
Theme classes to style: `.cm-tag`, `.cm-comment`, `.cm-bracket`, `.cm-keyword`, `.cm-atom`.

### Compilation flow (frontend)
```
ProjectHeader.compile() → useCompilation → POST /compile
  → onSuccess sets compilationId in store
  → useCompilationSSE(compilationId) creates EventSource
  → SSE updates compilation store
  → PDFViewer reads pdfUrl from store
  
⚠️ NEVER call reset() inside useCompilationSSE — it kills compilationId
⚠️ useAutoSave watches Zustand content and debounces PATCH /files/:id
```

### Auth flow
```
Login page uses useLogin() from useAuthActions.ts — NOT useAuth()
useAuth() fires GET /auth/me which causes flash when backend is down
```

### Import path rule for routes files
`apps/web/src/routes/*.tsx` → imports from `../hooks/X.js` (one level up)
NOT `../../hooks/`

---

## PHASE 4: VERIFY THE WHOLE SYSTEM

After all changes are done and typecheck passes:

```
curl -sf http://localhost:3001/api/v1/health
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@overleaf.local","password":"password123"}'
```

Both must return 200. If not, check server logs at /tmp/overleaf-server.log.
