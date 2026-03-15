/**
 * @file documentStore.ts
 * @brief Zustand store for current document metadata and loading state.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { create } from 'zustand'
import type { DocumentState } from '@renderer/types/pdfViewer'

const initialState = {
  filePath: null,
  fileName: null,
  bytes: null,
  pageCount: 0,
  isLoading: false,
  loadError: null
} satisfies Pick<
  DocumentState,
  'filePath' | 'fileName' | 'bytes' | 'pageCount' | 'isLoading' | 'loadError'
>

export const useDocumentStore = create<DocumentState>()((set) => ({
  ...initialState,
  openDocument: (doc, pageCount) => {
    set({
      filePath: doc.filePath,
      fileName: doc.fileName,
      bytes: doc.bytes,
      pageCount,
      isLoading: false,
      loadError: null
    })
  },
  updateBytes: (bytes) => {
    set({
      bytes
    })
  },
  setLoading: (isLoading) => {
    set({ isLoading })
  },
  setLoadError: (message) => {
    set({ loadError: message })
  },
  closeDocument: () => {
    set({
      ...initialState
    })
  }
}))
