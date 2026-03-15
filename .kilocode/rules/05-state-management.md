# State Management

## Store Structure

Global state lives in `src/renderer/store/`. Each domain has its own Zustand slice.

```
store/
├── document-store.ts     ← current PDF document state
├── editor-store.ts       ← editor UI state (zoom, active page, active mode)
├── history-store.ts      ← undo/redo stack metadata (not the commands themselves)
└── prefs-store.ts        ← user preferences (persisted to disk)
```

Feature-specific state that isn't shared globally goes inside the feature folder:
```
features/signature/signature-store.ts   ← saved signatures list
```

---

## Global Store Shapes

### document-store.ts

```ts
interface DocumentState {
  filePath: string | null;        // path of the open file; null if new/unsaved
  fileName: string | null;
  bytes: Uint8Array | null;       // current document bytes (updated after each commit)
  pageCount: number;
  isModified: boolean;            // true if unsaved changes exist

  // Actions
  openDocument(path: string, bytes: Uint8Array, pageCount: number): void;
  updateBytes(bytes: Uint8Array): void;   // called after every Command.execute()
  markSaved(): void;
  closeDocument(): void;
}
```

### editor-store.ts

```ts
interface EditorState {
  currentPage: number;      // 0-based
  scale: number;            // zoom: 1.0 = 100%, 0.5 = 50%, 2.0 = 200%
  activeModeId: string | null;
  sidebarPanelId: string | null;
  sidebarOpen: boolean;

  // Actions
  setPage(page: number): void;
  setScale(scale: number): void;
  setActiveMode(id: string | null): void;
  setSidebarPanel(id: string | null): void;
}
```

### prefs-store.ts

```ts
interface PrefsState {
  defaultFont: string;        // e.g. 'Helvetica'
  defaultFontSize: number;    // e.g. 14
  defaultColor: string;       // e.g. '#000000'
  maxHistoryDepth: number;    // default 50
  recentFiles: string[];      // max 10 file paths

  // Actions (sync to disk on change)
  setDefaultFont(font: string): void;
  addRecentFile(path: string): void;
}
```

---

## Persistence

`prefs-store.ts` is persisted to `app.getPath('userData')/preferences.json` on every change.
Use `zustand/middleware` `persist` with a custom storage adapter that calls the IPC:

```ts
// prefs-store.ts uses persist middleware with IPC storage
const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'pdf-editor-prefs',
      storage: createIpcStorage(),   // custom: calls window.api.prefs.get/set
    }
  )
);
```

---

## Rules

### No business logic in store actions

Store actions only update state — they don't call pdf-lib, pdfjs, or IPC.

```ts
// FORBIDDEN in a store action
openDocument: async (path) => {
  const bytes = await fs.readFile(path);     // ← file I/O in store
  const doc = await PDFDocument.load(bytes); // ← pdf-lib in store
  set({ bytes, pageCount: doc.getPageCount() });
}

// CORRECT — file I/O happens in an IPC handler; store just holds the result
// In a component:
const result = await window.api.file.open();
if (result.ok) store.openDocument(result.value.path, result.value.bytes, result.value.pageCount);
```

### Zustand selector granularity

Subscribe only to the values you need. Never subscribe to the whole store object.

```ts
// WRONG — re-renders on any store change
const store = useEditorStore();
const page = store.currentPage;

// CORRECT — re-renders only when currentPage changes
const currentPage = useEditorStore((s) => s.currentPage);
```

### Canvas modes must not read Zustand during pointer events

Pointer events fire at 60fps. Reading Zustand during `onPointerDown/Move/Up` causes jank.
Cache what you need when the mode activates:

```ts
class TextInsertMode implements CanvasMode {
  private fontSize = 14;

  onActivate(ctx: ModeContext): void {
    // Cache from store at activation time
    this.fontSize = ctx.prefs.defaultFontSize;
  }

  onPointerDown(e: PointerEvent, point: PagePoint): void {
    // Use cached value — no store reads
    this.startWith(point, this.fontSize);
  }
}
```

---

## Zoom Scale Values

| Scale | Display |
|-------|---------|
| 0.25 | 25% (min) |
| 0.5 | 50% |
| 0.75 | 75% |
| 1.0 | 100% (fit page default) |
| 1.5 | 150% |
| 2.0 | 200% |
| 4.0 | 400% (max) |
