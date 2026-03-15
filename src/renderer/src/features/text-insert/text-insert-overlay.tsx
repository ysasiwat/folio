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

export const TextInsertOverlay = memo(function TextInsertOverlay({
  draft,
  onChangeText,
  onConfirm,
  onCancel
}: TextInsertOverlayProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!draft) {
      return
    }

    const input = inputRef.current
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
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
        rows={2}
        spellCheck={false}
        style={{
          color: draft.style.colorHex,
          fontFamily: draft.style.fontFamily,
          fontSize: `${draft.style.fontSize}px`,
          lineHeight: String(draft.style.fontSize * lineHeightMultiplier)
        }}
        aria-label="Insert text"
      />
    </div>
  )
})
