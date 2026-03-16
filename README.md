# Folio

Folio is a local-first desktop PDF editor built with Electron, React, and TypeScript.

## Highlights

- Ribbon-style editor layout with tabbed tools (Home, Edit, Page, Tools)
- Canvas-based PDF viewing and interaction
- Text insertion workflow with inline editor and undo/redo integration
- Sidebar panels for bookmarks and page tools
- Cross-platform desktop packaging (Windows, macOS, Linux)

## Technology Stack

| Layer | Technology |
| --- | --- |
| Desktop runtime | Electron |
| UI | React |
| Language | TypeScript (strict) |
| Build tooling | electron-vite, Vite |
| PDF rendering | pdfjs-dist |
| PDF editing | pdf-lib |
| State | Zustand |
| Linting/formatting | ESLint, Prettier |
| Testing | Vitest |

## Getting Started

### Prerequisites

- Node.js 22+ recommended
- npm 9+

### Install dependencies

```bash
npm install
```

## Development Workflow

### Run in development

```bash
npm run dev
```

### Type checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Unit tests

```bash
npm run test
```

### Full validation

```bash
npm run validate
```

## Build

```bash
npm run build
```

### Package binaries

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Project Structure

```text
src/
  main/       # Electron main process (app lifecycle, IPC)
  preload/    # Secure bridge between main and renderer
  renderer/   # React UI and PDF interaction logic
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Support

If Folio helps your workflow, support development:

- [buymeacoffee.com/ysasiwat](https://buymeacoffee.com/ysasiwat)
