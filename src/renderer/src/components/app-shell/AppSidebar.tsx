/**
 * @file AppSidebar.tsx
 * @brief Sidebar panel host with icon tab rail and active panel content area.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { PanelDef } from '@renderer/types/appShell'

export interface AppSidebarProps {
  panels: PanelDef[]
  activePanelId: string | null
  sidebarOpen: boolean
  onSelectPanel: (panelId: string) => void
}

export const AppSidebar = memo(function AppSidebar({
  panels,
  activePanelId,
  sidebarOpen,
  onSelectPanel
}: AppSidebarProps): React.JSX.Element {
  const activePanel = panels.find((panel) => panel.id === activePanelId) ?? null

  const handlePanelButtonClick = (panelId: string): void => {
    if (sidebarOpen && activePanelId === panelId) {
      onSelectPanel('')
      return
    }

    onSelectPanel(panelId)
  }

  return (
    <aside
      className={sidebarOpen ? 'app-shell-sidebar app-shell-sidebar--open' : 'app-shell-sidebar'}
      aria-label="Sidebar panel host"
    >
      <div className="app-shell-sidebar-tabs" role="tablist" aria-label="Sidebar tabs">
        {panels.map((panel) => {
          const isActive = sidebarOpen && panel.id === activePanelId

          return (
            <button
              key={panel.id}
              className={
                isActive
                  ? 'viewer-button app-shell-sidebar-tab app-shell-sidebar-tab--active'
                  : 'viewer-button app-shell-sidebar-tab'
              }
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${panel.id}`}
              onClick={() => {
                handlePanelButtonClick(panel.id)
              }}
              title={panel.title}
            >
              {panel.icon}
            </button>
          )
        })}
      </div>

      {sidebarOpen ? (
        <div
          className="app-shell-sidebar-content"
          id={`panel-${activePanel?.id ?? 'none'}`}
          role="tabpanel"
        >
          {activePanel ? activePanel.render() : null}
        </div>
      ) : null}
    </aside>
  )
})
