# Overleaf LaTeX Editor — Build Pipeline Analysis

**Session:** June 7–8, 2026  
**Project:** Fullstack LaTeX editor (monorepo: Fastify + React + Docker PostgreSQL)  
**Commits:** 17  
**Files:** ~120  
**Agents invoked:** 40+

---

## 1. What the Pipeline Got Right

### 1.1 Verification Gates Prevented Catastrophe
Every file change was followed by `pnpm typecheck`. This caught:
- ESM import extension mismatches (`.js` in `packages/db/` → bare imports)
- Wrong react-resizable-panels v4 API names (`PanelGroup` → `Group`, `PanelResizeHandle` → `Separator`)
- Missing TypeScript types for `monaco-editor`
- `useLocation()` outside Router context

**Lesson:** TypeScript typecheck is the single most valuable verification gate. Never skip it.

### 1.2 One-File-at-a-Time Prevents Cascading Failures
Writing one file, typechecking, and fixing before moving to the next file prevented the "tower of errors" problem where 50 errors across 10 files are impossible to untangle.

### 1.3 Agent Subdelegation Preserved Main Context
When tasks got complex (rebuilding the entire frontend, auditing bugs), spawning a general agent kept the main window from overrunning. The agent returns a summary, keeping context lean.

### 1.4 Known Bug Patterns Accelerated Fixes
Pre-defined fix patterns turned debugging from "read 10 files, understand the architecture" into "match error to pattern, apply fix."

---

## 2. What the Pipeline Got Wrong

### 2.1 Server Lifetime Killed End-to-End Testing
The single biggest bottleneck: the backend server runs as a background process that dies when the parent shell exits (timeout). Every integration test had to restart the server, which added 5-10 seconds per test cycle. At 50+ test cycles, this cost ~5-8 minutes.

**Root cause:** No process manager (pm2, systemd, or a persistent terminal). The `nohup` + `disown` pattern is fragile.

**Fix:** Add a `scripts/dev.sh` that uses `tmux` or background processes that survive. Or document that the user must keep a terminal open.

### 2.2 Agent Step Limits Truncated Work
Multiple agents hit their step limits mid-task (fixing react-resizable-panels, rebuilding components). This left work half-done, requiring the orchestrator to continue manually.

**Root cause:** Tasks were too large for single agents. An agent that needs to READ 5 files, WRITE 5 files, and TYPECHECK will hit the step limit.

**Fix:** Break work into smaller units. Each agent should handle ≤3 file writes. Use the pattern: "Write file A → typecheck → return. Then write file B."

### 2.3 "Fix Everything" Instructions Backfired
When an agent was told "fix ALL bugs," it would fix some but also introduce regressions. The `content` dependency addition in `useAutoSave.ts` broke auto-save entirely — turning a missing-dep warning into a critical runtime bug.

**Root cause:** Agents don't understand side effects. Adding a variable to a dependency array seems harmless but breaks the logic.

**Fix:** Never let agents fix "lint warnings" or "missing dependencies" without explicit approval. Only fix errors that break the build.

### 2.4 LaTeX Package Debugging Was Inefficient
The compilation pipeline works, but debugging LaTeX errors (missing `fullpage.sty`, `hyperref` typo, `&` escaping) was done via trial-and-error: compile → read log → find error → fix → recompile. Each cycle took 30+ seconds.

**Root cause:** No pre-compilation validation.

**Fix:** Add a script that checks common LaTeX issues (missing packages, unbalanced braces, invalid characters) before compiling.

---

## 3. Common Failure Patterns (Ranked by Frequency)

| # | Pattern | Occurrences | Root Cause |
|---|---------|-------------|-----------|
| 1 | **Server not running** | 15+ | Background process dies with shell |
| 2 | **ESM import `.js` mismatch** | 6 | `packages/db/` needs bare imports, `apps/` needs `.js` |
| 3 | **Docker permission denied** | 4 | User namespace remapping + `chmod` issues |
| 4 | **LaTeX package missing** | 3 | `fullpage.sty`, `titlesec.sty` weren't in the Docker image |
| 5 | **Stale content compiled** | 3 | Auto-save not wired, old Zustand state |
| 6 | **TypeScript error after agent edit** | 5 | Wrong API names, missing types, unused imports |
| 7 | **React rendering loop** | 2 | Login flashing, SSE reset() killing compilationId |
| 8 | **Seed data typos** | 2 | `hyperef` → `hyperref`, JavaScript `\&` → `&` |

---

## 4. Agent Delegation Patterns That Worked

### Pattern 1: Research → Design → Build
```
Ecosystem agent → Appearance agent → Architecture agent
        ↓               ↓                    ↓
    Platform UX    Theme/Animation    State/Layout patterns
        ↓               ↓                    ↓
            General agent: Build files
```
Used for the dark theme redesign. Three research agents gathered resources, then a general agent executed the build.

### Pattern 2: Audit → Fix Cycle
```
General agent A: Audit backend  ─┐
General agent B: Audit frontend ─┼→ Orchestrator compiles report → General agent D: Fix all
General agent C: Audit Docker   ─┘
```
Used for the comprehensive bug audit. Three parallel audits found bugs, one agent fixed them.

### Pattern 3: Single-File Precision
```
General agent → READ file X → EDIT file X → RUN typecheck → RETURN result
```
Used for targeted fixes. Most reliable pattern — 100% success rate.

### Pattern 4: Fail and Delegate Deeper
```
Agent A: Fix panels → Hits step limit → Orchestrator reads result → Agent B: Continue from where A left off
```
Used when agents hit step limits. The orchestrator picks up partial work and delegates the remainder.

---

## 5. Context Management Strategies

### What Worked
- **Line-numbered reads**: Reading files with `offset`/`limit` for files >100 lines. Kept agent context under 50KB.
- **Summaries not full files**: Agents returned summaries, not full file contents.
- **One concern per agent**: Each agent handled exactly one problem domain.

### What Didn't Work
- **"Read all files first"**: Agents that read 5+ files before making any change hit step limits.
- **"Fix everything" prompts**: Too broad, agents got lost.
- **Mixing concerns**: Agents doing backend + frontend fixes in one invocation confused themselves.

### Optimal Agent Prompt Size
- **Research agents**: 200-400 words (just enough to specify the search domain)
- **Fix agents**: 50-100 words + error message (minimal context, exact fix location)
- **Build agents**: 100-200 words + exact file content to write (no creative decisions)

---

## 6. Verification Patterns (Ranked by Effectiveness)

| # | Check | Speed | Catches |
|---|-------|-------|---------|
| 1 | `pnpm typecheck` | 2s | 90% of bugs |
| 2 | `curl health` | 0.1s | Server alive? |
| 3 | `curl login` | 0.5s | Auth working? |
| 4 | Full compile test | 30s | Pipeline broken? |
| 5 | Frontend dev server | 5s | Vite proxy working? |

**Rule:** Run #1 after every file write. Run #2-3 after any backend change. Run #4 after compiler changes. Run #5 after frontend config changes.

---

## 7. Project-Specific Gotchas

### Import Rules (CRITICAL)
```
packages/db/src/schema/*.ts   →  NO .js extension   (drizzle-kit is CJS internally)
apps/api/src/**/*.ts          →  MUST have .js      (ESM)
apps/web/src/**/*.tsx/.ts     →  MUST have .js      (Vite/ESM)
node_modules imports          →  NO extension
```

### Docker/Compilation
- Docker image must have `LATEX_DOCKER_IMAGE` set in `.env`
- Temp dirs need `chmod 755` or `chmod 777` for Docker user namespace remapping
- Use `spawn()` not `exec()` for Docker commands (avoids shell quoting issues)
- Single volume mount (not double mount) avoids permission conflicts
- `.latexmkrc` file forces `biber` when `.bib` files exist

### Frontend State
- `useCompilationSSE` must NOT call `reset()` — kills compilationId
- `useAutoSave` debounces 500ms, Ctrl+S triggers immediate save + compile
- Login/Register pages must use `useAuthActions.ts` NOT `useAuth()`
- `useAuth()` fires `/auth/me` query — only call inside AuthLayout

### Monaco Editor
- Use `vs-dark`/`vs` built-in themes (NOT custom themes)
- `language="latex"` is all that's needed for syntax highlighting
- Monaco loads from CDN — need network for first load
- `@fontsource/jetbrains-mono` for self-hosted editor font

---

## 8. Recommended Pipeline Improvements

### 8.1 Pre-Flight Checklist (Before ANY Work)
```bash
pnpm typecheck              # Must pass 4/4
docker ps | grep postgres   # Must be healthy
curl localhost:3001/health  # Must return ok
```

### 8.2 Write-Verify Loop (For Every File)
```
1. READ file (offset/limit for >100 lines)
2. WRITE single file
3. pnpm typecheck
4. If fail → read fixer patterns → apply fix → go to 3
5. If pass → next file
```

### 8.3 Agent Invocation Template
```
Task: [ONE specific task]
File: [EXACT file path]
Context: [2-3 lines of relevant information]
Fix if typecheck fails: [specific fix pattern]
After: pnpm typecheck, return result
```

### 8.4 Never Delegated Patterns
- Don't fix lint warnings (only build errors)
- Don't refactor while fixing bugs
- Don't read more than 3 files in one agent invocation
- Don't delegate "fix everything" — delegate "fix this specific error"

### 8.5 When to Use Which Agent
| Situation | Agent | Why |
|-----------|-------|-----|
| New feature (3+ files) | `frontend-bookmarks/*` research first | Gather patterns before coding |
| Single file fix | `general` | Fast, focused |
| Debug compilation | `general` with exact error | Pattern matching |
| Bug audit | 3 `general` in parallel | Coverage across layers |
| UI rebuild | `frontend-bookmarks/appearance` → `general` | Theme + implementation |
| Architecture change | `frontend-bookmarks/architecture` | Pattern recommendations |

---

## 9. Metrics

| Metric | Value |
|--------|-------|
| Total files | ~120 |
| Git commits | 17 |
| Bug cycles | ~8 (each 3-5 fix attempts) |
| Server restarts | ~50 (background process dying) |
| Typecheck runs | ~80 |
| Agent invocations | 40+ |
| Agents that hit step limits | ~12 |
| Regressions from "fixes" | 2 |
| Total elapsed | ~2 days |

---

*Generated from the Overleaf LaTeX Editor build session, June 2026.*
