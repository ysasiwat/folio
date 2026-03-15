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

export const registerBookmarksPanel = (shell: AppShell, bindings: BookmarksBindings): void => {
  const result = shell.addPanel({
    id: 'bookmarks',
    title: 'Bookmarks',
    icon: '🔖',
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
