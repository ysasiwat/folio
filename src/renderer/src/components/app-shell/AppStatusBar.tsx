/**
 * @file AppStatusBar.tsx
 * @brief Bottom status bar displaying file and page state for AppShell.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'

export interface AppStatusBarProps {
  fileName: string
  currentPage: number
  pageCount: number
}

export const AppStatusBar = memo(function AppStatusBar({
  fileName,
  currentPage,
  pageCount
}: AppStatusBarProps): React.JSX.Element {
  return (
    <footer className="app-shell-status-bar" role="status" aria-live="polite">
      <span className="app-shell-status-item" title={fileName}>
        {fileName}
      </span>
      <span className="app-shell-status-item">
        Page {pageCount > 0 ? currentPage + 1 : 0} / {pageCount}
      </span>
    </footer>
  )
})
