/**
 * @file result.ts
 * @brief Shared Result type and helpers for renderer-side fallible operations.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })

export const err = <E = string>(error: E): Result<never, E> => ({ ok: false, error })
