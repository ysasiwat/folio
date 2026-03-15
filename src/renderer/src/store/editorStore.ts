/**
 * @file editorStore.ts
 * @brief Zustand store for page navigation and zoom state in viewer mode.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { create } from 'zustand'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_LEVELS,
  type EditorState,
  type ZoomLevel
} from '@renderer/types/pdfViewer'

const DEFAULT_PAGE = 0
const DEFAULT_SCALE: ZoomLevel = 1

const clampPage = (page: number): number => {
  if (Number.isNaN(page) || page < 0) {
    return 0
  }

  return Math.floor(page)
}

const clampScale = (scale: number): ZoomLevel => {
  if (Number.isNaN(scale) || !Number.isFinite(scale)) {
    return 1
  }

  if (scale < MIN_ZOOM) {
    return MIN_ZOOM
  }

  if (scale > MAX_ZOOM) {
    return MAX_ZOOM
  }

  return scale
}

const nextZoom = (scale: ZoomLevel): ZoomLevel => {
  const next = ZOOM_LEVELS.find((value) => value > scale + 0.0001)
  if (!next) {
    return MAX_ZOOM
  }

  return next
}

const previousZoom = (scale: ZoomLevel): ZoomLevel => {
  const previousCandidates = ZOOM_LEVELS.filter((value) => value < scale - 0.0001)
  if (previousCandidates.length === 0) {
    return MIN_ZOOM
  }

  return previousCandidates[previousCandidates.length - 1]
}

export const useEditorStore = create<EditorState>()((set) => ({
  currentPage: DEFAULT_PAGE,
  scale: DEFAULT_SCALE,
  setCurrentPage: (page) => {
    set({ currentPage: clampPage(page) })
  },
  setScale: (scale) => {
    set({ scale: clampScale(scale) })
  },
  zoomIn: () => {
    set((state) => ({ scale: nextZoom(state.scale) }))
  },
  zoomOut: () => {
    set((state) => ({ scale: previousZoom(state.scale) }))
  }
}))
