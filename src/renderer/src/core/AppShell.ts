/**
 * @file AppShell.ts
 * @brief Registration and orchestration core for toolbar, sidebar panels, shortcuts, and history.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { History } from '@renderer/core/History'
import {
  type AppCommand,
  type AppCommandContext,
  type PanelDef,
  type ShellSnapshot,
  type ShellViewBindings,
  type ShortcutDef,
  type ToolbarItemDef
} from '@renderer/types/appShell'
import { err, ok, type Result } from '@renderer/types/result'

const DEFAULT_FILE_NAME = 'Untitled'
const DEFAULT_SIDEBAR_OPEN = false
const TAB_GROUP_ORDER: string[] = [
  'file',
  'navigation',
  'zoom',
  'search',
  'tools',
  'text',
  'page',
  'utilities',
  'history'
]

export class AppShell {
  private readonly history: History

  private readonly toolbarItems = new Map<string, ToolbarItemDef>()

  private readonly panels = new Map<string, PanelDef>()

  private readonly shortcuts = new Map<string, ShortcutDef>()

  private readonly viewBindings: ShellViewBindings

  private sidebarOpen = DEFAULT_SIDEBAR_OPEN

  private activePanelId: string | null = null

  public constructor(viewBindings: ShellViewBindings, history = new History()) {
    this.viewBindings = viewBindings
    this.history = history
  }

  public addToolbarItem(definition: ToolbarItemDef): Result<void> {
    if (this.toolbarItems.has(definition.id)) {
      return err(`Toolbar item already exists: ${definition.id}`)
    }

    this.toolbarItems.set(definition.id, definition)
    return ok(undefined)
  }

  public addPanel(definition: PanelDef): Result<void> {
    if (this.panels.has(definition.id)) {
      return err(`Panel already exists: ${definition.id}`)
    }

    this.panels.set(definition.id, definition)

    if (this.activePanelId === null) {
      this.activePanelId = definition.id
    }

    return ok(undefined)
  }

  public addShortcut(definition: ShortcutDef): Result<void> {
    if (this.shortcuts.has(definition.id)) {
      return err(`Shortcut already exists: ${definition.id}`)
    }

    this.shortcuts.set(definition.id, definition)
    return ok(undefined)
  }

  public setSidebarOpen(open: boolean): void {
    this.sidebarOpen = open
  }

  public setActivePanel(panelId: string | null): Result<void> {
    if (panelId === null) {
      this.activePanelId = null
      return ok(undefined)
    }

    if (!this.panels.has(panelId)) {
      return err(`Panel not found: ${panelId}`)
    }

    this.activePanelId = panelId
    return ok(undefined)
  }

  public getShortcutByCombo(combo: string): ShortcutDef | null {
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.combo === combo) {
        return shortcut
      }
    }

    return null
  }

  public async executeCommand(command: AppCommand): Promise<Result<void>> {
    return this.history.push(command, this.getCommandContext())
  }

  public async undo(): Promise<Result<void>> {
    return this.history.undo(this.getCommandContext())
  }

  public async redo(): Promise<Result<void>> {
    return this.history.redo(this.getCommandContext())
  }

  public getSnapshot(): ShellSnapshot {
    const toolbarItems = Array.from(this.toolbarItems.values()).sort((left, right) => {
      if (left.group !== right.group) {
        const leftIndex = TAB_GROUP_ORDER.indexOf(left.group)
        const rightIndex = TAB_GROUP_ORDER.indexOf(right.group)

        if (leftIndex === -1 && rightIndex === -1) {
          return left.group.localeCompare(right.group)
        }

        if (leftIndex === -1) {
          return 1
        }

        if (rightIndex === -1) {
          return -1
        }

        return leftIndex - rightIndex
      }

      return left.order - right.order
    })

    const panels = Array.from(this.panels.values()).sort((left, right) => left.order - right.order)

    return {
      toolbarItems,
      panels,
      activePanelId: this.activePanelId,
      sidebarOpen: this.sidebarOpen,
      history: this.history.snapshot(),
      status: {
        fileName: this.viewBindings.getFileName() ?? DEFAULT_FILE_NAME,
        currentPage: this.viewBindings.getCurrentPage(),
        pageCount: this.viewBindings.getPageCount()
      }
    }
  }

  public clearHistory(): void {
    this.history.clear()
  }

  private getCommandContext(): AppCommandContext {
    return {
      fileName: this.viewBindings.getFileName(),
      currentPage: this.viewBindings.getCurrentPage(),
      pageCount: this.viewBindings.getPageCount()
    }
  }
}
