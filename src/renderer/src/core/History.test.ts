/**
 * @file History.test.ts
 * @brief Unit tests for History stack push/undo/redo behavior and max depth trimming.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { describe, expect, it, vi } from 'vitest'
import { History } from './History'
import type { AppCommand } from '../types/appShell'
import { err, ok } from '../types/result'

const createCommand = (
  id: string,
  executeImpl: AppCommand['execute'] = async () => ok(undefined),
  undoImpl: AppCommand['undo'] = async () => ok(undefined)
): AppCommand => ({
  id,
  description: id,
  execute: executeImpl,
  undo: undoImpl
})

describe('History', () => {
  it('push stores command only when execute succeeds', async () => {
    const history = new History(5)
    const context = { fileName: null, currentPage: 0, pageCount: 0 }

    const success = createCommand('success')
    const fail = createCommand('fail', async () => err('execute failed'))

    const okResult = await history.push(success, context)
    const failResult = await history.push(fail, context)

    expect(okResult.ok).toBe(true)
    expect(failResult.ok).toBe(false)

    const snapshot = history.snapshot()
    expect(snapshot.undoCount).toBe(1)
    expect(snapshot.redoCount).toBe(0)
  })

  it('undo and redo follow stack order', async () => {
    const history = new History(5)
    const context = { fileName: null, currentPage: 0, pageCount: 0 }

    const executeA = vi.fn(async () => ok(undefined))
    const undoA = vi.fn(async () => ok(undefined))
    const executeB = vi.fn(async () => ok(undefined))
    const undoB = vi.fn(async () => ok(undefined))

    await history.push(createCommand('a', executeA, undoA), context)
    await history.push(createCommand('b', executeB, undoB), context)

    const undoResult = await history.undo(context)
    expect(undoResult.ok).toBe(true)
    expect(undoB).toHaveBeenCalledTimes(1)

    const redoResult = await history.redo(context)
    expect(redoResult.ok).toBe(true)
    expect(executeB).toHaveBeenCalledTimes(2)
  })

  it('trims undo stack to max depth', async () => {
    const history = new History(2)
    const context = { fileName: null, currentPage: 0, pageCount: 0 }

    await history.push(createCommand('1'), context)
    await history.push(createCommand('2'), context)
    await history.push(createCommand('3'), context)

    const snapshot = history.snapshot()
    expect(snapshot.undoCount).toBe(2)
  })
})
