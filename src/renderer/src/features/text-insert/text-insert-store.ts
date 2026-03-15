/**
 * @file text-insert-store.ts
 * @brief Zustand state slice for text-insert mode activation, draft lifecycle, and text style options.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { create } from 'zustand'
import type { TextInsertStyle } from '@renderer/core/PdfDocument'

const DEFAULT_STYLE: TextInsertStyle = {
  fontFamily: 'Helvetica',
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

export interface TextInsertDraft {
  pageIndex: number
  x: number
  y: number
  overlayLeft: number
  overlayTop: number
  text: string
  style: TextInsertStyle
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
  activate: () => void
  deactivate: () => void
  beginDraft: (point: TextInsertPoint) => void
  updateDraftText: (text: string) => void
  confirmDraft: () => TextInsertDraft | null
  cancelDraft: () => void
  setFontFamily: (fontFamily: TextInsertStyle['fontFamily']) => void
  setFontSize: (fontSize: number) => void
  setColorHex: (colorHex: string) => void
}

export const useTextInsertStore = create<TextInsertModeState>()((set, get) => ({
  isActive: false,
  isEditing: false,
  draft: null,
  style: DEFAULT_STYLE,
  activate: () => {
    set({ isActive: true })
  },
  deactivate: () => {
    set({ isActive: false, isEditing: false, draft: null })
  },
  beginDraft: (point) => {
    const style = get().style

    set({
      isEditing: true,
      draft: {
        pageIndex: point.pageIndex,
        x: point.x,
        y: point.y,
        overlayLeft: point.overlayLeft,
        overlayTop: point.overlayTop,
        text: '',
        style
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
  }
}))
