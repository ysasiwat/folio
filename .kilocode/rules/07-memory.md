# Memory Rules (Graphiti MCP)

MCP server: `graphiti-memory`
Available tools: `add_memory`, `search_nodes`, `search_memory_facts`, `get_episodes`, `get_status`

---

## Search Rules

### Before Starting Any Task

```
search_nodes "pdf-editor {feature-name}"
search_memory_facts "pdf-editor {feature-name} problem"
```

### Before Modifying a Specific File or Module

```
search_nodes "pdf-editor {module-name}"
search_memory_facts "pdf-editor {module-name} failure"
```

### On Any Unexpected Error

Run before attempting a fix:
```
search_memory_facts "pdf-editor {error-keyword}"
```

Use the most specific keyword (function name, TS error code, IPC channel name).

---

## Save Rules

| Event | Save |
|-------|------|
| Build FAIL | `add_memory "folio/{feature}: build FAIL — {summary}"` |
| Test FAIL | `add_memory "folio/{feature}: test '{name}' FAIL — {summary}"` |
| Build PASS after FAIL | `add_memory "folio/{feature}: FIXED — {what changed}"` |
| Design decision | `add_memory "folio/{feature}: decision — {decision} — reason: {reason}"` |
| pdf-lib or pdfjs bug workaround | `add_memory "folio workaround: {bug} — fix: {workaround}"` |
| [OPEN] problem noted | `add_memory "folio/{feature} [OPEN]: {symptom} — context: {context}"` |
| [SOLVED] problem resolved | `add_memory "folio/{feature} [SOLVED]: root cause: {cause} — fix: {fix}"` |

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

---

## Principles

- Search before writing — never skip because "it probably won't matter"
- Search immediately on any unexpected error — before writing a fix
- Save fixes as well as failures — a "FIXED" save is as valuable as a "FAIL" save
- Keep saves factual and brief (1–2 sentences)
