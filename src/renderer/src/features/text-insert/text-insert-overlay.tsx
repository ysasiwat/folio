/**
 * @file text-insert-overlay.tsx
 * @brief Inline text editor overlay rendered above PDF pages for text-insert drafting.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo, useEffect, useRef } from 'react'
import type {
  TextInsertCommittedItem,
  TextInsertDraft
} from '@renderer/features/text-insert/text-insert-store'

export interface TextInsertOverlayProps {
  draft: TextInsertDraft | null
  committedItems: TextInsertCommittedItem[]
  selectedItemId: string | null
  moveTargetItemId: string | null
  onChangeText: (text: string) => void
  onConfirm: () => void
  onCancel: () => void
  onSelectCommittedItem: (itemId: string) => void
  onBeginEditCommittedItem: (itemId: string, overlayLeft: number, overlayTop: number) => void
}

const lineHeightMultiplier = 1.35
const TEXTAREA_HORIZONTAL_PADDING = 12
const TEXTAREA_VERTICAL_PADDING = 4
const TEXTAREA_VERTICAL_BORDER = 2
const MIN_TEXTAREA_WIDTH = 24
const MIN_TEXTAREA_HEIGHT = 18
const MAX_TEXTAREA_WIDTH_RATIO = 0.4
const DEFAULT_TEXT_PREVIEW = ' '

const THAI_FONT_FALLBACK =
  '"Sarabun", "Noto Sans Thai", Tahoma, "Arial Unicode MS", Helvetica, sans-serif'

const resolveOverlayFontFamily = (draft: TextInsertDraft): string => {
  if (draft.style.fontFamily === 'Sarabun') {
    return THAI_FONT_FALLBACK
  }

  return `${draft.style.fontFamily}, ${THAI_FONT_FALLBACK}`
}

const measureTextWidth = (text: string, draft: TextInsertDraft): number => {
  const sampleText = text.length > 0 ? text : DEFAULT_TEXT_PREVIEW
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    return MIN_TEXTAREA_WIDTH
  }

  const fontFamily = resolveOverlayFontFamily(draft)
  context.font = `${draft.style.fontSize}px ${fontFamily}`
  const measured = context.measureText(sampleText)
  return Math.max(Math.ceil(measured.width + TEXTAREA_HORIZONTAL_PADDING), MIN_TEXTAREA_WIDTH)
}

const resolveLineHeight = (draft: TextInsertDraft): number =>
  draft.style.fontSize * lineHeightMultiplier

const resolveMinHeight = (draft: TextInsertDraft): number =>
  Math.max(Math.ceil(resolveLineHeight(draft) + 6), MIN_TEXTAREA_HEIGHT)

const resolveHeightByText = (text: string, draft: TextInsertDraft): number => {
  const explicitLineCount = text.split('\n').length
  const visualLineCount = Math.max(explicitLineCount, 1)
  const contentHeight =
    resolveLineHeight(draft) * visualLineCount +
    TEXTAREA_VERTICAL_PADDING +
    TEXTAREA_VERTICAL_BORDER

  return Math.max(Math.ceil(contentHeight), resolveMinHeight(draft))
}

export const TextInsertOverlay = memo(function TextInsertOverlay({
  draft,
  committedItems,
  selectedItemId,
  moveTargetItemId,
  onChangeText,
  onConfirm,
  onCancel,
  onSelectCommittedItem,
  onBeginEditCommittedItem
}: TextInsertOverlayProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const resizeToContent = (el: HTMLTextAreaElement, draftValue: TextInsertDraft): void => {
    const lines = draftValue.text.split('\n')
    const longestLine = lines.reduce(
      (longest, current) => (current.length > longest.length ? current : longest),
      ''
    )
    const measuredWidth = measureTextWidth(longestLine, draftValue)
    const viewportWidth = window.innerWidth
    const maxWidth = Math.max(
      MIN_TEXTAREA_WIDTH,
      Math.floor(viewportWidth * MAX_TEXTAREA_WIDTH_RATIO)
    )
    const width = Math.min(Math.max(measuredWidth, MIN_TEXTAREA_WIDTH), maxWidth)
    el.style.width = `${width}px`

    const nextHeight = resolveHeightByText(draftValue.text, draftValue)
    el.style.height = `${nextHeight}px`
  }

  useEffect(() => {
    if (!draft) {
      return
    }

    const input = inputRef.current
    if (input) {
      resizeToContent(input, draft)
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }, [draft])

  return (
    <>
      {committedItems.map((item) => {
        const isSelected = item.id === selectedItemId
        const isMoveTarget = item.id === moveTargetItemId

        return (
          <button
            key={item.id}
            type="button"
            className={
              isMoveTarget
                ? 'text-insert-overlay__chip text-insert-overlay__chip--move'
                : isSelected
                  ? 'text-insert-overlay__chip text-insert-overlay__chip--selected'
                  : 'text-insert-overlay__chip'
            }
            style={{
              left: `${item.x}px`,
              top: `calc(100% - ${item.y}px)`,
              color: item.style.colorHex,
              fontFamily: resolveOverlayFontFamily({
                ...item,
                overlayLeft: 0,
                overlayTop: 0,
                sourceItemId: null
              }),
              fontSize: `${item.style.fontSize}px`
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelectCommittedItem(item.id)
            }}
            onDoubleClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const target = event.currentTarget
              const parent = target.parentElement
              if (!parent) {
                return
              }

              const targetRect = target.getBoundingClientRect()
              const parentRect = parent.getBoundingClientRect()

              const overlayLeft = targetRect.left - parentRect.left
              const overlayTop = targetRect.top - parentRect.top

              onBeginEditCommittedItem(item.id, overlayLeft, overlayTop)
            }}
            aria-label={`Inserted text: ${item.text}`}
            title="Click to select, double click to edit"
          >
            {item.text}
          </button>
        )
      })}

      {draft ? (
        <div
          className="text-insert-overlay"
          style={{
            left: `${draft.overlayLeft}px`,
            top: `${draft.overlayTop}px`
          }}
        >
          <textarea
            ref={inputRef}
            className="text-insert-overlay__input"
            value={draft.text}
            onChange={(event) => {
              resizeToContent(event.target, {
                ...draft,
                text: event.target.value
              })
              onChangeText(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
                return
              }

              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onConfirm()
              }
            }}
            onBlur={() => {
              onConfirm()
            }}
            rows={1}
            wrap="off"
            spellCheck={false}
            style={{
              color: draft.style.colorHex,
              fontFamily: resolveOverlayFontFamily(draft),
              fontSize: `${draft.style.fontSize}px`,
              lineHeight: `${draft.style.fontSize * lineHeightMultiplier}px`,
              minHeight: `${resolveMinHeight(draft)}px`
            }}
            aria-label="Insert text"
          />
        </div>
      ) : null}
    </>
  )
})
