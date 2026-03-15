# Feature Module Architecture

## Core Principle

Every user-facing capability is a **self-contained feature folder**.
Features are organized by what the user can **do**, not by technical abstraction.

```
src/renderer/features/
├── text-insert/          ← "Insert text on the PDF"
├── symbol-insert/        ← "Insert a symbol/character"
├── signature/            ← "Draw, save, and place signatures"
├── page-insert/          ← "Insert a blank page"
├── split/                ← "Split a PDF into parts"
├── merge/                ← "Combine multiple PDFs"
└── highlight/            ← "Highlight text"
```

---

## What a Feature Can Contain

A feature is any combination of these building blocks. Include only what the feature needs.

### 1. `index.ts` — Feature Registration (always required)

Every feature must export a registration function that the App Shell calls at startup.

```ts
// src/renderer/features/text-insert/index.ts
import type { AppShell } from '@core/AppShell';
import { TextInsertMode } from './text-insert-mode';
import { TextInsertCommand } from './text-insert-command';

export function registerTextInsert(shell: AppShell): void {
  shell.addToolbarButton({
    id: 'text-insert',
    label: 'Text',
    icon: 'type',
    shortcut: 'T',
    onClick: () => shell.activateCanvasMode(new TextInsertMode()),
  });
}
```

### 2. `{name}-command.ts` — Document Operation

A **Command** is an undoable action that modifies the PDF document.
It stores enough state to both execute and undo the change.

```ts
export interface Command {
  readonly description: string;
  execute(doc: PdfDocument): Promise<void>;
  undo(doc: PdfDocument): Promise<void>;
}
```

- Commands are pushed to `History` via `History.push(command)`.
- `History.push()` calls `execute()` immediately.
- Undo calls `undo()` on the most recent command.

### 3. `{name}-mode.ts` — Canvas Interaction Mode

A **Canvas Mode** is active when the user is interacting with the PDF canvas (clicking, dragging).
Only one mode is active at a time.

```ts
export interface CanvasMode {
  readonly id: string;
  onActivate(ctx: ModeContext): void;
  onDeactivate(): void;
  onPointerDown(e: PointerEvent, point: PagePoint): void;
  onPointerMove(e: PointerEvent, point: PagePoint): void;
  onPointerUp(e: PointerEvent, point: PagePoint): void;
  onKeyDown(e: KeyboardEvent): void;
  renderOverlay(): React.ReactNode;   // live preview overlay on canvas
}
```

- `PagePoint` is already in PDF coordinate space (Y-up, origin bottom-left).
  `CanvasManager` does the conversion before calling the mode — the mode never does math.
- `renderOverlay()` returns a React node rendered on top of the canvas.

### 4. `{name}-panel.tsx` — Sidebar Panel

A **Panel** is a React component rendered in the sidebar.

```ts
export interface PanelDef {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType;
}
```

Panels are registered with `shell.addPanel(panelDef)`.

### 5. `{name}-dialog.tsx` — Modal Dialog

A **Dialog** is a modal for user input. Use shadcn `Dialog` component.
Dialogs are opened programmatically by commands or toolbar buttons.

---

## Example: Signature Feature (combines all building blocks)

```
src/renderer/features/signature/
├── index.ts                     ← registers toolbar button, panel, shortcuts
├── signature-mode.ts            ← canvas mode: place saved signature on page
├── signature-draw-modal.tsx     ← dialog: draw a new signature on a canvas
├── signature-panel.tsx          ← sidebar: list of saved signatures
├── signature-command.ts         ← command: embed signature image into PDF
├── signature-store.ts           ← Zustand slice: list of saved signature images
└── signature.test.ts            ← tests for mode and command
```

## Example: Split Feature (no canvas, just a dialog + command)

```
src/renderer/features/split/
├── index.ts                     ← registers menu item "Split PDF…"
├── split-dialog.tsx             ← dialog: choose split options (page range, every N pages)
├── split-command.ts             ← command: calls main process via IPC to split
└── split.test.ts
```

## Example: Text Insert Feature (canvas mode + command, no panel)

```
src/renderer/features/text-insert/
├── index.ts                     ← registers toolbar button + shortcut T
├── text-insert-mode.ts          ← canvas mode: click to place, type text
├── text-insert-options.tsx      ← toolbar options strip (font, size, colour)
├── text-insert-command.ts       ← command: drawText on PDF page
└── text-insert.test.ts
```

---

## App Shell Registration

`src/renderer/core/AppShell.ts` is where all features connect to the UI.
Each feature's `index.ts` calls methods on `AppShell`:

```ts
shell.addToolbarButton(def)   // adds button to main toolbar
shell.addMenuAction(def)      // adds item to File/Edit/Tools menu
shell.addPanel(def)           // adds panel to sidebar
shell.addShortcut(def)        // registers keyboard shortcut
shell.activateCanvasMode(mode) // switches active canvas mode
```

The startup sequence in `src/renderer/main.tsx`:
```ts
const shell = new AppShell();
registerTextInsert(shell);
registerSymbolInsert(shell);
registerSignature(shell);
registerPageInsert(shell);
registerSplit(shell);
registerMerge(shell);
registerHighlight(shell);
shell.mount();
```

---

## Core Subsystem: PdfRenderer (read-only)

```
pdfjs-dist  →  PdfRenderer.ts
```

- Renders PDF pages to `<canvas>` elements
- Provides viewport transform for coordinate conversion
- **Never call pdfjs-dist directly** outside `PdfRenderer.ts`
- pdfjs-dist **cannot write** to PDFs — it is rendering only

## Core Subsystem: PdfDocument (read + write)

```
pdf-lib  →  PdfDocument.ts
```

- All mutations to the PDF (add text, embed image, insert/remove pages) go through here
- **Never call pdf-lib directly** outside `PdfDocument.ts`
- `PdfDocument` is passed to every `Command.execute()` and `Command.undo()`

## Core Subsystem: CanvasManager

- Holds the currently active `CanvasMode`
- Converts DOM pointer event coordinates to `PagePoint` (PDF space) before calling the mode
- Renders the active mode's overlay on the canvas
- Switches modes when `shell.activateCanvasMode()` is called (calls `onDeactivate` on old, `onActivate` on new)

## Core Subsystem: History

```ts
class History {
  push(command: Command): Promise<void>;  // executes and adds to stack
  undo(): Promise<void>;
  redo(): Promise<void>;
  clear(): void;
}
```

Max stack depth: 50 (configurable in preferences).

---

## Process Split: What Goes Where

| Operation | Process | Reason |
|-----------|---------|--------|
| PDF rendering | Renderer | pdfjs-dist runs in browser context |
| Canvas interaction | Renderer | Pointer events are renderer-side |
| Insert text/symbol/signature (small) | Renderer | pdf-lib runs fine in renderer |
| Split PDF (large file I/O) | **Main** via IPC | File system access + avoid blocking UI |
| Merge PDFs (large file I/O) | **Main** via IPC | Same reason |
| Open/Save file dialog | **Main** via IPC | OS dialog requires main process |
| Store signatures to disk | **Main** via IPC | File system access |
| Read/write preferences | **Main** via IPC | File system access |

---

## IPC Channel Convention

All IPC channels follow `{domain}:{action}` in lowercase:

```
file:open
file:save
file:save-as
pdf:split
pdf:merge
signature:list
signature:save
signature:delete
prefs:get
prefs:set
```

Defined with types in `src/preload/index.ts`. Never use raw strings in the renderer.

---

## Coordinate Systems

| Space | Origin | Y direction |
|-------|--------|-------------|
| DOM / Canvas | Top-left | Down ↓ |
| PDF | Bottom-left | Up ↑ |

`CanvasManager` converts DOM → PDF before calling `CanvasMode.onPointerDown/Move/Up`.
**Canvas modes receive `PagePoint` already in PDF space. They never do coordinate math.**

```ts
interface PagePoint {
  pageIndex: number;
  x: number;   // PDF space, origin bottom-left, in PDF points
  y: number;
}
```
