/**
 * @file App.tsx
 * @brief Root renderer component wiring AppShell registrations and viewer content.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { useEffect, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppShellFrame } from '@renderer/components/app-shell/AppShellFrame'
import { PdfViewerScreen } from '@renderer/components/pdf-viewer/PdfViewerScreen'
import { AppShell } from '@renderer/core/AppShell'
import { registerTextInsert } from '@renderer/features/text-insert/index'
import { TextInsertOverlay } from '@renderer/features/text-insert/text-insert-overlay'
import { useTextInsertStore } from '@renderer/features/text-insert/text-insert-store'
import { usePdfViewer } from '@renderer/hooks/usePdfViewer'
import { registerBookmarksPanel } from '@renderer/features/bookmarks/index'
import { useHistoryStore } from '@renderer/store/historyStore'
import { useShellStore } from '@renderer/store/shellStore'
import { type ToolbarItemDef } from '@renderer/types/appShell'
import type { TextInsertMode } from '@renderer/features/text-insert/text-insert-mode'

const formatScale = (scale: number): string => `${Math.round(scale * 100)}%`

function App(): React.JSX.Element {
  const viewer = usePdfViewer()
  const viewerRef = useRef(viewer)
  viewerRef.current = viewer
  const textInsertModeRef = useRef<TextInsertMode | null>(null)
  const shellRef = useRef<AppShell | null>(null)
  const [, setShellVersion] = useReducer((value: number) => value + 1, 0)

  const textInsertDraft = useTextInsertStore((state) => state.draft)
  const textInsertIsActive = useTextInsertStore((state) => state.isActive)
  const [textInsertCommitId, setTextInsertCommitId] = useState(0)

  const setHistorySnapshot = useHistoryStore((state) => state.setSnapshot)
  const setSidebarOpen = useShellStore((state) => state.setSidebarOpen)
  const setActivePanelId = useShellStore((state) => state.setActivePanelId)
  const setRegisteredPanelIds = useShellStore((state) => state.setRegisteredPanelIds)

  if (!shellRef.current) {
    shellRef.current = new AppShell({
      getFileName: () => viewerRef.current.fileName,
      getCurrentPage: () => viewerRef.current.currentPage,
      getPageCount: () => viewerRef.current.pageCount
    })
  }

  const shell = shellRef.current

  const handleUndo = async (): Promise<void> => {
    await shell.undo()
    setShellVersion()
  }

  const handleRedo = async (): Promise<void> => {
    await shell.redo()
    setShellVersion()
  }

  const handleToggleSidebar = (): void => {
    const next = !shell.getSnapshot().sidebarOpen
    shell.setSidebarOpen(next)
    setShellVersion()
  }

  const registerToolbarItems = (): void => {
    const items: ToolbarItemDef[] = [
      {
        id: 'bookmarks-toggle',
        group: 'tools',
        order: 1,
        render: () => {
          const isSidebarOpen = shell.getSnapshot().sidebarOpen

          return (
            <button
              className="viewer-button"
              type="button"
              onClick={handleToggleSidebar}
              aria-label={isSidebarOpen ? 'Hide Bookmarks' : 'Show Bookmarks'}
            >
              {isSidebarOpen ? 'Hide Bookmarks' : 'Show Bookmarks'}
            </button>
          )
        }
      },
      {
        id: 'file-open',
        group: 'file',
        order: 1,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button"
                type="button"
                onClick={() => void liveViewer.openFile()}
              >
                {liveViewer.isLoading ? 'Opening…' : 'Open File'}
              </button>
            )
          })()
      },
      {
        id: 'nav-prev-page',
        group: 'navigation',
        order: 1,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--compact"
                type="button"
                onClick={() => liveViewer.goToPreviousPage()}
                disabled={!liveViewer.canGoToPreviousPage}
                title="Previous page"
              >
                ‹
              </button>
            )
          })()
      },
      {
        id: 'nav-next-page',
        group: 'navigation',
        order: 2,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--compact"
                type="button"
                onClick={() => liveViewer.goToNextPage()}
                disabled={!liveViewer.canGoToNextPage}
                title="Next page"
              >
                ›
              </button>
            )
          })()
      },
      {
        id: 'nav-page-input',
        group: 'navigation',
        order: 3,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <input
                className="viewer-input viewer-input--page"
                type="text"
                inputMode="numeric"
                defaultValue={String(liveViewer.pageCount > 0 ? liveViewer.currentPage + 1 : '')}
                key={`toolbar-page-${liveViewer.currentPage}-${liveViewer.pageCount}`}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return
                  }

                  const pageNumber = Number(event.currentTarget.value)
                  if (!Number.isFinite(pageNumber)) {
                    return
                  }

                  liveViewer.jumpToPage(pageNumber)
                }}
                placeholder="Page"
                aria-label="Jump to page"
              />
            )
          })()
      },
      {
        id: 'zoom-out',
        group: 'zoom',
        order: 1,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--compact"
                type="button"
                onClick={() => liveViewer.zoomOut()}
                disabled={!liveViewer.canZoomOut}
              >
                −
              </button>
            )
          })()
      },
      {
        id: 'zoom-level',
        group: 'zoom',
        order: 2,
        render: () => (
          <span className="pdf-toolbar__zoom">{formatScale(viewerRef.current.scale)}</span>
        )
      },
      {
        id: 'zoom-in',
        group: 'zoom',
        order: 3,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--compact"
                type="button"
                onClick={() => liveViewer.zoomIn()}
                disabled={!liveViewer.canZoomIn}
              >
                +
              </button>
            )
          })()
      },
      {
        id: 'zoom-fit-width',
        group: 'zoom',
        order: 4,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--fit"
                type="button"
                onClick={() => void liveViewer.fitWidth()}
              >
                Fit Width
              </button>
            )
          })()
      },
      {
        id: 'zoom-fit-page',
        group: 'zoom',
        order: 5,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--fit"
                type="button"
                onClick={() => void liveViewer.fitPage()}
              >
                Fit Page
              </button>
            )
          })()
      },
      {
        id: 'search-input',
        group: 'search',
        order: 1,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <input
                className="viewer-input viewer-input--search"
                type="text"
                value={liveViewer.searchQuery}
                onChange={(event) => {
                  liveViewer.setSearchQuery(event.target.value)
                }}
                placeholder="Search text"
                aria-label="Search text"
              />
            )
          })()
      },
      {
        id: 'search-prev',
        group: 'search',
        order: 2,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--compact"
                type="button"
                onClick={() => liveViewer.goToPreviousMatch()}
                disabled={!liveViewer.canGoToPreviousMatch}
                title="Previous match"
              >
                ↑
              </button>
            )
          })()
      },
      {
        id: 'search-next',
        group: 'search',
        order: 3,
        render: () =>
          (() => {
            const liveViewer = viewerRef.current

            return (
              <button
                className="viewer-button viewer-button--compact"
                type="button"
                onClick={() => liveViewer.goToNextMatch()}
                disabled={!liveViewer.canGoToNextMatch}
                title="Next match"
              >
                ↓
              </button>
            )
          })()
      },
      {
        id: 'search-match-counter',
        group: 'search',
        order: 4,
        render: () => {
          const liveViewer = viewerRef.current

          return (
            <span className="pdf-toolbar__match">
              Match {liveViewer.matchCount > 0 ? liveViewer.activeMatchNumber : 0} /{' '}
              {liveViewer.matchCount}
            </span>
          )
        }
      },
      {
        id: 'history-undo',
        group: 'history',
        order: 1,
        render: () => (
          <button
            className="viewer-button"
            type="button"
            onClick={() => void handleUndo()}
            disabled={!shell.getSnapshot().history.canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
        )
      },
      {
        id: 'history-redo',
        group: 'history',
        order: 2,
        render: () => (
          <button
            className="viewer-button"
            type="button"
            onClick={() => void handleRedo()}
            disabled={!shell.getSnapshot().history.canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            Redo
          </button>
        )
      }
    ]

    items.forEach((item) => {
      const result = shell.addToolbarItem(item)
      void result
    })
  }

  useEffect(() => {
    registerToolbarItems()

    const textInsertBindings = registerTextInsert({
      shell,
      applyDocumentBytes: viewer.applyDocumentBytes,
      documentApi: viewer.documentApi,
      onShellChanged: () => {
        setShellVersion()
      }
    })

    textInsertModeRef.current = textInsertBindings.mode

    setShellVersion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell, viewer.applyDocumentBytes, viewer.documentApi])

  useEffect(() => {
    const panelResult = shell.setActivePanel(null)
    void panelResult

    registerBookmarksPanel(shell, {
      outlineItems: viewer.outlineItems,
      jumpToOutlineItem: viewer.jumpToOutlineItem
    })
    const activateResult = shell.setActivePanel('bookmarks')
    void activateResult

    setShellVersion()
  }, [shell, viewer.jumpToOutlineItem, viewer.outlineItems])

  const snapshot = shell.getSnapshot()

  useEffect(() => {
    setHistorySnapshot(snapshot.history)
    setSidebarOpen(snapshot.sidebarOpen)
    setActivePanelId(snapshot.activePanelId)
    setRegisteredPanelIds(snapshot.panels.map((panel) => panel.id))
  }, [
    setActivePanelId,
    setHistorySnapshot,
    setRegisteredPanelIds,
    setSidebarOpen,
    snapshot.activePanelId,
    snapshot.history,
    snapshot.panels,
    snapshot.sidebarOpen
  ])

  const handleSelectPanel = (panelId: string): void => {
    const result = shell.setActivePanel(panelId)
    if (result.ok) {
      setShellVersion()
    }
  }

  const handleViewerPointerDown = (event: import('react').PointerEvent<HTMLDivElement>): void => {
    const mode = textInsertModeRef.current
    if (!mode || !textInsertIsActive) {
      return
    }

    const overlayPoint = viewer.resolveOverlayPoint(event)
    if (!overlayPoint) {
      return
    }

    mode.onCanvasPointerDown(overlayPoint)
    setShellVersion()
  }

  const handleTextInsertConfirm = async (): Promise<void> => {
    const mode = textInsertModeRef.current
    if (!mode) {
      return
    }

    await mode.confirmCurrentDraft()
    setShellVersion()
  }

  useEffect(() => {
    if (!textInsertDraft) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const mode = textInsertModeRef.current
      if (!mode) {
        return
      }

      void mode.confirmDraftIfCurrent(textInsertDraft)
      setShellVersion()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [textInsertDraft, textInsertCommitId])

  const handleTextInsertCancel = (): void => {
    const mode = textInsertModeRef.current
    if (!mode) {
      return
    }

    mode.cancelCurrentDraft()
    setShellVersion()
  }

  const handleTextInsertChange = (text: string): void => {
    const mode = textInsertModeRef.current
    if (!mode) {
      return
    }

    mode.updateDraftText(text)
    setShellVersion()
  }

  const textInsertOverlay = (() => {
    if (!textInsertDraft) {
      return null
    }

    const pageSurface = viewer.getPageSurfaceElement(textInsertDraft.pageIndex)
    if (!pageSurface) {
      return null
    }

    return createPortal(
      <TextInsertOverlay
        draft={textInsertDraft}
        onChangeText={handleTextInsertChange}
        onConfirm={() => {
          setTextInsertCommitId((previous) => previous + 1)
          void handleTextInsertConfirm()
        }}
        onCancel={handleTextInsertCancel}
      />,
      pageSurface
    )
  })()

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      const tagName = target.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea') {
        return true
      }

      return target.isContentEditable
    }

    const normalizeCombo = (event: KeyboardEvent): string | null => {
      const key = event.key.toLowerCase()

      if (event.ctrlKey && !event.shiftKey && key === 'z') {
        return 'Ctrl+Z'
      }

      if (event.ctrlKey && !event.shiftKey && key === 'y') {
        return 'Ctrl+Y'
      }

      if (event.ctrlKey && event.shiftKey && key === 'z') {
        return 'Ctrl+Shift+Z'
      }

      return null
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return
      }

      const combo = normalizeCombo(event)
      if (!combo) {
        return
      }

      const shortcut = shell.getShortcutByCombo(combo)
      if (!shortcut) {
        return
      }

      event.preventDefault()
      void shortcut.onTrigger()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shell])

  useEffect(() => {
    const undoShortcutResult = shell.addShortcut({
      id: 'history-undo',
      combo: 'Ctrl+Z',
      onTrigger: async () => {
        await handleUndo()
      }
    })
    void undoShortcutResult

    const redoShortcutResult = shell.addShortcut({
      id: 'history-redo',
      combo: 'Ctrl+Y',
      onTrigger: async () => {
        await handleRedo()
      }
    })
    void redoShortcutResult

    const redoShiftShortcutResult = shell.addShortcut({
      id: 'history-redo-shift',
      combo: 'Ctrl+Shift+Z',
      onTrigger: async () => {
        await handleRedo()
      }
    })
    void redoShiftShortcutResult

    setShellVersion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell])

  return (
    <AppShellFrame
      toolbarItems={snapshot.toolbarItems}
      panels={snapshot.panels}
      activePanelId={snapshot.activePanelId}
      sidebarOpen={snapshot.sidebarOpen}
      statusFileName={snapshot.status.fileName}
      statusCurrentPage={snapshot.status.currentPage}
      statusPageCount={snapshot.status.pageCount}
      onSelectPanel={handleSelectPanel}
    >
      <PdfViewerScreen
        hasDocument={viewer.hasDocument}
        isLoading={viewer.isLoading}
        loadError={viewer.loadError}
        canvasContainerRef={viewer.canvasContainerRef}
        viewportRef={viewer.viewportRef}
        onOpenFile={viewer.openFile}
        onScroll={viewer.handleScroll}
        onWheel={viewer.handleWheel}
        onPointerDown={handleViewerPointerDown}
        overlays={textInsertOverlay}
      />
    </AppShellFrame>
  )
}

export default App
