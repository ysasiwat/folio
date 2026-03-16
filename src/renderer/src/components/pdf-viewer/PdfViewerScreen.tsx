/**
 * @file PdfViewerScreen.tsx
 * @brief PDF viewer content area composed of viewport and empty/error states.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { MouseEvent, PointerEvent, ReactNode, RefObject, WheelEvent } from 'react'
import { PdfViewport } from './PdfViewport'
import { WelcomeScreen } from './WelcomeScreen'

export interface PdfViewerScreenProps {
  hasDocument: boolean
  isLoading: boolean
  loadError: string | null
  canvasContainerRef: RefObject<HTMLDivElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  onOpenFile: () => Promise<void>
  onScroll: () => void
  onWheel: (event: WheelEvent<HTMLDivElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  overlays?: ReactNode
}

export const PdfViewerScreen = memo(function PdfViewerScreen({
  hasDocument,
  isLoading,
  loadError,
  canvasContainerRef,
  viewportRef,
  onOpenFile,
  onScroll,
  onWheel,
  onPointerDown,
  onClick,
  overlays
}: PdfViewerScreenProps): React.JSX.Element {
  return (
    <section className="pdf-viewer-screen">
      {loadError ? <p className="pdf-viewer-error">{loadError}</p> : null}

      <div className="pdf-viewer-main">
        {hasDocument ? (
          <PdfViewport
            viewportRef={viewportRef}
            canvasContainerRef={canvasContainerRef}
            onScroll={onScroll}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onClick={onClick}
          />
        ) : (
          <div className="pdf-empty-viewport">
            <WelcomeScreen onOpenFile={onOpenFile} isLoading={isLoading} />
          </div>
        )}

        {overlays}
      </div>
    </section>
  )
})
