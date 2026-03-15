/**
 * @file PdfOutlineSidebar.tsx
 * @brief Collapsible left sidebar displaying PDF bookmarks/outline as a tree.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { PdfOutlineItem } from '@renderer/types/pdfViewer'

interface PdfOutlineTreeProps {
  items: PdfOutlineItem[]
  onSelect: (pageIndex: number | null) => void
}

const PdfOutlineTree = memo(function PdfOutlineTree({
  items,
  onSelect
}: PdfOutlineTreeProps): React.JSX.Element {
  return (
    <ul className="pdf-outline-tree">
      {items.map((item) => (
        <li key={item.id} className="pdf-outline-node">
          <button
            className="pdf-outline-link"
            type="button"
            onClick={() => onSelect(item.pageIndex)}
            disabled={item.pageIndex === null}
            title={item.pageIndex === null ? 'No destination page' : undefined}
          >
            {item.title}
          </button>
          {item.children.length > 0 ? (
            <PdfOutlineTree items={item.children} onSelect={onSelect} />
          ) : null}
        </li>
      ))}
    </ul>
  )
})

export interface PdfOutlineSidebarProps {
  outlineItems: PdfOutlineItem[]
  onSelectItem: (pageIndex: number | null) => void
}

export const PdfOutlineSidebar = memo(function PdfOutlineSidebar({
  outlineItems,
  onSelectItem
}: PdfOutlineSidebarProps): React.JSX.Element {
  return (
    <aside className="pdf-outline-sidebar" aria-label="PDF bookmarks">
      <div className="pdf-outline-content">
        <h2 className="pdf-outline-title">Bookmarks</h2>
        {outlineItems.length === 0 ? (
          <p className="pdf-outline-empty">No bookmarks</p>
        ) : (
          <PdfOutlineTree items={outlineItems} onSelect={onSelectItem} />
        )}
      </div>
    </aside>
  )
})
