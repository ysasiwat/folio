# PRP: app-shell

## Goal

Build a reusable `AppShell` foundation that wraps the current PDF viewer with a registration-driven UI frame:

- Top toolbar (grouped controls)
- Left sidebar panel host with tab icons (Bookmarks first)
- Center viewer content area
- Bottom status bar
- Undo/redo command infrastructure with keyboard shortcuts

This is a platform feature (not a user feature) that future tools (Insert Text, Signature, etc.) will register into.

### Success Criteria

1. App layout is stable as `toolbar + content row + status bar`.
2. Content row is `sidebar + viewer`, where sidebar is collapsible and panel-based.
3. Feature code can register toolbar buttons through `shell.addToolbarButton(...)`.
4. Feature code can register panels through `shell.addPanel(...)`.
5. Feature code can execute undoable commands through `shell.executeCommand(...)`.
6. `Ctrl+Z` performs undo; `Ctrl+Y` and `Ctrl+Shift+Z` perform redo.
7. Undo/redo toolbar controls are disabled when no operation is available.
8. Existing Bookmarks UI is hosted as a shell panel (not hardcoded in page layout).
9. Status bar shows filename + `Page X / Y`.

---

## Context to Load

Read these files before implementation:

1. `INITIAL.md`
2. `PRPs/pdf-viewer.md`
3. `package.json`
4. `tsconfig.web.json`
5. `tsconfig.node.json`
6. `src/renderer/src/App.tsx`
7. `src/renderer/src/main.tsx`
8. `src/renderer/src/hooks/usePdfViewer.ts`
9. `src/renderer/src/components/pdf-viewer/PdfViewerScreen.tsx`
10. `src/renderer/src/components/pdf-viewer/PdfToolbar.tsx`
11. `src/renderer/src/components/pdf-viewer/PdfOutlineSidebar.tsx`
12. `src/renderer/src/store/documentStore.ts`
13. `src/renderer/src/store/editorStore.ts`
14. `src/renderer/src/types/result.ts`
15. `src/renderer/src/types/pdfViewer.ts`
16. `src/renderer/src/assets/main.css`
17. `src/renderer/src/assets/pdf-viewer.css`

Memory pre-searches:

- `search_nodes "pdf-editor app-shell"`
- `search_memory_facts "pdf-editor app-shell problem"`
- `search_memory_facts "folio IPC contextIsolation"`

---

## Feature Anatomy

| Building Block | Needed | Why |
|---|---:|---|
| `index.ts` registration | Yes | Bookmarks panel and future modules register through shell APIs |
| Canvas mode | No | AppShell is layout/registry only |
| Command | Yes | Undo/redo command stack owned by shell |
| Sidebar panel | Yes | Tabbed left host; Bookmarks migrates here |
| Dialog | No | Not required for this feature |
| App core service | Yes | `AppShell` orchestration + history bridge |

---

## Data Model (Concrete Types)

```ts
import type { Result } from '@renderer/types/result'

export type ToolbarGroup = 'file' | 'navigation' | 'zoom' | 'history' | 'tools'

export interface ToolbarButtonDef {
  id: string
  group: ToolbarGroup
  order: number
  label: string
  icon: string
  shortcut?: string
  isDisabled?: () => boolean
  onClick: () => void | Promise<void>
}

export interface PanelDef {
  id: string
  title: string
  icon: string
  order: number
  render: () => React.JSX.Element
}

export interface ShortcutDef {
  id: string
  combo: string
  onTrigger: () => void | Promise<void>
}

export interface AppCommandContext {
  fileName: string | null
  currentPage: number
  pageCount: number
}

export interface AppCommand {
  id: string
  description: string
  execute: (context: AppCommandContext) => Promise<Result<void>>
  undo: (context: AppCommandContext) => Promise<Result<void>>
}

export interface HistorySnapshot {
  undoCount: number
  redoCount: number
  canUndo: boolean
  canRedo: boolean
}

export interface StatusBarSnapshot {
  fileName: string
  currentPage: number
  pageCount: number
}

export interface ShellSnapshot {
  toolbarButtons: ToolbarButtonDef[]
  panels: PanelDef[]
  activePanelId: string | null
  sidebarOpen: boolean
  history: HistorySnapshot
  status: StatusBarSnapshot
}
```

---

## File Structure

### Create

1. `src/renderer/src/types/appShell.ts`
2. `src/renderer/src/core/History.ts`
3. `src/renderer/src/core/AppShell.ts`
4. `src/renderer/src/store/historyStore.ts`
5. `src/renderer/src/store/shellStore.ts`
6. `src/renderer/src/components/app-shell/AppToolbar.tsx`
7. `src/renderer/src/components/app-shell/AppSidebar.tsx`
8. `src/renderer/src/components/app-shell/AppStatusBar.tsx`
9. `src/renderer/src/components/app-shell/AppShellFrame.tsx`
10. `src/renderer/src/features/bookmarks/index.ts`
11. `src/renderer/src/assets/app-shell.css`
12. `src/renderer/src/core/History.test.ts`
13. `src/renderer/src/core/AppShell.test.ts`

### Modify

1. `package.json` (add test script/deps if Vitest missing)
2. `src/renderer/src/App.tsx`
3. `src/renderer/src/hooks/usePdfViewer.ts`
4. `src/renderer/src/components/pdf-viewer/PdfViewerScreen.tsx`
5. `src/renderer/src/components/pdf-viewer/PdfToolbar.tsx` (split viewer actions out of shell chrome)
6. `src/renderer/src/components/pdf-viewer/PdfOutlineSidebar.tsx` (reuse as panel body)
7. `src/renderer/src/assets/main.css`
8. `src/renderer/src/assets/pdf-viewer.css`

---

## Implementation Steps

### Step 1: Add shell domain types

Create `src/renderer/src/types/appShell.ts` with all interfaces above.

Rules:

- No `any`
- Use `Result<T>` for fallible operations
- Keep IDs deterministic and unique

---

### Step 2: Implement history core

Create `src/renderer/src/core/History.ts`:

- Internal undo/redo stacks with max depth (default 50)
- `push(command, context)` executes command first, then stores on success
- `undo(context)` pops undo stack, runs `command.undo`, pushes to redo on success
- `redo(context)` pops redo stack, runs `command.execute`, pushes to undo on success
- Never throw; return `Result<void>`

Pseudo-shape:

```ts
class History {
  push(command, context): Promise<Result<void>>
  undo(context): Promise<Result<void>>
  redo(context): Promise<Result<void>>
  snapshot(): HistorySnapshot
  clear(): void
}
```

---

### Step 3: Implement AppShell core

Create `src/renderer/src/core/AppShell.ts`:

Responsibilities:

- Maintain registries for toolbar buttons, panels, and shortcuts
- Maintain active panel ID and sidebar open state
- Expose APIs:
  - `addToolbarButton(def)`
  - `addPanel(def)`
  - `addShortcut(def)`
  - `setSidebarOpen(open)`
  - `setActivePanel(id | null)`
  - `executeCommand(command)`
  - `undo()` / `redo()`
  - `getSnapshot()`
- Bridge to `History` for command execution
- Read status values from existing stores (`documentStore`, `editorStore`)

Constraints:

- Prevent duplicate registration by `id`
- Sort toolbar/panels by `group` + `order`
- Return `Result` errors for duplicate IDs or invalid panel activation

---

### Step 4: Add shell UI stores

Create:

- `src/renderer/src/store/historyStore.ts`
- `src/renderer/src/store/shellStore.ts`

Purpose:

- Keep reactive shell metadata for UI binding
- Store only state updates (no business logic)

Minimum shape:

- `historyStore`: `canUndo`, `canRedo`, `undoCount`, `redoCount`
- `shellStore`: `sidebarOpen`, `activePanelId`, `registeredPanelIds`

---

### Step 5: Build AppShell frame components

Create components in `src/renderer/src/components/app-shell/`:

1. `AppToolbar.tsx`
   - Group rendering: file, navigation, zoom, history, tools
   - Built-in undo/redo controls use shell `canUndo/canRedo`
2. `AppSidebar.tsx`
   - Left tab rail using panel icons
   - Active panel host area
   - Collapse/expand behavior
3. `AppStatusBar.tsx`
   - Show file name (`Untitled` fallback)
   - Show `Page X / Y`
4. `AppShellFrame.tsx`
   - Overall layout: toolbar top, content row middle, status bottom
   - Middle row must be `flex: 1; overflow: hidden`
   - Sidebar fixed width when open; viewer takes remaining width

---

### Step 6: Add shell stylesheet

Create `src/renderer/src/assets/app-shell.css`:

- Root: `display:flex; flex-direction:column; height:100vh`
- Toolbar: natural height, border-bottom
- Content row: `display:flex; flex:1; min-height:0; overflow:hidden`
- Sidebar: fixed width, `height:100%`, right border
- Main area: `flex:1; min-width:0; min-height:0`
- Status bar: natural height, border-top

Import in `src/renderer/src/assets/main.css`.

---

### Step 7: Refactor PDF viewer screen into shell content

Modify `src/renderer/src/components/pdf-viewer/PdfViewerScreen.tsx`:

- Remove shell chrome responsibilities (toolbar/sidebar/status bar)
- Keep viewer content responsibilities (viewport + empty state)
- Continue exposing page/navigation/zoom/search actions via hook

Goal: `PdfViewerScreen` becomes shell content, not full app frame.

---

### Step 8: Register Bookmarks as a panel contribution

Create `src/renderer/src/features/bookmarks/index.ts`:

- Export `registerBookmarksPanel(shell, bindings)`
- Register one panel with `id: 'bookmarks'`
- Panel body reuses `PdfOutlineSidebar` content component
- On bookmark click, call `jumpToOutlineItem(pageIndex)`

Acceptance mapping:

- Bookmarks are now hosted by AppShell panel registry

---

### Step 9: Wire AppShell in App.tsx

Modify `src/renderer/src/App.tsx`:

- Construct shell once (`useRef`)
- Create viewer bindings from `usePdfViewer()`
- Register toolbar buttons for:
  - Open
  - Prev/Next page
  - Zoom out/in
  - Fit Width / Fit Page
- Register Bookmarks panel
- Render:
  - `AppShellFrame` as root
  - `PdfViewerScreen` as center content

Prevent re-registering on every render (guard via `useRef` or `useMemo`).

---

### Step 10: Keyboard shortcuts + undo/redo plumbing

In shell frame/core:

- Register default shortcuts:
  - `Ctrl+Z` -> `shell.undo()`
  - `Ctrl+Y` -> `shell.redo()`
  - `Ctrl+Shift+Z` -> `shell.redo()`
- Ignore shortcut handling when focused on text inputs/textarea/contenteditable
- Sync history snapshot to toolbar disabled states

---

### Step 11: Tests

Add tests:

- `History.test.ts`
  - push success/failure behavior
  - max depth trimming
  - undo/redo order correctness
- `AppShell.test.ts`
  - duplicate registration rejection
  - panel activation behavior
  - shortcut resolution behavior

If test infrastructure is missing, add minimal Vitest config + script in `package.json`.

---

## Validation Gates

Run after each major step; do not continue while failing.

```bash
npm run typecheck 2>&1 | head -30
```

```bash
npm run lint 2>&1 | head -30
```

```bash
npm run build 2>&1 | tail -20
```

```bash
npx vitest run --reporter=verbose 2>&1 | tail -40
```

Manual smoke checks:

1. Launch app
2. Open a PDF
3. Confirm toolbar + sidebar + status bar layout
4. Toggle Bookmarks panel; select bookmark; page jumps
5. Verify status bar updates `Page X / Y`
6. Trigger undo/redo shortcuts and confirm UI state toggles

---

## Gotchas

1. **Duplicate registrations**: rerenders can re-add the same ID. Guard registration lifecycle.
2. **Shortcut collisions**: ignore when typing in inputs to avoid hijacking text editing.
3. **History stack correctness**: never push command when `execute` fails.
4. **Result discipline**: do not throw from `History`/`AppShell`; always return `Result`.
5. **Store boundaries**: no business logic in Zustand stores.
6. **Layout ownership**: viewer content should not render global shell chrome.
7. **Sidebar height bugs**: enforce full-height chain (`root -> shell -> content row -> sidebar`).
8. **Future extensibility**: keep toolbar/panel APIs generic for upcoming features.

---

## Quality Checklist

- [ ] No unresolved placeholders
- [ ] All paths are project-relative
- [ ] Data model uses concrete TypeScript types
- [ ] Undo/redo APIs return `Result<T>`
- [ ] Sidebar panel is registration-based
- [ ] Bookmarks migrated into panel host
- [ ] Validation gates are copy-paste runnable
- [ ] AppShell ownership separated from PDF viewer content
