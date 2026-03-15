/**
 * @file PdfToolbar.tsx
 * @brief Top toolbar for file open, zoom controls, and page indicator.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

export interface PdfToolbarProps {
  fileName: string | null
  currentPage: number
  pageCount: number
  scale: number
  canZoomIn: boolean
  canZoomOut: boolean
  canGoToPreviousPage: boolean
  canGoToNextPage: boolean
  canGoToPreviousMatch: boolean
  canGoToNextMatch: boolean
  isLoading: boolean
  searchQuery: string
  matchCount: number
  activeMatchNumber: number
  isOutlineOpen: boolean
  onOpenFile: () => Promise<void>
  onToggleOutline: () => void
  onGoToPreviousPage: () => void
  onGoToNextPage: () => void
  onJumpToPage: (pageNumber: number) => void
  onSearchQueryChange: (query: string) => void
  onGoToPreviousMatch: () => void
  onGoToNextMatch: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => Promise<void>
  onFitPage: () => Promise<void>
}

const formatScale = (scale: number): string => `${Math.round(scale * 100)}%`

export const PdfToolbar = memo(function PdfToolbar({
  fileName,
  currentPage,
  pageCount,
  scale,
  canZoomIn,
  canZoomOut,
  canGoToPreviousPage,
  canGoToNextPage,
  canGoToPreviousMatch,
  canGoToNextMatch,
  isLoading,
  searchQuery,
  matchCount,
  activeMatchNumber,
  isOutlineOpen,
  onOpenFile,
  onToggleOutline,
  onGoToPreviousPage,
  onGoToNextPage,
  onJumpToPage,
  onSearchQueryChange,
  onGoToPreviousMatch,
  onGoToNextMatch,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage
}: PdfToolbarProps): React.JSX.Element {
  const handlePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') {
      return
    }

    const pageNumber = Number((event.currentTarget as HTMLInputElement).value)
    if (!Number.isFinite(pageNumber)) {
      return
    }

    onJumpToPage(pageNumber)
  }

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchQueryChange(event.target.value)
  }

  return (
    <header className="pdf-toolbar">
      <div className="pdf-toolbar__left">
        <button className="viewer-button" type="button" onClick={onToggleOutline}>
          {isOutlineOpen ? 'Hide Bookmarks' : 'Show Bookmarks'}
        </button>
        <button className="viewer-button" type="button" onClick={() => void onOpenFile()}>
          {isLoading ? 'Opening…' : 'Open File'}
        </button>
        <span className="pdf-toolbar__file" title={fileName ?? undefined}>
          {fileName ?? 'No file selected'}
        </span>
      </div>

      <div className="pdf-toolbar__right">
        <button
          className="viewer-button viewer-button--compact"
          type="button"
          onClick={onGoToPreviousPage}
          disabled={!canGoToPreviousPage}
          title="Previous page"
        >
          ‹
        </button>
        <button
          className="viewer-button viewer-button--compact"
          type="button"
          onClick={onGoToNextPage}
          disabled={!canGoToNextPage}
          title="Next page"
        >
          ›
        </button>
        <input
          className="viewer-input viewer-input--page"
          type="text"
          inputMode="numeric"
          defaultValue={String(pageCount > 0 ? currentPage + 1 : '')}
          onKeyDown={handlePageInputKeyDown}
          placeholder="Page"
        />
        <button
          className="viewer-button viewer-button--compact"
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
        >
          −
        </button>
        <span className="pdf-toolbar__zoom">{formatScale(scale)}</span>
        <button
          className="viewer-button viewer-button--compact"
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
        >
          +
        </button>
        <button
          className="viewer-button viewer-button--fit"
          type="button"
          onClick={() => void onFitWidth()}
        >
          Fit Width
        </button>
        <button
          className="viewer-button viewer-button--fit"
          type="button"
          onClick={() => void onFitPage()}
        >
          Fit Page
        </button>
        <span className="pdf-toolbar__page">
          Page {pageCount > 0 ? currentPage + 1 : 0} / {pageCount}
        </span>
        <input
          className="viewer-input viewer-input--search"
          type="text"
          value={searchQuery}
          onChange={handleSearchInputChange}
          placeholder="Search text"
        />
        <button
          className="viewer-button viewer-button--compact"
          type="button"
          onClick={onGoToPreviousMatch}
          disabled={!canGoToPreviousMatch}
          title="Previous match"
        >
          ↑
        </button>
        <button
          className="viewer-button viewer-button--compact"
          type="button"
          onClick={onGoToNextMatch}
          disabled={!canGoToNextMatch}
          title="Next match"
        >
          ↓
        </button>
        <span className="pdf-toolbar__match">
          Match {matchCount > 0 ? activeMatchNumber : 0} / {matchCount}
        </span>
      </div>
    </header>
  )
})
