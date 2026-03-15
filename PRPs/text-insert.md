# PRP: text-insert

## Goal

Implement a first document editing feature that lets users place text onto a PDF page through a canvas interaction flow.

User experience target:
- User clicks **Insert Text** in the toolbar.
- Canvas enters text-insert mode.
- User clicks a page point to create an inline text editor overlay.
- User types text and confirms with Enter or by clicking elsewhere.
- Text is embedded into the PDF document.
- Undo/redo works for each insertion.

### Success Criteria

1. Toolbar contains an **Insert Text** action and can activate text mode.
2. Clicking on canvas in text mode opens an inline editor at the clicked PDF-space position.
3. Overlay preview shows text while typing.
4. Confirm commits text to PDF and refreshes rendered pages.
5. Escape cancels current edit without document mutation.
6. Insertion is undoable and redoable.
7. Works across pages and zoom levels.
8. Unit tests verify command execution and undo/redo behavior.

---

## Context to Load

Read these files before implementation:

1. `INITIAL.md`
2. `PRPs/pdf-viewer.md`
3. `PRPs/app-shell.md`
4. `package.json`
5. `src/renderer/src/App.tsx`
6. `src/renderer/src/core/AppShell.ts`
7. `src/renderer/src/core/History.ts`
8. `src/renderer/src/core/PdfRenderer.ts`
9. `src/renderer/src/hooks/usePdfViewer.ts`
10. `src/renderer/src/components/pdf-viewer/PdfViewerScreen.tsx`
11. `src/renderer/src/components/pdf-viewer/PdfViewport.tsx`
12. `src/renderer/src/store/documentStore.ts`
13. `src/renderer/src/store/editorStore.ts`
14. `src/renderer/src/types/appShell.ts`
15. `src/renderer/src/types/pdfViewer.ts`
16. `src/renderer/src/types/result.ts`
17. `src/main/index.ts`
18. `src/preload/index.ts`
19. `src/preload/index.d.ts`

Memory pre-searches:

- `search_nodes "folio text-insert"`
- `search_memory_facts "folio text-insert problem"`
- `search_memory_facts "folio PagePoint coordinate"`
- `search_memory_facts "folio pdf-lib undo"`

---

## Feature Anatomy

| Building Block | Needed | Why |
|---|---:|---|
| `index.ts` registration | Yes | Register toolbar action + mode activation |
| `{name}-mode.ts` | Yes | Handle pointer-to-text-entry interaction on canvas |
| `{name}-command.ts` | Yes | Execute PDF mutation and support undo/redo |
| `{name}-panel.tsx` | No | No sidebar requirements in INITIAL |
| `{name}-dialog.tsx` | No | Inline editor + toolbar options suffice |
| Feature store/state | Yes | Track active text draft + style options |

---

## Data Model (Concrete Types)

```ts
import type { Result } from '@renderer/types/result'

export interface TextInsertStyle {
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier'
  fontSize: number
  colorHex: string
}

export interface TextInsertDraft {
  pageIndex: number
  x: number
  y: number
  text: string
  style: TextInsertStyle
}

export interface TextInsertModeState {
  isActive: boolean
  isEditing: boolean
  draft: TextInsertDraft | null
}

export interface TextInsertCommandInput {
  pageIndex: number
  x: number
  y: number
  text: string
  style: TextInsertStyle
}

export interface PdfDocumentApi {
  snapshotBytes: () => Promise<Result<Uint8Array>>
  restoreBytes: (bytes: Uint8Array) => Promise<Result<void>>
  insertText: (input: TextInsertCommandInput) => Promise<Result<void>>
  getBytes: () => Promise<Result<Uint8Array>>
}
```

Notes:
- Keep style defaults from INITIAL: 12pt, black, Helvetica.
- `y` is already PDF-space Y-up if mode receives normalized point from canvas manager/wrapper.

---

## File Structure

### Create

1. `src/renderer/src/features/text-insert/index.ts`
2. `src/renderer/src/features/text-insert/text-insert-mode.ts`
3. `src/renderer/src/features/text-insert/text-insert-command.ts`
4. `src/renderer/src/features/text-insert/text-insert-overlay.tsx`
5. `src/renderer/src/features/text-insert/text-insert-store.ts`
6. `src/renderer/src/features/text-insert/text-insert.test.ts`
7. `src/renderer/src/core/PdfDocument.ts`

### Modify

1. `package.json` (add `pdf-lib` if missing)
2. `src/renderer/src/types/pdfViewer.ts` (mode/viewer extension types)
3. `src/renderer/src/types/appShell.ts` (optional mode registration typing)
4. `src/renderer/src/hooks/usePdfViewer.ts` (mode hook-in, overlay rendering, rerender trigger)
5. `src/renderer/src/components/pdf-viewer/PdfViewerScreen.tsx` (overlay host)
6. `src/renderer/src/App.tsx` (register text-insert action and mode wiring)
7. `src/preload/index.ts` and `src/preload/index.d.ts` (only if new IPC is required)

---

## Implementation Steps

### Step 1: Add PdfDocument wrapper

Create `src/renderer/src/core/PdfDocument.ts` to isolate all `pdf-lib` usage.

Required methods:
- `load(bytes)`
- `insertText(input)`
- `snapshotBytes()`
- `restoreBytes(bytes)`
- `getBytes()`

Rules:
- Return `Result<T>` for all fallible operations.
- No direct `pdf-lib` usage outside this wrapper.

### Step 2: Create text-insert feature store

Create `text-insert-store.ts` with:
- active flag
- current draft
- style options (`fontFamily`, `fontSize`, `colorHex`)
- actions to begin draft, update text, confirm/cancel draft, and style updates.

Store must contain state only; no PDF write logic.

### Step 3: Implement text insert command

Create `text-insert-command.ts`:
- Accept `TextInsertCommandInput` and `PdfDocumentApi`.
- `execute()` snapshots bytes, inserts text, returns ok/err.
- `undo()` restores snapshot bytes.
- `redo()` re-runs insertion (or executes command path through history stack).

Undo safety strategy:
- Snapshot full document bytes before mutation.

### Step 4: Implement text insert mode and overlay

Create `text-insert-mode.ts` and `text-insert-overlay.tsx`:
- On pointer down in active mode: start draft at clicked `pageIndex/x/y`.
- Render a positioned HTML input/textarea overlay over active page.
- Enter confirms; Escape cancels.
- Clicking outside confirms if text is non-empty, otherwise cancels.

Coordinate rule:
- Mode uses already normalized PDF-space point from viewer canvas mapping.
- No DOM→PDF conversion in mode.

### Step 5: Wire into AppShell toolbar

In `App.tsx`:
- Register `Insert Text` toolbar item in tools group.
- Show inline text style controls while mode active:
  - font select
  - size input
  - color picker
- Keep controls deterministic and grouped.

### Step 6: Integrate with viewer render lifecycle

In `usePdfViewer.ts`:
- Keep an in-memory `PdfDocument` instance synced with currently loaded bytes.
- On command execute/undo/redo success:
  1. update document bytes in store
  2. reload/re-render pages via `PdfRenderer`
  3. preserve page/zoom where possible.

### Step 7: Add tests

Create `text-insert.test.ts` and include:
- command execute success updates bytes
- undo restores exact prior bytes
- empty text does not commit
- mode confirm/cancel behavior (logic-level unit tests)

### Step 8: Register feature module

Create `features/text-insert/index.ts` with `registerTextInsert(...)` and call it from `App.tsx` startup flow.

---

## Validation Gates

Run after each completed step (or tightly grouped sub-steps):

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If a gate fails:
1. Read the first failing error.
2. Fix root cause.
3. Re-run same gate before proceeding.

---

## Gotchas

1. **No business logic in store**
   - do not put pdf-lib calls inside Zustand actions.

2. **No raw pdf-lib outside wrapper**
   - all document mutations must go through `PdfDocument.ts`.

3. **Command undo fidelity**
   - always snapshot bytes before insert to guarantee exact restore.

4. **Coordinate mismatch risk**
   - avoid any additional Y-axis math in mode; use provided PDF-space coordinates.

5. **Focus/keyboard interactions**
   - ensure global shortcuts do not interfere while text input is focused.

6. **Re-render timing**
   - after commit/undo, refresh viewer only after document bytes update completes.

7. **Large PDFs**
   - avoid synchronous heavy loops in renderer hot paths; keep command operations async.

---

## Completion Checklist

- [ ] `PdfDocument` wrapper created and used for all mutations
- [ ] `text-insert` feature folder created
- [ ] Insert Text toolbar action activates mode
- [ ] Draft overlay appears and edits text inline
- [ ] Commit writes to PDF and refreshes viewer
- [ ] Escape cancel path leaves document unchanged
- [ ] Undo/redo functional for text insertion
- [ ] Tests added and passing
- [ ] Typecheck/lint/build/test gates all green

