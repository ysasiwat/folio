# Documentation Rules

## Files

```
docs/
├── report.md         ← build/test log (append-only)
├── user_manual.md    ← feature reference for users (update on success only)
└── notes.md          ← problem/solution log (append-only)
```

## Triggers

| File | When to update |
|------|---------------|
| `report.md` | After every build or test run (PASS or FAIL) |
| `user_manual.md` | After a successful build that adds or changes a user-facing feature |
| `notes.md` | When a problem is found OR when it's solved |

## report.md — Format

Prepend a new entry (newest at top):

```markdown
## [YYYY-MM-DD HH:MM] {task description} — PASS | FAIL

**Command**: {the command that was run}
**Result**: PASS | FAIL
**Details**: {error summary or "all tests pass, clean build"}
**Files changed**: {list files created or modified}
```

## user_manual.md — Format

One section per feature:

```markdown
## {Feature Name}

**Activate**: {keyboard shortcut or menu path}
**What it does**: {one-line description}

**How to use**:
1. {step 1}
2. {step 2}

**Options**: {font, size, colour, etc. — omit if no options}
```

Only update on successful builds. Never update from a failed build.

## notes.md — Format

Append entries (newest at bottom):

```markdown
## [OPEN | SOLVED] {Problem title}  ({YYYY-MM-DD})

**Symptom**: {what was observed}
**Context**: {what was being worked on}
**Root cause**: {leave blank until solved}
**Solution**: {leave blank until solved}
**Prevention**: {how to avoid in future}
```

## Validation

```bash
ls docs/report.md docs/user_manual.md docs/notes.md
grep -c '^## \[' docs/report.md
grep -rE '\{[A-Za-z_-]+\}' docs/ && echo "WARNING: unfilled placeholders"
```
