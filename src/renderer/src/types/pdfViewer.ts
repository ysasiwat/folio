/**
 * @file pdfViewer.ts
 * @brief Domain models for PDF viewer state and rendering.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { Result } from './result'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4] as const

export type ZoomLevel = number

export interface OpenPdfSuccess {
  filePath: string
  fileName: string
  bytes: Uint8Array
}

export interface DocumentState {
  filePath: string | null
  fileName: string | null
  bytes: Uint8Array | null
  pageCount: number
  isLoading: boolean
  loadError: string | null
  openDocument: (doc: OpenPdfSuccess, pageCount: number) => void
  updateBytes: (bytes: Uint8Array) => void
  setLoading: (isLoading: boolean) => void
  setLoadError: (message: string | null) => void
  closeDocument: () => void
}

export interface EditorState {
  currentPage: number
  scale: ZoomLevel
  setCurrentPage: (page: number) => void
  setScale: (scale: number) => void
  zoomIn: () => void
  zoomOut: () => void
}

export interface RenderPageInput {
  canvas: HTMLCanvasElement
  pageIndex: number
  scale: number
}

export interface GetPageSizeInput {
  pageIndex: number
  scale?: number
}

export interface SearchPageTextInput {
  pageIndex: number
  query: string
  scale: number
}

export interface PdfOutlineItem {
  id: string
  title: string
  pageIndex: number | null
  children: PdfOutlineItem[]
}

export interface PdfTextMatchBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PdfPoint {
  pageIndex: number
  x: number
  y: number
}

export interface PdfOverlayPoint extends PdfPoint {
  overlayLeft: number
  overlayTop: number
}

export interface PdfLoadInfo {
  pageCount: number
}

export interface PdfRendererApi {
  load: (bytes: Uint8Array) => Promise<Result<PdfLoadInfo>>
  getPageSize: (input: GetPageSizeInput) => Promise<Result<{ width: number; height: number }>>
  getOutline: () => Promise<Result<PdfOutlineItem[]>>
  searchPageText: (input: SearchPageTextInput) => Promise<Result<PdfTextMatchBox[]>>
  renderPage: (input: RenderPageInput) => Promise<Result<void>>
  dispose: () => void
}
