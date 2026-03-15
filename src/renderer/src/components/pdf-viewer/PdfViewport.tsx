/**
 * @file PdfViewport.tsx
 * @brief Scrollable viewport hosting rendered PDF page canvases.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { PointerEvent, RefObject, WheelEvent } from 'react'

export interface PdfViewportProps {
  viewportRef: RefObject<HTMLDivElement | null>
  canvasContainerRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  onWheel: (event: WheelEvent<HTMLDivElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
}

export const PdfViewport = memo(function PdfViewport({
  viewportRef,
  canvasContainerRef,
  onScroll,
  onWheel,
  onPointerDown
}: PdfViewportProps): React.JSX.Element {
  return (
    <div
      className="pdf-viewport"
      ref={viewportRef}
      onScroll={onScroll}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
    >
      <div className="pdf-canvas-container" ref={canvasContainerRef} />
    </div>
  )
})
