/**
 * @file usePdfViewer.ts
 * @brief Hook orchestrating open-file flow, rendering lifecycle, zoom, page navigation, and search highlights.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, RefObject, WheelEvent } from 'react'
import { PdfDocument, type PdfDocumentApi } from '@renderer/core/PdfDocument'
import { PdfRenderer } from '@renderer/core/PdfRenderer'
import { useDocumentStore } from '@renderer/store/documentStore'
import { useEditorStore } from '@renderer/store/editorStore'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  type PdfOverlayPoint,
  type PdfOutlineItem,
  type PdfTextMatchBox,
  type ZoomLevel
} from '@renderer/types/pdfViewer'
import type { ViewerBindings } from '@renderer/types/appShell'
import { err, ok, type Result } from '@renderer/types/result'

const FILE_OPEN_CANCELLED = 'FILE_OPEN_CANCELLED'
const VIEWPORT_PADDING = 24

interface SearchMatch {
  id: string
  pageIndex: number
  box: PdfTextMatchBox
}

const clampPageIndex = (pageIndex: number, pageCount: number): number => {
  if (pageCount <= 0) {
    return 0
  }

  if (pageIndex < 0) {
    return 0
  }

  if (pageIndex >= pageCount) {
    return pageCount - 1
  }

  return pageIndex
}

const ensurePositive = (value: number): number => (value > 0 ? value : 1)

export interface UsePdfViewerResult extends ViewerBindings {
  fileName: string | null
  hasDocument: boolean
  pageCount: number
  currentPage: number
  scale: ZoomLevel
  isLoading: boolean
  loadError: string | null
  canvasContainerRef: RefObject<HTMLDivElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  documentApi: PdfDocumentApi
  applyDocumentBytes: (nextBytes: Uint8Array) => Promise<Result<void>>
  resolveOverlayPoint: (event: PointerEvent<HTMLDivElement>) => PdfOverlayPoint | null
  getPageSurfaceElement: (pageIndex: number) => HTMLElement | null
  openFile: () => Promise<void>
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => Promise<void>
  fitPage: () => Promise<void>
  canZoomIn: boolean
  canZoomOut: boolean
  canGoToPreviousPage: boolean
  canGoToNextPage: boolean
  goToPreviousPage: () => void
  goToNextPage: () => void
  jumpToPage: (pageNumber: number) => void
  outlineItems: PdfOutlineItem[]
  isOutlineOpen: boolean
  toggleOutline: () => void
  jumpToOutlineItem: (pageIndex: number | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  matchCount: number
  activeMatchNumber: number
  canGoToPreviousMatch: boolean
  canGoToNextMatch: boolean
  goToPreviousMatch: () => void
  goToNextMatch: () => void
  handleWheel: (event: WheelEvent<HTMLDivElement>) => void
  handleScroll: () => void
}

export const usePdfViewer = (): UsePdfViewerResult => {
  const rendererRef = useRef<PdfRenderer | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageSurfaceMapRef = useRef<Map<number, HTMLElement>>(new Map())
  const renderRunIdRef = useRef(0)
  const searchRunIdRef = useRef(0)

  const [searchQuery, setSearchQueryValue] = useState('')
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1)
  const [outlineItems, setOutlineItems] = useState<PdfOutlineItem[]>([])
  const [isOutlineOpen, setIsOutlineOpen] = useState(true)

  const normalizedSearchQuery = searchQuery.trim()
  const isSearchActive = normalizedSearchQuery.length > 0
  const visibleSearchMatches = useMemo<SearchMatch[]>(
    () => (isSearchActive ? searchMatches : []),
    [isSearchActive, searchMatches]
  )
  const visibleActiveMatchIndex =
    activeMatchIndex >= 0 && activeMatchIndex < visibleSearchMatches.length ? activeMatchIndex : -1

  const fileName = useDocumentStore((state) => state.fileName)
  const bytes = useDocumentStore((state) => state.bytes)
  const pageCount = useDocumentStore((state) => state.pageCount)
  const isLoading = useDocumentStore((state) => state.isLoading)
  const loadError = useDocumentStore((state) => state.loadError)
  const openDocument = useDocumentStore((state) => state.openDocument)
  const updateBytes = useDocumentStore((state) => state.updateBytes)
  const setLoading = useDocumentStore((state) => state.setLoading)
  const setLoadError = useDocumentStore((state) => state.setLoadError)
  const closeDocument = useDocumentStore((state) => state.closeDocument)

  const currentPage = useEditorStore((state) => state.currentPage)
  const scale = useEditorStore((state) => state.scale)
  const setCurrentPage = useEditorStore((state) => state.setCurrentPage)
  const setScale = useEditorStore((state) => state.setScale)
  const zoomIn = useEditorStore((state) => state.zoomIn)
  const zoomOut = useEditorStore((state) => state.zoomOut)

  const hasDocument = Boolean(bytes && pageCount > 0)
  const documentApi = useMemo<PdfDocumentApi>(() => new PdfDocument(), [])

  const getRenderer = useCallback((): PdfRenderer => {
    if (!rendererRef.current) {
      rendererRef.current = new PdfRenderer()
    }

    return rendererRef.current
  }, [])

  const clearRenderedPages = useCallback((): void => {
    const container = canvasContainerRef.current
    if (!container) {
      return
    }

    container.innerHTML = ''
    pageSurfaceMapRef.current.clear()
  }, [])

  const getPageSurfaceElement = useCallback((pageIndex: number): HTMLElement | null => {
    return pageSurfaceMapRef.current.get(pageIndex) ?? null
  }, [])

  const resolveOverlayPoint = useCallback(
    (event: PointerEvent<HTMLDivElement>): PdfOverlayPoint | null => {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return null
      }

      const pageWrapper = target.closest<HTMLElement>('.pdf-page-wrapper')
      if (!pageWrapper) {
        return null
      }

      const pageIndex = Number(pageWrapper.dataset.pageIndex ?? '-1')
      if (!Number.isFinite(pageIndex) || pageIndex < 0) {
        return null
      }

      const pageSurface = pageWrapper.querySelector<HTMLElement>('.pdf-page-surface')
      const canvas = pageWrapper.querySelector<HTMLCanvasElement>('.pdf-page-canvas')

      if (!pageSurface || !canvas) {
        return null
      }

      const canvasRect = canvas.getBoundingClientRect()
      if (canvasRect.width <= 0 || canvasRect.height <= 0) {
        return null
      }

      const domX = event.clientX - canvasRect.left
      const domY = event.clientY - canvasRect.top

      if (
        !Number.isFinite(domX) ||
        !Number.isFinite(domY) ||
        domX < 0 ||
        domY < 0 ||
        domX > canvasRect.width ||
        domY > canvasRect.height
      ) {
        return null
      }

      const safeScale = scale > 0 ? scale : 1
      const pdfX = domX / safeScale
      const pdfY = (canvasRect.height - domY) / safeScale

      const surfaceRect = pageSurface.getBoundingClientRect()

      return {
        pageIndex,
        x: pdfX,
        y: pdfY,
        overlayLeft: event.clientX - surfaceRect.left,
        overlayTop: event.clientY - surfaceRect.top
      }
    },
    [scale]
  )

  const applyDocumentBytes = useCallback(
    async (nextBytes: Uint8Array): Promise<Result<void>> => {
      const renderer = getRenderer()
      const rendererLoadResult = await renderer.load(nextBytes)

      if (!rendererLoadResult.ok) {
        setLoadError(rendererLoadResult.error)
        return err(rendererLoadResult.error)
      }

      const documentLoadResult = await documentApi.load(nextBytes)
      if (!documentLoadResult.ok) {
        setLoadError(documentLoadResult.error)
        return err(documentLoadResult.error)
      }

      updateBytes(nextBytes)
      setLoadError(null)
      return ok(undefined)
    },
    [documentApi, getRenderer, setLoadError, updateBytes]
  )

  const scrollToPageIndex = useCallback(
    (targetPageIndex: number, matchCenterY?: number): void => {
      const viewport = viewportRef.current
      if (!viewport || pageCount <= 0) {
        return
      }

      const clampedPageIndex = clampPageIndex(targetPageIndex, pageCount)
      const pageWrapper = viewport.querySelector<HTMLElement>(
        `.pdf-page-wrapper[data-page-index="${clampedPageIndex}"]`
      )

      if (!pageWrapper) {
        return
      }

      let targetScrollTop = pageWrapper.offsetTop
      if (typeof matchCenterY === 'number') {
        targetScrollTop = pageWrapper.offsetTop + matchCenterY - viewport.clientHeight / 2
      }

      viewport.scrollTo({
        top: Math.max(targetScrollTop, 0),
        behavior: 'smooth'
      })

      setCurrentPage(clampedPageIndex)
    },
    [pageCount, setCurrentPage]
  )

  const drawHighlights = useCallback((): void => {
    const container = canvasContainerRef.current
    if (!container) {
      return
    }

    const matchesByPage = new Map<number, Array<{ match: SearchMatch; index: number }>>()

    visibleSearchMatches.forEach((match, index) => {
      const existing = matchesByPage.get(match.pageIndex) ?? []
      existing.push({ match, index })
      matchesByPage.set(match.pageIndex, existing)
    })

    const pageWrappers = container.querySelectorAll<HTMLElement>('.pdf-page-wrapper')
    pageWrappers.forEach((wrapper) => {
      const pageIndex = Number(wrapper.dataset.pageIndex ?? '-1')
      const layer = wrapper.querySelector<HTMLElement>('.pdf-page-highlight-layer')

      if (!layer) {
        return
      }

      layer.innerHTML = ''

      const pageMatches = matchesByPage.get(pageIndex) ?? []
      pageMatches.forEach(({ match, index }) => {
        const highlight = document.createElement('div')
        highlight.className =
          index === visibleActiveMatchIndex
            ? 'pdf-search-highlight pdf-search-highlight--active'
            : 'pdf-search-highlight'

        highlight.dataset.matchId = match.id
        highlight.style.left = `${match.box.x}px`
        highlight.style.top = `${match.box.y}px`
        highlight.style.width = `${Math.max(match.box.width, 2)}px`
        highlight.style.height = `${Math.max(match.box.height, 8)}px`

        layer.appendChild(highlight)
      })
    })
  }, [visibleActiveMatchIndex, visibleSearchMatches])

  const renderAllPages = useCallback(async (): Promise<void> => {
    const runId = renderRunIdRef.current + 1
    renderRunIdRef.current = runId

    const container = canvasContainerRef.current
    if (!container) {
      return
    }

    clearRenderedPages()

    if (!bytes || pageCount <= 0) {
      return
    }

    const renderer = getRenderer()

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      if (runId !== renderRunIdRef.current) {
        return
      }

      const pageWrapper = document.createElement('div')
      pageWrapper.className = 'pdf-page-wrapper'
      pageWrapper.dataset.pageIndex = String(pageIndex)

      const pageSurface = document.createElement('div')
      pageSurface.className = 'pdf-page-surface'
      pageSurface.dataset.pageIndex = String(pageIndex)

      const canvas = document.createElement('canvas')
      canvas.className = 'pdf-page-canvas'

      const highlightLayer = document.createElement('div')
      highlightLayer.className = 'pdf-page-highlight-layer'

      pageSurface.appendChild(canvas)
      pageSurface.appendChild(highlightLayer)
      pageWrapper.appendChild(pageSurface)
      container.appendChild(pageWrapper)
      pageSurfaceMapRef.current.set(pageIndex, pageSurface)

      const result = await renderer.renderPage({
        canvas,
        pageIndex,
        scale
      })

      if (!result.ok && result.error !== 'Render aborted due to newer request') {
        setLoadError(result.error)
        break
      }
    }

    if (runId === renderRunIdRef.current) {
      drawHighlights()
    }
  }, [bytes, clearRenderedPages, drawHighlights, getRenderer, pageCount, scale, setLoadError])

  const resetViewportScroll = useCallback((): void => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    viewport.scrollTop = 0
  }, [])

  const getFirstPageSize = useCallback(async (): Promise<{
    width: number
    height: number
  } | null> => {
    if (!hasDocument) {
      return null
    }

    const renderer = getRenderer()
    const pageSizeResult = await renderer.getPageSize({ pageIndex: 0 })

    if (!pageSizeResult.ok) {
      setLoadError(pageSizeResult.error)
      return null
    }

    return pageSizeResult.value
  }, [getRenderer, hasDocument, setLoadError])

  const fitWidth = useCallback(async (): Promise<void> => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const pageSize = await getFirstPageSize()
    if (!pageSize) {
      return
    }

    const targetWidth = ensurePositive(viewport.clientWidth - VIEWPORT_PADDING)
    const nextScale = Math.min(Math.max(targetWidth / pageSize.width, MIN_ZOOM), MAX_ZOOM)

    setScale(nextScale)
  }, [getFirstPageSize, setScale])

  const fitPage = useCallback(async (): Promise<void> => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const pageSize = await getFirstPageSize()
    if (!pageSize) {
      return
    }

    const targetWidth = ensurePositive(viewport.clientWidth - VIEWPORT_PADDING)
    const targetHeight = ensurePositive(viewport.clientHeight - VIEWPORT_PADDING)
    const widthScale = targetWidth / pageSize.width
    const heightScale = targetHeight / pageSize.height

    const nextScale = Math.min(Math.max(Math.min(widthScale, heightScale), MIN_ZOOM), MAX_ZOOM)
    setScale(nextScale)
  }, [getFirstPageSize, setScale])

  const openFile = useCallback(async (): Promise<void> => {
    setLoading(true)
    setLoadError(null)

    const selection = await window.api.file.open()

    if (!selection.ok) {
      setLoading(false)

      if (selection.error !== FILE_OPEN_CANCELLED) {
        setLoadError(selection.error)
      }

      return
    }

    closeDocument()
    clearRenderedPages()
    setLoading(true)
    setCurrentPage(0)
    setSearchQueryValue('')
    setSearchMatches([])
    setActiveMatchIndex(-1)
    setOutlineItems([])

    const renderer = getRenderer()
    const loadResult = await renderer.load(selection.value.bytes)

    if (!loadResult.ok) {
      setLoading(false)
      setLoadError(loadResult.error)
      return
    }

    const documentLoadResult = await documentApi.load(selection.value.bytes)
    if (!documentLoadResult.ok) {
      setLoading(false)
      setLoadError(documentLoadResult.error)
      return
    }

    openDocument(selection.value, loadResult.value.pageCount)

    const outlineResult = await renderer.getOutline()
    if (!outlineResult.ok) {
      setLoadError(outlineResult.error)
    } else {
      setOutlineItems(outlineResult.value)
    }

    resetViewportScroll()
  }, [
    clearRenderedPages,
    closeDocument,
    documentApi,
    getRenderer,
    openDocument,
    resetViewportScroll,
    setCurrentPage,
    setLoadError,
    setLoading
  ])

  const handleScroll = useCallback((): void => {
    const viewport = viewportRef.current
    if (!viewport || pageCount <= 0) {
      return
    }

    const pageElements = viewport.querySelectorAll<HTMLElement>('.pdf-page-wrapper')
    if (pageElements.length === 0) {
      return
    }

    const viewportCenter = viewport.scrollTop + viewport.clientHeight / 2
    let bestPageIndex = 0
    let smallestDistance = Number.POSITIVE_INFINITY

    pageElements.forEach((element) => {
      const pageIndex = Number(element.dataset.pageIndex ?? '0')
      const pageTop = element.offsetTop
      const pageCenter = pageTop + element.offsetHeight / 2
      const distance = Math.abs(pageCenter - viewportCenter)

      if (distance < smallestDistance) {
        smallestDistance = distance
        bestPageIndex = pageIndex
      }
    })

    setCurrentPage(clampPageIndex(bestPageIndex, pageCount))
  }, [pageCount, setCurrentPage])

  const goToPreviousPage = useCallback((): void => {
    scrollToPageIndex(currentPage - 1)
  }, [currentPage, scrollToPageIndex])

  const goToNextPage = useCallback((): void => {
    scrollToPageIndex(currentPage + 1)
  }, [currentPage, scrollToPageIndex])

  const jumpToPage = useCallback(
    (pageNumber: number): void => {
      if (!Number.isFinite(pageNumber)) {
        return
      }

      const targetPageIndex = Math.floor(pageNumber) - 1
      scrollToPageIndex(targetPageIndex)
    },
    [scrollToPageIndex]
  )

  const jumpToOutlineItem = useCallback(
    (pageIndex: number | null): void => {
      if (pageIndex === null) {
        return
      }

      scrollToPageIndex(pageIndex)
    },
    [scrollToPageIndex]
  )

  const toggleOutline = useCallback((): void => {
    setIsOutlineOpen((previous) => !previous)
  }, [])

  const goToNextMatch = useCallback((): void => {
    if (visibleSearchMatches.length === 0) {
      return
    }

    setActiveMatchIndex((previous) => {
      if (previous < 0) {
        return 0
      }

      return (previous + 1) % visibleSearchMatches.length
    })
  }, [visibleSearchMatches.length])

  const goToPreviousMatch = useCallback((): void => {
    if (visibleSearchMatches.length === 0) {
      return
    }

    setActiveMatchIndex((previous) => {
      if (previous < 0) {
        return 0
      }

      return (previous - 1 + visibleSearchMatches.length) % visibleSearchMatches.length
    })
  }, [visibleSearchMatches.length])

  const setSearchQuery = useCallback((query: string): void => {
    setSearchQueryValue(query)
    if (query.trim().length === 0) {
      setSearchMatches([])
      setActiveMatchIndex(-1)
    }
  }, [])

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>): void => {
      const isZoomModifierActive = event.ctrlKey || event.metaKey
      if (!isZoomModifierActive) {
        return
      }

      event.preventDefault()

      if (event.deltaY < 0) {
        zoomIn()
        return
      }

      zoomOut()
    },
    [zoomIn, zoomOut]
  )

  useEffect(() => {
    void renderAllPages()
  }, [renderAllPages])

  useEffect(() => {
    drawHighlights()
  }, [drawHighlights])

  useEffect(() => {
    if (!hasDocument || !isSearchActive) {
      return
    }

    const searchRunId = searchRunIdRef.current + 1
    searchRunIdRef.current = searchRunId

    const renderer = getRenderer()

    const runSearch = async (): Promise<void> => {
      const nextMatches: SearchMatch[] = []

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const result = await renderer.searchPageText({
          pageIndex,
          query: normalizedSearchQuery,
          scale
        })

        if (searchRunId !== searchRunIdRef.current) {
          return
        }

        if (!result.ok) {
          setLoadError(result.error)
          continue
        }

        result.value.forEach((box, boxIndex) => {
          nextMatches.push({
            id: `${pageIndex}-${boxIndex}-${Math.round(box.x)}-${Math.round(box.y)}`,
            pageIndex,
            box
          })
        })
      }

      if (searchRunId !== searchRunIdRef.current) {
        return
      }

      setSearchMatches(nextMatches)
      setActiveMatchIndex(nextMatches.length > 0 ? 0 : -1)
    }

    void runSearch()
  }, [
    getRenderer,
    hasDocument,
    isSearchActive,
    normalizedSearchQuery,
    pageCount,
    scale,
    setLoadError
  ])

  useEffect(() => {
    if (visibleActiveMatchIndex < 0 || visibleActiveMatchIndex >= visibleSearchMatches.length) {
      return
    }

    const activeMatch = visibleSearchMatches[visibleActiveMatchIndex]
    const matchCenterY = activeMatch.box.y + activeMatch.box.height / 2
    scrollToPageIndex(activeMatch.pageIndex, matchCenterY)
  }, [scrollToPageIndex, visibleActiveMatchIndex, visibleSearchMatches])

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  const canZoomOut = scale > MIN_ZOOM + 0.0001
  const canZoomIn = scale < MAX_ZOOM - 0.0001
  const canGoToPreviousPage = hasDocument && currentPage > 0
  const canGoToNextPage = hasDocument && currentPage < pageCount - 1
  const matchCount = visibleSearchMatches.length
  const activeMatchNumber =
    visibleActiveMatchIndex >= 0 && visibleActiveMatchIndex < matchCount
      ? visibleActiveMatchIndex + 1
      : 0
  const canGoToPreviousMatch = matchCount > 0
  const canGoToNextMatch = matchCount > 0

  const result = useMemo<UsePdfViewerResult>(
    () => ({
      fileName,
      hasDocument,
      pageCount,
      currentPage,
      scale,
      isLoading,
      loadError,
      canvasContainerRef,
      viewportRef,
      documentApi,
      applyDocumentBytes,
      resolveOverlayPoint,
      getPageSurfaceElement,
      openFile,
      zoomIn,
      zoomOut,
      fitWidth,
      fitPage,
      canZoomIn,
      canZoomOut,
      canGoToPreviousPage,
      canGoToNextPage,
      goToPreviousPage,
      goToNextPage,
      jumpToPage,
      outlineItems,
      isOutlineOpen,
      toggleOutline,
      jumpToOutlineItem,
      searchQuery,
      setSearchQuery,
      matchCount,
      activeMatchNumber,
      canGoToPreviousMatch,
      canGoToNextMatch,
      goToPreviousMatch,
      goToNextMatch,
      handleWheel,
      handleScroll
    }),
    [
      activeMatchNumber,
      canGoToNextMatch,
      canGoToNextPage,
      canGoToPreviousMatch,
      canGoToPreviousPage,
      canZoomIn,
      canZoomOut,
      currentPage,
      documentApi,
      fileName,
      fitPage,
      fitWidth,
      getPageSurfaceElement,
      goToNextMatch,
      goToNextPage,
      goToPreviousMatch,
      goToPreviousPage,
      handleScroll,
      handleWheel,
      hasDocument,
      isOutlineOpen,
      isLoading,
      jumpToPage,
      jumpToOutlineItem,
      loadError,
      matchCount,
      openFile,
      outlineItems,
      pageCount,
      applyDocumentBytes,
      resolveOverlayPoint,
      scale,
      searchQuery,
      setSearchQuery,
      toggleOutline,
      zoomIn,
      zoomOut
    ]
  )

  return result
}
