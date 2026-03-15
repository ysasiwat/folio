# INITIAL.md — PDF Editor Feature Request

Fill out this template to describe the feature you want to build.
Then say **"Generate a PRP for {feature-name}"** in Kilo Code.

---

## FEATURE NAME

`text-insert`

---

## WHAT THE USER CAN DO

The user clicks a "Insert Text" button in the toolbar to activate text insertion mode.
The cursor changes to a text cursor. The user clicks anywhere on the PDF page and a text
input box appears at that position. The user types their text, chooses font, size, and color
from the toolbar options. When they click elsewhere or press Escape, the text is permanently
embedded into the PDF at that position. The user can undo the insertion with Ctrl+Z.

---

## AUTHORS

Y. Sasiwat — Lead Developer

---

## DOES IT INTERACT WITH THE PDF CANVAS?

- [x] Yes — user clicks on the PDF canvas to place the text cursor, then types

---

## DOES IT MODIFY THE PDF DOCUMENT?

- [x] Yes — embeds the typed text into the PDF using pdf-lib at the clicked position

---

## DOES IT NEED A SIDEBAR PANEL?

- [ ] No

---

## DOES IT NEED A DIALOG?

- [ ] No — font, size, and color options appear inline in the toolbar when text insertion mode is active

---

## ACCEPTANCE CRITERIA

- A "Insert Text" button appears in the toolbar
- Clicking it activates text insertion canvas mode (cursor changes)
- User clicks on the PDF page — a text input box appears at that exact position
- User can type text and see it rendered live as an overlay on the canvas
- Toolbar shows font family selector, font size input, and color picker while mode is active
- Pressing Enter or clicking elsewhere confirms and embeds the text into the PDF via pdf-lib
- Pressing Escape cancels without modifying the PDF
- Undo (Ctrl+Z) removes the inserted text and restores the previous PDF state
- Redo (Ctrl+Y) re-applies the insertion
- Works correctly on both portrait and landscape pages
- Unit tests cover: text placement, PDF write, undo/redo

---

## SIMILAR EXISTING FEATURE

None yet — this is the first editing feature. Refer to `PRPs/examples/EXAMPLE_text_insert_prp.md` in the context kit for a reference implementation.

---

## EXTERNAL DOCS / APIS TO CONSULT

- `pdf-lib` — `page.drawText()`, `PDFFont`, `rgb()` color helper
- `pdfjs-dist` — viewport transform for converting DOM click coordinates to PDF page coordinates
- AppShell — `shell.addToolbarButton()`, `shell.registerMode()`, `shell.executeCommand()`
- CanvasMode interface — `onPointerDown`, `onPointerMove`, `onPointerUp`, `renderOverlay`
- Command interface — `execute(doc)`, `undo(doc)`, `description`

---

## OTHER NOTES

- Text position must be converted from DOM/canvas coordinates (top-left origin, Y-down) to PDF coordinates (bottom-left origin, Y-up) — this conversion happens in CanvasManager, the mode receives PagePoint already converted
- The command must snapshot the full PDF document bytes before embedding text so undo can restore the exact previous state
- Use standard PDF fonts first (Helvetica, Times-Roman, Courier) to avoid font embedding complexity in v1
- Font size default: 12pt
- Color default: black
