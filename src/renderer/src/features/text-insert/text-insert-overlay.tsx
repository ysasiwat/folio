/**
 * @file text-insert-overlay.tsx
 * @brief Inline text editor overlay rendered above PDF pages for text-insert drafting.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo, useEffect, useRef } from 'react'
import type { TextInsertDraft } from '@renderer/features/text-insert/text-insert-store'

export interface TextInsertOverlayProps {
  draft: TextInsertDraft | null
  onChangeText: (text: string) => void
  onConfirm: () => void
  onCancel: () => void
}

const lineHeightMultiplier = 1.4
const TEXTAREA_HORIZONTAL_PADDING = 16
const MIN_TEXTAREA_WIDTH = 120

const measureTextWidth = (text: string, draft: TextInsertDraft): number => {
  const sampleText = text.length > 0 ? text : ' '
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    return MIN_TEXTAREA_WIDTH
  }

  context.font = `${draft.style.fontSize}px ${draft.style.fontFamily}`
  const measured = context.measureText(sampleText)
  return Math.max(Math.ceil(measured.width + TEXTAREA_HORIZONTAL_PADDING), MIN_TEXTAREA_WIDTH)
}

export const TextInsertOverlay = memo(function TextInsertOverlay({
  draft,
  onChangeText,
  onConfirm,
  onCancel
}: TextInsertOverlayProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const autoResize = (el: HTMLTextAreaElement): void => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const applyWidth = (el: HTMLTextAreaElement, draftValue: TextInsertDraft): void => {
    const lines = draftValue.text.split('\n')
    const longestLine = lines.reduce(
      (longest, current) => (current.length > longest.length ? current : longest),
      ''
    )
    const width = measureTextWidth(longestLine, draftValue)
    el.style.width = `${width}px`
  }

  useEffect(() => {
    if (!draft) {
      return
    }

    const input = inputRef.current
    if (input) {
      applyWidth(input, draft)
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
      autoResize(input)
    }
  }, [draft])

  if (!draft) {
    return null
  }

  return (
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
          applyWidth(event.target, {
            ...draft,
            text: event.target.value
          })
          autoResize(event.target)
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
        spellCheck={false}
        style={{
          color: draft.style.colorHex,
          fontFamily: 'Sarabun, Tahoma, Noto Sans Thai, Arial Unicode MS, Helvetica, sans-serif',
          fontSize: `${draft.style.fontSize}px`,
          lineHeight: String(draft.style.fontSize * lineHeightMultiplier)
        }}
        aria-label="Insert text"
      />
    </div>
  )
})
