# Workflow Procedures

---

## Workflow 1 — Generate PRP

**Trigger**: user says "Generate a PRP for {feature-name}" or "Plan {feature-name}".

### Steps

1. **Read `INITIAL.md`** — extract: feature name, user story, which building blocks are needed
   (canvas mode, command, panel, dialog), acceptance criteria, and any gotchas.

2. **Read these files** before generating the plan:
   ```
   src/renderer/core/AppShell.ts        (or read examples/feature/Feature_pattern.md)
   src/renderer/core/PdfDocument.ts
   src/renderer/core/CanvasManager.ts
   src/renderer/core/History.ts
   src/renderer/types/index.ts
   PRPs/templates/prp_feature.md
   examples/feature/Feature_pattern.md
   ```

3. **Read the most similar existing feature** for reference (if one exists).

4. **Run Mem0 searches**:
   ```
   memory_search "pdf-editor {feature-name}"
   memory_search "pdf-editor {feature-name} problem"
   ```

5. **Determine the feature anatomy** from `INITIAL.md` answers:
   - Canvas interaction → include `{name}-mode.ts`
   - PDF modification → include `{name}-command.ts`
   - Sidebar panel → include `{name}-panel.tsx`
   - Dialog → include `{name}-dialog.tsx`
   - Always → include `index.ts`

6. **Generate the PRP** using `PRPs/templates/prp_feature.md` as the base:
   - Replace all `{placeholder}` text
   - Write concrete TypeScript interfaces in Data Model
   - List every file to create with project-relative paths
   - Write code or pseudocode for each implementation step
   - Write runnable shell command validation gates
   - List gotchas specific to this feature

7. **Quality check**:
   - [ ] No `{placeholder}` text remaining
   - [ ] Concrete TypeScript types in Data Model
   - [ ] Runnable gates (not prose descriptions)
   - [ ] Canvas mode uses `PagePoint` (no coordinate math)
   - [ ] Commands have snapshot-based undo
   - [ ] `index.ts` registers with `AppShell`
   - [ ] Feature registered in `src/renderer/main.tsx`

8. **Save** to `PRPs/{feature-name}.md`.

9. **Report** what was generated and ask the user to review before executing.

---

## Workflow 2 — Execute PRP

**Trigger**: user says "Execute PRPs/{feature-name}.md" or "Implement {feature-name} step by step".

### Steps

1. **Read the PRP file** in full.

2. **Read every file listed in "Context to Load"** — do not skip any.

3. **Run Mem0 searches**:
   ```
   memory_search "pdf-editor {feature-name}"
   memory_search "pdf-editor {feature-name} problem"
   ```

4. **Implement each step in order**:
   - After completing a step, run its validation gate
   - Fix errors before moving to the next step
   - Never skip a failing gate

5. **On any unexpected error**, run a reactive search before fixing:
   ```
   memory_search "pdf-editor {error-keyword}"
   ```

6. **After all steps**, run the full validation suite:
   ```bash
   npx tsc --noEmit
   npx eslint src/ --ext .ts,.tsx
   npx vitest run
   npx electron-vite build
   ```

7. **Update documentation** per `08-documentation.md` triggers.

8. **Report** which files were created, and the final status of each validation gate.

### Hard Rules During Execution

- Never use `any` — use `unknown` and narrow
- All fallible functions return `Result<T>` — never throw from a Command
- Canvas modes receive `PagePoint` — never do coordinate math inside a mode
- Commands implement both `execute()` and `undo()` — test undo manually
- Register feature in `src/renderer/main.tsx` before calling it done
- No file I/O in the renderer process

### If Blocked

| Error | Action |
|-------|--------|
| TypeScript error | Read full error + line number, fix the type, recompile |
| Test failure | Read the failure output, fix the assertion or the implementation |
| IPC error | Check `contextIsolation: true` in main; check preload exposes the channel |
| pdf-lib rendering issue | Check if `await doc.save()` is awaited; check page index is 0-based |
| Y-axis bug (content at wrong position) | Verify CanvasManager converts DOM → PagePoint before calling the mode |

---

## Workflow 3 — Generate / Update Docs

**Trigger**: user says "Generate docs for {feature-name}" or "Update the docs".

### Steps

1. **Determine which docs to update**:
   - Build or test just ran → `docs/report.md`
   - Build PASS + feature added or changed → `docs/user_manual.md`
   - Problem found or solved → `docs/notes.md`

2. **Read the current version** of each doc to update (to prepend/append, not overwrite).

3. **Update each doc** following the format in `08-documentation.md`.

4. **Run Mem0 saves** for any test failures or solved problems.

5. **Run validation**:
   ```bash
   ls docs/report.md docs/user_manual.md docs/notes.md
   grep -c '^## \[' docs/report.md
   grep -rE '\{[A-Za-z_-]+\}' docs/ && echo "WARNING: unfilled placeholders"
   ```

6. **Report** which files were updated.
