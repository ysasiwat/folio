/**
 * @file text-insert-store.ts
 * @brief Zustand state slice for text-insert mode activation, draft lifecycle, and text style options.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { create } from 'zustand'
import type { TextInsertStyle } from '@renderer/core/PdfDocument'

const DEFAULT_STYLE: TextInsertStyle = {
  fontFamily: 'Sarabun',
  fontSize: 12,
  colorHex: '#000000'
}

const MIN_FONT_SIZE = 1
const MAX_FONT_SIZE = 256

const clampFontSize = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_STYLE.fontSize
  }

  if (value < MIN_FONT_SIZE) {
    return MIN_FONT_SIZE
  }

  if (value > MAX_FONT_SIZE) {
    return MAX_FONT_SIZE
  }

  return Math.round(value)
}

const normalizeColorHex = (value: string): string => {
  const normalized = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return normalized.toLowerCase()
  }

  return DEFAULT_STYLE.colorHex
}

const cloneBytes = (value: Uint8Array | null): Uint8Array | null => {
  if (!value) {
    return null
  }

  return value.slice()
}

const cloneStyle = (style: TextInsertStyle): TextInsertStyle => ({
  ...style
})

const cloneCommittedItem = (item: TextInsertCommittedItem): TextInsertCommittedItem => ({
  ...item,
  style: cloneStyle(item.style)
})

const cloneCommittedItems = (items: TextInsertCommittedItem[]): TextInsertCommittedItem[] =>
  items.map(cloneCommittedItem)

export interface TextInsertCommittedItem {
  id: string
  pageIndex: number
  x: number
  y: number
  text: string
  style: TextInsertStyle
}

export interface TextInsertSessionSnapshot {
  anchorBytes: Uint8Array | null
  committedItems: TextInsertCommittedItem[]
  selectedItemId: string | null
  nextItemId: number
}

export interface TextInsertDraft {
  pageIndex: number
  x: number
  y: number
  overlayLeft: number
  overlayTop: number
  text: string
  style: TextInsertStyle
  sourceItemId: string | null
}

export interface TextInsertPoint {
  pageIndex: number
  x: number
  y: number
  overlayLeft: number
  overlayTop: number
}

export interface TextInsertModeState {
  isActive: boolean
  isEditing: boolean
  draft: TextInsertDraft | null
  style: TextInsertStyle
  committedItems: TextInsertCommittedItem[]
  selectedItemId: string | null
  anchorBytes: Uint8Array | null
  nextItemId: number
  moveTargetItemId: string | null
  activate: () => void
  deactivate: () => void
  beginDraft: (point: TextInsertPoint) => void
  beginDraftFromCommittedItem: (itemId: string, overlayLeft: number, overlayTop: number) => void
  updateDraftText: (text: string) => void
  confirmDraft: () => TextInsertDraft | null
  cancelDraft: () => void
  selectCommittedItem: (itemId: string | null) => void
  setFontFamily: (fontFamily: TextInsertStyle['fontFamily']) => void
  setFontSize: (fontSize: number) => void
  setColorHex: (colorHex: string) => void
  captureSessionSnapshot: () => TextInsertSessionSnapshot
  applySessionSnapshot: (snapshot: TextInsertSessionSnapshot) => void
  setAnchorBytes: (bytes: Uint8Array) => void
  clearAnchorBytes: () => void
  appendCommittedItem: (item: Omit<TextInsertCommittedItem, 'id'>) => TextInsertCommittedItem
  replaceCommittedItem: (
    itemId: string,
    patch: Partial<Omit<TextInsertCommittedItem, 'id'>>
  ) => void
  removeCommittedItem: (itemId: string) => void
  setMoveTargetItem: (itemId: string | null) => void
}

export const useTextInsertStore = create<TextInsertModeState>()((set, get) => ({
  isActive: false,
  isEditing: false,
  draft: null,
  style: DEFAULT_STYLE,
  committedItems: [],
  selectedItemId: null,
  anchorBytes: null,
  nextItemId: 1,
  moveTargetItemId: null,
  activate: () => {
    set({ isActive: true })
  },
  deactivate: () => {
    set({
      isActive: false,
      isEditing: false,
      draft: null,
      selectedItemId: null,
      moveTargetItemId: null
    })
  },
  beginDraft: (point) => {
    const style = get().style

    set({
      isEditing: true,
      selectedItemId: null,
      moveTargetItemId: null,
      draft: {
        pageIndex: point.pageIndex,
        x: point.x,
        y: point.y,
        overlayLeft: point.overlayLeft,
        overlayTop: point.overlayTop,
        text: '',
        style,
        sourceItemId: null
      }
    })
  },
  beginDraftFromCommittedItem: (itemId, overlayLeft, overlayTop) => {
    const item = get().committedItems.find((entry) => entry.id === itemId)
    if (!item) {
      return
    }

    set({
      isEditing: true,
      selectedItemId: itemId,
      moveTargetItemId: null,
      style: cloneStyle(item.style),
      draft: {
        pageIndex: item.pageIndex,
        x: item.x,
        y: item.y,
        overlayLeft,
        overlayTop,
        text: item.text,
        style: cloneStyle(item.style),
        sourceItemId: itemId
      }
    })
  },
  updateDraftText: (text) => {
    const currentDraft = get().draft
    if (!currentDraft) {
      return
    }

    set({
      draft: {
        ...currentDraft,
        text
      }
    })
  },
  confirmDraft: () => {
    const currentDraft = get().draft

    set({
      isEditing: false,
      draft: null
    })

    return currentDraft
  },
  cancelDraft: () => {
    set({
      isEditing: false,
      draft: null
    })
  },
  selectCommittedItem: (itemId) => {
    if (itemId === null) {
      set({ selectedItemId: null })
      return
    }

    const exists = get().committedItems.some((item) => item.id === itemId)
    if (!exists) {
      return
    }

    set({ selectedItemId: itemId })
  },
  setFontFamily: (fontFamily) => {
    const nextStyle: TextInsertStyle = {
      ...get().style,
      fontFamily
    }

    const currentDraft = get().draft
    set({
      style: nextStyle,
      draft: currentDraft
        ? {
            ...currentDraft,
            style: nextStyle
          }
        : null
    })
  },
  setFontSize: (fontSize) => {
    const nextStyle: TextInsertStyle = {
      ...get().style,
      fontSize: clampFontSize(fontSize)
    }

    const currentDraft = get().draft
    set({
      style: nextStyle,
      draft: currentDraft
        ? {
            ...currentDraft,
            style: nextStyle
          }
        : null
    })
  },
  setColorHex: (colorHex) => {
    const nextStyle: TextInsertStyle = {
      ...get().style,
      colorHex: normalizeColorHex(colorHex)
    }

    const currentDraft = get().draft
    set({
      style: nextStyle,
      draft: currentDraft
        ? {
            ...currentDraft,
            style: nextStyle
          }
        : null
    })
  },
  captureSessionSnapshot: () => {
    const state = get()

    return {
      anchorBytes: cloneBytes(state.anchorBytes),
      committedItems: cloneCommittedItems(state.committedItems),
      selectedItemId: state.selectedItemId,
      nextItemId: state.nextItemId
    }
  },
  applySessionSnapshot: (snapshot) => {
    set({
      anchorBytes: cloneBytes(snapshot.anchorBytes),
      committedItems: cloneCommittedItems(snapshot.committedItems),
      selectedItemId: snapshot.selectedItemId,
      nextItemId: snapshot.nextItemId,
      moveTargetItemId: null,
      draft: null,
      isEditing: false
    })
  },
  setAnchorBytes: (bytes) => {
    set({ anchorBytes: bytes.slice() })
  },
  clearAnchorBytes: () => {
    set({ anchorBytes: null })
  },
  appendCommittedItem: (item) => {
    const state = get()
    const id = `text-item-${state.nextItemId}`
    const nextItem: TextInsertCommittedItem = {
      ...item,
      id,
      style: cloneStyle(item.style)
    }

    set({
      committedItems: [...state.committedItems, nextItem],
      selectedItemId: id,
      nextItemId: state.nextItemId + 1,
      moveTargetItemId: null
    })

    return nextItem
  },
  replaceCommittedItem: (itemId, patch) => {
    const state = get()

    const nextItems = state.committedItems.map((item) => {
      if (item.id !== itemId) {
        return item
      }

      return {
        ...item,
        ...patch,
        style: patch.style ? cloneStyle(patch.style) : item.style
      }
    })

    set({
      committedItems: nextItems,
      selectedItemId: state.selectedItemId === itemId ? itemId : state.selectedItemId
    })
  },
  removeCommittedItem: (itemId) => {
    const state = get()
    const nextItems = state.committedItems.filter((item) => item.id !== itemId)

    set({
      committedItems: nextItems,
      selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
      moveTargetItemId: state.moveTargetItemId === itemId ? null : state.moveTargetItemId
    })
  },
  setMoveTargetItem: (itemId) => {
    if (itemId === null) {
      set({ moveTargetItemId: null })
      return
    }

    const exists = get().committedItems.some((item) => item.id === itemId)
    if (!exists) {
      return
    }

    set({ moveTargetItemId: itemId, selectedItemId: itemId })
  }
}))
