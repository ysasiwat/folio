# Hard Constraints — Never Break These

## No `any` in TypeScript

```ts
// FORBIDDEN
function process(data: any) { }

// CORRECT — use unknown and narrow
function process(data: unknown) {
  if (typeof data === 'string') { /* safe */ }
}
```

Use `unknown` when the type is genuinely unknown. Use specific types whenever possible.

---

## Always Use Result<T> for Fallible Operations

Never throw from a Command or business logic function. Return a Result instead.

```ts
// FORBIDDEN — thrown errors are invisible in async code
async function splitPdf(bytes: Uint8Array): Promise<Uint8Array[]> {
  throw new Error('oops');
}

// CORRECT
async function splitPdf(bytes: Uint8Array): Promise<Result<Uint8Array[]>> {
  try {
    // ...
    return { ok: true, value: pages };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
```

Only use `try/catch` at the outermost boundary (IPC handlers, top-level React error boundaries).

---

## Never Call pdfjs-dist Outside PdfRenderer

```ts
// FORBIDDEN anywhere else
import * as pdfjs from 'pdfjs-dist';

// CORRECT — always through the wrapper
import { PdfRenderer } from '@core/PdfRenderer';
```

pdfjs-dist can only render. It cannot modify PDFs.

---

## Never Call pdf-lib Outside PdfDocument

```ts
// FORBIDDEN in feature modules
import { PDFDocument } from 'pdf-lib';

// CORRECT — always through the wrapper
import { PdfDocument } from '@core/PdfDocument';
```

---

## No File I/O in the Renderer Process

```ts
// FORBIDDEN — renderer has no Node.js access (contextIsolation: true)
import fs from 'fs';
fs.writeFileSync(path, data);

// CORRECT — call main process via the preload API
const result = await window.api.file.save({ path, bytes });
```

---

## Canvas Modes Never Do Coordinate Math

`CanvasManager` converts DOM coordinates to `PagePoint` before passing to a mode.
A mode only ever receives `PagePoint` (PDF space, Y-up, origin bottom-left).

```ts
// FORBIDDEN inside a CanvasMode
const pdfY = pageHeight - (e.clientY / scale);

// CORRECT — CanvasManager already did this; just use the PagePoint
onPointerDown(e: PointerEvent, point: PagePoint): void {
  // point.x and point.y are already in PDF space
  this.startPoint = point;
}
```

---

## Every Canvas Mode Must Handle `onDeactivate` Cleanly

When the user switches tools, `CanvasManager` calls `onDeactivate()`.
The mode must clean up any overlay state and pending operations.

```ts
onDeactivate(): void {
  this.isDrawing = false;
  this.pendingText = '';
  // If mid-action: either commit or discard — do NOT leave a half-done state
}
```

---

## Commands Must Be Fully Reversible

Every `Command` pushed to `History` must correctly implement `undo()`.
The simplest safe strategy: snapshot the full page bytes before `execute()` and restore in `undo()`.

```ts
// Safe undo pattern: snapshot before mutation
async execute(doc: PdfDocument): Promise<void> {
  this.snapshot = await doc.snapshotPage(this.pageIndex);
  const page = doc.getPage(this.pageIndex);
  await page.drawText(this.text, { x: this.x, y: this.y, size: this.fontSize });
}

async undo(doc: PdfDocument): Promise<void> {
  await doc.restorePageSnapshot(this.pageIndex, this.snapshot);
}
```

---

## IPC Channel Names Must Follow the Convention

```ts
// FORBIDDEN
ipcMain.handle('splitPDF', ...);
ipcMain.handle('SPLIT_PDF', ...);
ipcMain.handle('split_pdf', ...);

// CORRECT — lowercase domain:action
ipcMain.handle('pdf:split', ...);
```

All channels are declared with types in `src/preload/index.ts`.

---

## Signatures and User Data Must Not Enter Source Control

User signature images, preferences, and recent files are stored in
`app.getPath('userData')` only. These paths are OS-specific runtime paths.
Never hardcode them. Never commit them to git.

```ts
// CORRECT
import { app } from 'electron';
const sigDir = path.join(app.getPath('userData'), 'signatures');
```

---

## No Business Logic in the Zustand Store

Store actions only update state. All PDF processing happens in Commands or IPC handlers.

```ts
// FORBIDDEN — PDF logic in store
mergeFiles: async (paths) => {
  const merged = await PDFDocument.create(); // ← business logic in store
  set({ document: merged });
}

// CORRECT — store just holds state
// Call the command from a component, pass result to store
const result = await MergeCommand.execute(paths);
if (result.ok) store.setDocument(result.value);
```
