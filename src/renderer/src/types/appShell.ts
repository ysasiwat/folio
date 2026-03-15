/**
 * @file appShell.ts
 * @brief Type definitions for AppShell registrations, history, and snapshot state.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { JSX, RefObject } from 'react'
import type { PointerEvent } from 'react'
import type { PdfDocumentApi } from '@renderer/core/PdfDocument'
import type { PdfOutlineItem } from '@renderer/types/pdfViewer'
import type { PdfOverlayPoint } from '@renderer/types/pdfViewer'
import type { Result } from '@renderer/types/result'

export type ToolbarGroup = 'file' | 'navigation' | 'zoom' | 'search' | 'history' | 'tools' | 'text'

export interface ToolbarItemDef {
  id: string
  group: ToolbarGroup
  order: number
  render: () => JSX.Element
}

export interface PanelDef {
  id: string
  title: string
  icon: string
  order: number
  render: () => JSX.Element
}

export interface ShortcutDef {
  id: string
  combo: string
  onTrigger: () => void | Promise<void>
}

export interface AppCommandContext {
  fileName: string | null
  currentPage: number
  pageCount: number
}

export interface AppCommand {
  id: string
  description: string
  execute: (context: AppCommandContext) => Promise<Result<void>>
  undo: (context: AppCommandContext) => Promise<Result<void>>
}

export interface HistorySnapshot {
  undoCount: number
  redoCount: number
  canUndo: boolean
  canRedo: boolean
}

export interface StatusBarSnapshot {
  fileName: string
  currentPage: number
  pageCount: number
}

export interface ShellSnapshot {
  toolbarItems: ToolbarItemDef[]
  panels: PanelDef[]
  activePanelId: string | null
  sidebarOpen: boolean
  history: HistorySnapshot
  status: StatusBarSnapshot
}

export interface ViewerBindings {
  hasDocument: boolean
  isLoading: boolean
  loadError: string | null
  openFile: () => Promise<void>
  canZoomIn: boolean
  canZoomOut: boolean
  canGoToPreviousPage: boolean
  canGoToNextPage: boolean
  canGoToPreviousMatch: boolean
  canGoToNextMatch: boolean
  goToPreviousPage: () => void
  goToNextPage: () => void
  jumpToPage: (pageNumber: number) => void
  setSearchQuery: (query: string) => void
  goToPreviousMatch: () => void
  goToNextMatch: () => void
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => Promise<void>
  fitPage: () => Promise<void>
  searchQuery: string
  matchCount: number
  activeMatchNumber: number
  currentPage: number
  scale: number
  canvasContainerRef: RefObject<HTMLDivElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  documentApi: PdfDocumentApi
  applyDocumentBytes: (nextBytes: Uint8Array) => Promise<Result<void>>
  resolveOverlayPoint: (event: PointerEvent<HTMLDivElement>) => PdfOverlayPoint | null
  handleScroll: () => void
  handleWheel: (event: import('react').WheelEvent<HTMLDivElement>) => void
  outlineItems: PdfOutlineItem[]
  jumpToOutlineItem: (pageIndex: number | null) => void
}

export interface ShellViewBindings {
  getFileName: () => string | null
  getCurrentPage: () => number
  getPageCount: () => number
}
