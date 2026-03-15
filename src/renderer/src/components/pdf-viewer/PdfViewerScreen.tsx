/**
 * @file PdfViewerScreen.tsx
 * @brief Main PDF viewer screen composed of toolbar, viewport, and empty/error states.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import { usePdfViewer } from '@renderer/hooks/usePdfViewer'
import { PdfOutlineSidebar } from './PdfOutlineSidebar'
import { PdfToolbar } from './PdfToolbar'
import { PdfViewport } from './PdfViewport'
import { WelcomeScreen } from './WelcomeScreen'

export const PdfViewerScreen = memo(function PdfViewerScreen(): React.JSX.Element {
  const {
    fileName,
    hasDocument,
    pageCount,
    currentPage,
    scale,
    isLoading,
    loadError,
    canvasContainerRef,
    viewportRef,
    openFile,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
    canZoomIn,
    canZoomOut,
    canGoToPreviousPage,
    canGoToNextPage,
    canGoToPreviousMatch,
    canGoToNextMatch,
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
    goToPreviousMatch,
    goToNextMatch,
    handleWheel,
    handleScroll
  } = usePdfViewer()

  const viewerBodyClassName = isOutlineOpen
    ? 'pdf-viewer-body pdf-viewer-body--with-outline'
    : 'pdf-viewer-body'

  return (
    <main className="pdf-viewer-screen">
      <PdfToolbar
        fileName={fileName}
        currentPage={currentPage}
        pageCount={pageCount}
        scale={scale}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        canGoToPreviousPage={canGoToPreviousPage}
        canGoToNextPage={canGoToNextPage}
        canGoToPreviousMatch={canGoToPreviousMatch}
        canGoToNextMatch={canGoToNextMatch}
        isLoading={isLoading}
        searchQuery={searchQuery}
        matchCount={matchCount}
        activeMatchNumber={activeMatchNumber}
        isOutlineOpen={isOutlineOpen}
        onOpenFile={openFile}
        onToggleOutline={toggleOutline}
        onGoToPreviousPage={goToPreviousPage}
        onGoToNextPage={goToNextPage}
        onJumpToPage={jumpToPage}
        onSearchQueryChange={setSearchQuery}
        onGoToPreviousMatch={goToPreviousMatch}
        onGoToNextMatch={goToNextMatch}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={fitWidth}
        onFitPage={fitPage}
      />

      {loadError ? <p className="pdf-viewer-error">{loadError}</p> : null}

      <section className={viewerBodyClassName}>
        {isOutlineOpen ? (
          <PdfOutlineSidebar outlineItems={outlineItems} onSelectItem={jumpToOutlineItem} />
        ) : null}

        <div className="pdf-viewer-main">
          {hasDocument ? (
            <PdfViewport
              viewportRef={viewportRef}
              canvasContainerRef={canvasContainerRef}
              onScroll={handleScroll}
              onWheel={handleWheel}
            />
          ) : (
            <div className="pdf-empty-viewport">
              <WelcomeScreen onOpenFile={openFile} isLoading={isLoading} />
            </div>
          )}
        </div>
      </section>
    </main>
  )
})
