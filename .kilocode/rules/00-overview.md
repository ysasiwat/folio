# PDF Editor — Project Overview

A **local-first** cross-platform PDF editor desktop application built with Electron + TypeScript + React.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Electron 33+ |
| Language | TypeScript 5 (strict mode) |
| UI | React 19 |
| Build | electron-vite |
| PDF rendering | pdfjs-dist |
| PDF manipulation | pdf-lib |
| State | Zustand |
| UI components | Tailwind CSS + shadcn/ui |
| Tests | Vitest (unit), Playwright (E2E) |
| Local storage | File system JSON in app.getPath('userData') |

## Two Processes

Electron has two JS runtimes. Know which one you're in:

| Process | What runs there | Access to |
|---------|----------------|-----------|
| **Main** | `src/main/` | File system, Node.js, OS dialogs, heavy PDF processing |
| **Renderer** | `src/renderer/` | React UI, PDF canvas, user interaction |
| **Preload** | `src/preload/index.ts` | Bridge — exposes typed API from main to renderer |

Communication between main ↔ renderer is via **IPC only** (not direct function calls).

## Core Subsystems (renderer)

| Subsystem | File | Purpose |
|-----------|------|---------|
| PDF Renderer | `core/PdfRenderer.ts` | Wraps pdfjs-dist. Renders pages to `<canvas>`. Read-only. |
| PDF Document | `core/PdfDocument.ts` | Wraps pdf-lib. All document mutations go through here. |
| History | `core/History.ts` | Undo/redo command stack. |
| Canvas Manager | `core/CanvasManager.ts` | Manages pointer events, active canvas mode, overlays. |
| App Shell | `core/AppShell.ts` | Registers features: toolbar buttons, shortcuts, panels, menus. |

## Feature Modules

All user features live in `src/renderer/features/{feature-name}/`.
Each feature folder has an `index.ts` that registers itself with the App Shell.
Features can contain: canvas mode, commands, panels, dialogs — whatever they need.

See `02-architecture.md` for the full feature module design.

## Terminology

| Term | Meaning |
|------|---------|
| **Feature** | A user capability (e.g. "text-insert", "signature", "split") |
| **Canvas Mode** | A pointer-based interaction mode active on the PDF canvas (e.g. draw signature) |
| **Command** | An undoable/redoable document operation (e.g. insert text, add page) |
| **Panel** | A React sidebar component (e.g. Signature Manager, Page Thumbnails) |
| **Dialog** | A React modal for one-shot input (e.g. Split config, Symbol picker) |
| **App Shell** | The main window chrome: toolbar, sidebar container, menu bar |
| **IPC** | Inter-process communication between main and renderer |

## Read Before Starting Any Task

1. Fill `INITIAL.md` — describe the feature
2. Read `examples/feature/Feature_pattern.md` — see how a complete feature is structured
3. Read `PRPs/templates/prp_feature.md` — the PRP template
4. Say: "Generate a PRP for {feature-name}"
