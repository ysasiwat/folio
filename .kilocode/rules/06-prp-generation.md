# PRP Generation Rules

Apply these rules when generating a PRP from `INITIAL.md`.

## Required Sections in Every PRP

- **Goal** — what the feature does from a user perspective; measurable success criteria
- **Context to Load** — explicit list of files to read before writing any code
- **Feature Anatomy** — which building blocks this feature needs (mode, command, panel, dialog)
- **Data Model** — concrete TypeScript types; no `{placeholder}` types
- **File Structure** — exact project-relative paths for every file to create
- **Implementation Steps** — ordered steps with real code or pseudocode
- **Validation Gates** — runnable shell commands, not descriptions
- **Gotchas** — known failure modes specific to this feature

## PRP File Name

```
PRPs/{feature-name}.md

# Examples:
PRPs/text-insert.md
PRPs/signature.md
PRPs/split.md
```

## Placeholder Rules

Replace ALL `{placeholder}` text before saving:
- `{feature-name}` → actual kebab-case name (e.g. `text-insert`)
- `{FeatureName}` → PascalCase (e.g. `TextInsert`)
- `{description}` → actual feature description

A PRP with unresolved placeholders cannot be executed.

## Data Models Must Be Concrete

```ts
// CORRECT
interface TextInsertModeState {
  isEditing: boolean;
  pageIndex: number;
  position: { x: number; y: number };
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

// WRONG — placeholder types
interface TextInsertModeState {
  {field}: {type};
}
```

## Validation Gates Must Be Shell Commands

```bash
# CORRECT
npx tsc --noEmit 2>&1 | grep "error TS" | head -10

# WRONG
"Make sure TypeScript compiles without errors"
```

## Feature Anatomy Decision Guide

When generating a PRP from `INITIAL.md`, determine which building blocks are needed:

| Question from INITIAL.md | Building block needed |
|--------------------------|----------------------|
| "Yes" to canvas interaction | `{name}-mode.ts` |
| "Yes" to modifying PDF | `{name}-command.ts` |
| "Yes" to sidebar panel | `{name}-panel.tsx` |
| "Yes" to dialog | `{name}-dialog.tsx` |
| Always | `index.ts` |

## Quality Check Before Saving the PRP

- [ ] All `{placeholder}` replaced with real values
- [ ] File paths are relative to project root (no leading `/`)
- [ ] Data model has concrete TypeScript types
- [ ] Validation gates are copy-pasteable shell commands
- [ ] `Result<T>` used for all fallible operations
- [ ] Canvas mode uses `PagePoint` — no coordinate math in the mode
- [ ] Commands have both `execute()` and `undo()` with snapshot/restore pattern
- [ ] `index.ts` registers the feature with `AppShell`
- [ ] Feature registered in `src/renderer/main.tsx`
- [ ] IPC channels declared in `src/preload/index.ts` (if main process involved)
