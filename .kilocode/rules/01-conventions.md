# TypeScript / React Code Conventions

Apply these rules when working on any `.ts` or `.tsx` file.

## Language

- TypeScript 5 strict mode (`"strict": true`). No `any` unless absolutely unavoidable — use `unknown` and narrow.
- React functional components only. No class components.
- No `var`. Use `const` by default; `let` only when the value changes.

## Naming

| Item | Convention | Example |
|------|-----------|---------|
| Files, classes, interfaces | `PascalCase` | `TextTool.ts`, `IPdfTool` |
| Functions, variables, hooks | `camelCase` | `activateTool()`, `useEditorStore` |
| Constants (module-level) | `UPPER_SNAKE_CASE` | `MAX_SIGNATURE_COUNT` |
| React component files | `PascalCase.tsx` | `SignaturePanel.tsx` |
| Store slices | `camelCase + Store` | `editorStore.ts` |
| Test files | `{Name}.test.ts` | `TextTool.test.ts` |

## Interfaces

Every Tool, Service, and Panel must implement a declared interface:

```ts
// Tools implement IPdfTool
interface IPdfTool {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  activate(context: ToolContext): void;
  deactivate(): void;
  onPointerDown(event: ToolPointerEvent): void;
  onPointerMove(event: ToolPointerEvent): void;
  onPointerUp(event: ToolPointerEvent): void;
  commit(doc: PdfDocument): Promise<void>;  // write to PDF
  dispose(): void;
}

// Services implement IPdfService
interface IPdfService<TInput, TOutput> {
  readonly id: string;
  execute(input: TInput): Promise<TOutput>;
}

// Panels implement IPdfPanel (React component interface)
interface IPdfPanel {
  readonly id: string;
  readonly title: string;
  render(): JSX.Element;
}
```

## Authors

The following people contribute to this project. Use their names exactly as listed when writing `@author` tags:

| Name | Email | Role |
|------|-------|------|
| Y. Sasiwat | y.sasiwat@gmail.com | Lead Developer |

When a file is created or significantly modified by multiple authors, list each on a separate `@author` line.

## File Header

Every `.ts` and `.tsx` file must start with a JSDoc block:

```ts
/**
 * @file {FileName}.ts
 * @brief {One-line description}
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */
```

For files with multiple authors:

```ts
/**
 * @file {FileName}.ts
 * @brief {One-line description}
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 * @author {Second Author Name} <{email}>
 */
```

## File Length

Keep files under 400 lines. Split by responsibility if larger.

## Error Handling

- All async functions must return `Promise<Result<T>>` using the project's `Result` type, not throw.
- Use the shared `Result<T, E>` type from `src/renderer/types/result.ts`:

```ts
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helpers
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = <E = string>(error: E): Result<never, E> => ({ ok: false, error });
```

- Never throw from a Service or Tool — return `err(...)` instead.
- Use `try/catch` only at the boundary (IPC handlers, file system calls).

## Imports

- Use absolute imports via path aliases defined in `tsconfig.json`:
  ```ts
  import { PdfDocument } from '@core/PdfDocument';
  import { useEditorStore } from '@store/editorStore';
  ```
- Never use relative `../../` imports going more than one level up.

## React Components

- Use named exports only. No default exports for components.
- Props interface must be co-located in the same file and named `{ComponentName}Props`.
- Use `React.memo` for panels and tool option components to prevent unnecessary re-renders.

## Zustand Store

- Each feature owns its own store slice in `src/renderer/store/`.
- Use `immer` middleware for nested state mutations.
- Never mutate store state directly outside of store actions.
