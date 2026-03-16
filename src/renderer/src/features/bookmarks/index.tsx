/**
 * @file index.tsx
 * @brief Bookmarks feature registration for AppShell sidebar panel host.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { PdfOutlineSidebar } from '@renderer/components/pdf-viewer/PdfOutlineSidebar'
import type { AppShell } from '@renderer/core/AppShell'
import type { PdfOutlineItem } from '@renderer/types/pdfViewer'

export interface BookmarksBindings {
  outlineItems: PdfOutlineItem[]
  jumpToOutlineItem: (pageIndex: number | null) => void
}

const BOOKMARK_ICON = (
  <svg
    className="app-shell-sidebar-icon"
    viewBox="0 0 20 20"
    width="20"
    height="20"
    aria-hidden="true"
  >
    <path
      d="M5 3h10a1 1 0 0 1 1 1v12.5l-6-3.6-6 3.6V4a1 1 0 0 1 1-1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
)

export const registerBookmarksPanel = (shell: AppShell, bindings: BookmarksBindings): void => {
  const result = shell.addPanel({
    id: 'bookmarks',
    title: 'Bookmarks',
    icon: BOOKMARK_ICON,
    order: 1,
    render: () => (
      <PdfOutlineSidebar
        outlineItems={bindings.outlineItems}
        onSelectItem={bindings.jumpToOutlineItem}
      />
    )
  })

  void result
}
