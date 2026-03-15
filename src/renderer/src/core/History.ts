/**
 * @file History.ts
 * @brief Command history stack with undo/redo operations for AppShell actions.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { AppCommand, AppCommandContext, HistorySnapshot } from '@renderer/types/appShell'
import { err, ok, type Result } from '@renderer/types/result'

const DEFAULT_MAX_HISTORY_DEPTH = 50

interface HistoryStackEntry {
  command: AppCommand
}

export class History {
  private readonly maxDepth: number

  private undoStack: HistoryStackEntry[] = []

  private redoStack: HistoryStackEntry[] = []

  public constructor(maxDepth = DEFAULT_MAX_HISTORY_DEPTH) {
    this.maxDepth = maxDepth > 0 ? Math.floor(maxDepth) : DEFAULT_MAX_HISTORY_DEPTH
  }

  public async push(command: AppCommand, context: AppCommandContext): Promise<Result<void>> {
    const executeResult = await command.execute(context)
    if (!executeResult.ok) {
      return err(executeResult.error)
    }

    this.undoStack.push({ command })
    this.redoStack = []

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack = this.undoStack.slice(this.undoStack.length - this.maxDepth)
    }

    return ok(undefined)
  }

  public async undo(context: AppCommandContext): Promise<Result<void>> {
    const latest = this.undoStack[this.undoStack.length - 1]
    if (!latest) {
      return err('Nothing to undo')
    }

    const undoResult = await latest.command.undo(context)
    if (!undoResult.ok) {
      return err(undoResult.error)
    }

    this.undoStack.pop()
    this.redoStack.push(latest)
    return ok(undefined)
  }

  public async redo(context: AppCommandContext): Promise<Result<void>> {
    const latest = this.redoStack[this.redoStack.length - 1]
    if (!latest) {
      return err('Nothing to redo')
    }

    const executeResult = await latest.command.execute(context)
    if (!executeResult.ok) {
      return err(executeResult.error)
    }

    this.redoStack.pop()
    this.undoStack.push(latest)

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack = this.undoStack.slice(this.undoStack.length - this.maxDepth)
    }

    return ok(undefined)
  }

  public snapshot(): HistorySnapshot {
    const undoCount = this.undoStack.length
    const redoCount = this.redoStack.length

    return {
      undoCount,
      redoCount,
      canUndo: undoCount > 0,
      canRedo: redoCount > 0
    }
  }

  public clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
