# Memory Rules (Graphiti MCP)

MCP server: `graphiti-memory`
Available tools: `add_memory`, `search_nodes`, `search_memory_facts`, `get_episodes`, `get_status`

---

## Search Rules

### Before Starting Any Task

```
search_nodes "folio {feature-name}"
search_memory_facts "folio {feature-name} problem"
```

### Before Modifying a Specific File or Module

```
search_nodes "folio {module-name}"
search_memory_facts "folio {module-name} failure"
```

### On Any Unexpected Error

Run before attempting a fix:
```
search_memory_facts "folio {error-keyword}"
```

Use the most specific keyword (function name, TS error code, IPC channel name).

---

## Save Rules

Save memories at these events — not just failures, but progress and decisions too.

### Build & Test Outcomes

| Event | Save |
|-------|------|
| Build FAIL | `add_memory "folio/{feature}: build FAIL — {summary}"` |
| Test FAIL | `add_memory "folio/{feature}: test '{name}' FAIL — {summary}"` |
| Build PASS after FAIL | `add_memory "folio/{feature}: FIXED — {what changed}"` |
| All gates PASS | `add_memory "folio/{feature}: implemented and validated — {brief summary of what was built}"` |

### Design & Architecture Decisions

| Event | Save |
|-------|------|
| Architecture decision made | `add_memory "folio/{feature}: decision — {decision} — reason: {reason}"` |
| Pattern chosen over an alternative | `add_memory "folio/{feature}: chose {pattern} over {alternative} — reason: {reason}"` |
| Library or API chosen | `add_memory "folio/{feature}: using {library/API} for {purpose} — reason: {reason}"` |
| Constraint discovered | `add_memory "folio/{feature}: constraint — {what is not possible or allowed} — reason: {reason}"` |

### Workarounds & Known Issues

| Event | Save |
|-------|------|
| pdf-lib or pdfjs bug workaround | `add_memory "folio workaround: {bug} — fix: {workaround}"` |
| [OPEN] problem noted | `add_memory "folio/{feature} [OPEN]: {symptom} — context: {context}"` |
| [SOLVED] problem resolved | `add_memory "folio/{feature} [SOLVED]: root cause: {cause} — fix: {fix}"` |

### Feature Completion

When a feature is fully implemented and all gates pass, save a completion summary:

```
add_memory "folio/{feature} [COMPLETE]: {what the feature does} — building blocks: {list} — key files: {list} — notable decisions: {summary}"
```

Example:
```
add_memory "folio/pdf-viewer [COMPLETE]: renders PDF pages with pdfjs-dist, open via IPC file:open, zoom/scroll/search in toolbar — building blocks: PdfRenderer, documentStore, editorStore, usePdfViewer hook — notable decisions: pdfjs-dist@4.10.38 required (v5 incompatible with Electron 39 Chromium)"
```

---

## High-Value Pre-Searches for Common PDF Editor Problems

Before working on canvas coordinate code:
```
search_memory_facts "folio PagePoint coordinate"
search_memory_facts "folio pdfjs viewport Y-flip"
```

Before working on pdf-lib page mutations:
```
search_memory_facts "folio pdf-lib page snapshot"
search_memory_facts "folio pdf-lib undo"
```

Before working on IPC:
```
search_memory_facts "folio IPC contextIsolation"
search_memory_facts "folio IPC Uint8Array serialization"
```

Before working on signature PNG embedding:
```
search_memory_facts "folio signature PNG embed transparent"
```

Before starting a new feature:
```
search_nodes "folio [COMPLETE]"
search_nodes "folio decision"
```

---

## Principles

- Search before writing — never skip because "it probably won't matter"
- Search immediately on any unexpected error — before writing a fix
- Save progress, not just failures — a completion summary helps future sessions understand what exists
- Save the "why" behind decisions — future sessions need context, not just outcomes
- Save fixes as well as failures — a "FIXED" save is as valuable as a "FAIL" save
- Keep saves factual and brief (1–2 sentences max per save)
- Never save sensitive data (file paths with usernames, API keys, personal data)
