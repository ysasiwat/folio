/**
 * @file AppShellFrame.tsx
 * @brief Top-level application shell frame composed of toolbar, sidebar host, content area, and status bar.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { PanelDef, ToolbarItemDef } from '@renderer/types/appShell'
import { AppSidebar } from './AppSidebar'
import { AppStatusBar } from './AppStatusBar'
import { AppToolbar } from './AppToolbar'

export interface AppShellFrameProps {
  toolbarItems: ToolbarItemDef[]
  panels: PanelDef[]
  activePanelId: string | null
  sidebarOpen: boolean
  statusFileName: string
  statusCurrentPage: number
  statusPageCount: number
  onSelectPanel: (panelId: string) => void
  children: React.ReactNode
}

export const AppShellFrame = memo(function AppShellFrame({
  toolbarItems,
  panels,
  activePanelId,
  sidebarOpen,
  statusFileName,
  statusCurrentPage,
  statusPageCount,
  onSelectPanel,
  children
}: AppShellFrameProps): React.JSX.Element {
  return (
    <div className="app-shell-root">
      <AppToolbar items={toolbarItems} />

      <div className="app-shell-content-row">
        <AppSidebar
          panels={panels}
          activePanelId={activePanelId}
          sidebarOpen={sidebarOpen}
          onSelectPanel={onSelectPanel}
        />

        <main className="app-shell-main-content">{children}</main>
      </div>

      <AppStatusBar
        fileName={statusFileName}
        currentPage={statusCurrentPage}
        pageCount={statusPageCount}
      />
    </div>
  )
})
