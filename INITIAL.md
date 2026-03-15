# INITIAL.md — PDF Editor Feature Request

Fill out this template to describe the feature you want to build.
Then say **"Generate a PRP for {feature-name}"** in Kilo Code.

---

## FEATURE NAME

`app-shell`

---

## WHAT THE USER CAN DO

The user sees a consistent application frame around the PDF viewer:
- A top toolbar with grouped sections: file actions (Open), navigation controls, zoom controls, and a right-side area reserved for future editing tools
- A left sidebar that can host multiple panels (currently Bookmarks) with tab icons to switch between them
- An undo/redo history system (Ctrl+Z / Ctrl+Y) that features can register commands into
- A status bar at the bottom showing current file name and page info

The AppShell is not a user-facing feature itself — it is the registration system that all future features (Insert Text, Signature, etc.) will plug into to add their toolbar buttons, sidebar panels, and commands.

---

## AUTHORS

Y. Sasiwat — Lead Developer

---

## DOES IT INTERACT WITH THE PDF CANVAS?

- [ ] No — it is a layout and registration framework, not a canvas interaction

---

## DOES IT MODIFY THE PDF DOCUMENT?

- [ ] No — it manages app state and UI structure only

---

## DOES IT NEED A SIDEBAR PANEL?

- [x] Yes — a sidebar that hosts multiple panels via tab icons on the left edge (like VS Code). Currently hosts the Bookmarks panel. Future features will add their own panels here.

---

## DOES IT NEED A DIALOG?

- [ ] No

---

## ACCEPTANCE CRITERIA

- AppShell renders a stable layout: toolbar (top) + sidebar (left, collapsible) + canvas area (center) + status bar (bottom)
- Features can register toolbar buttons via `shell.addToolbarButton()`
- Features can register sidebar panels via `shell.addPanel()`
- Features can register commands (undo/redo) via `shell.executeCommand()`
- Ctrl+Z undoes the last command, Ctrl+Y / Ctrl+Shift+Z redoes
- Undo/redo buttons in toolbar reflect available history (disabled when nothing to undo/redo)
- Bookmarks panel from pdf-viewer is migrated into the AppShell sidebar
- Status bar shows current filename and "Page X / Y"

---

## SIMILAR EXISTING FEATURE

The existing pdf-viewer layout (toolbar + bookmarks panel + canvas) is the starting point — AppShell formalises and replaces it with a proper registration-based system.

---

## EXTERNAL DOCS / APIS TO CONSULT

- Zustand `history-store.ts` — command history stack
- `src/renderer/src/core/AppShell.ts` — to be created
- React Context for providing shell instance to all features

---

## OTHER NOTES

- AppShell must be created before any editing features (Insert Text, Signature, etc.) are built
- Keep AppShell's own UI minimal — its job is registration and layout, not features
- The Command interface: `{ execute(doc): void, undo(doc): void, description: string }`
- History store should have a max stack size (e.g. 50 commands)
