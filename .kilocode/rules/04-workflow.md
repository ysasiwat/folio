# Development Workflow

## The PRP Workflow

**Step 1** — Fill out `INITIAL.md`.

**Step 2** — Generate a PRP:
> "Generate a PRP for {feature-name}."

Kilo Code reads `INITIAL.md`, reads the relevant patterns, and produces a detailed
implementation plan at `PRPs/{feature-name}.md`.

**Step 3** — Review the PRP briefly. If something looks wrong, correct `INITIAL.md` and regenerate.

**Step 4** — Execute the PRP:
> "Execute PRPs/{feature-name}.md step by step."

Kilo Code implements each step and runs the validation gate before moving to the next.

**Step 5** — Update docs:
> "Generate docs for {feature-name}."

---

## Validation Gates

Run after each implementation step. Never batch fixes.

```bash
# TypeScript — no type errors
npx tsc --noEmit 2>&1 | head -30

# Lint — no ESLint errors
npx eslint src/ --ext .ts,.tsx 2>&1 | head -30

# Unit tests
npx vitest run --reporter=verbose 2>&1 | tail -40

# Build check
npx electron-vite build 2>&1 | tail -20
```

If a gate fails: read the error, fix the root cause, re-run the gate.
Do not skip gates. Do not move to the next step until the gate is green.

---

## Adding a New Feature — Checklist

- [ ] `INITIAL.md` filled out
- [ ] PRP generated and reviewed
- [ ] Feature folder created: `src/renderer/features/{name}/`
- [ ] `index.ts` exports a `register{Name}(shell: AppShell)` function
- [ ] Feature registered in `src/renderer/main.tsx`
- [ ] All Commands implement `execute()` and `undo()` — and `undo()` actually reverts the change
- [ ] Canvas mode (if any) uses `PagePoint` — no coordinate math inside the mode
- [ ] IPC handler added in `src/main/ipc/` (if feature needs main process)
- [ ] IPC channel declared in `src/preload/index.ts`
- [ ] Unit tests written
- [ ] All validation gates pass
- [ ] Manual smoke test: open real PDF → use the feature → save → reopen → change is present

---

## Manual Smoke Test Script

```bash
# Build and launch
npx electron-vite build
npx electron .

# Test steps (in the running app):
# 1. File > Open → open tests/fixtures/sample.pdf
# 2. Activate the new feature
# 3. Use it (interact, confirm)
# 4. File > Save As → save to /tmp/test-output.pdf
# 5. File > Open → open /tmp/test-output.pdf
# 6. Verify the change is present in the reopened file
# 7. Ctrl+Z (undo) if applicable — verify change is removed
```

---

## Documentation Update Triggers

| When | What to update |
|------|---------------|
| After every build/test run | Append to `docs/report.md` |
| After successful build + new or changed feature API | Update `docs/user_manual.md` |
| Problem found or solved | Update `docs/notes.md` |
