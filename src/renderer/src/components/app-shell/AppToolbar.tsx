/**
 * @file AppToolbar.tsx
 * @brief Ribbon-style toolbar with tab menu and contextual controls.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo, useMemo, useState } from 'react'
import type { ToolbarGroup, ToolbarItemDef } from '@renderer/types/appShell'

type RibbonTabId = 'home' | 'edit' | 'page' | 'tools'

interface RibbonTabDefinition {
  id: RibbonTabId
  label: string
  groups: ToolbarGroup[][]
  emptyLabel: string
}

const TAB_DEFINITIONS: RibbonTabDefinition[] = [
  {
    id: 'home',
    label: 'Home',
    groups: [['file'], ['navigation'], ['zoom'], ['search'], ['history']],
    emptyLabel: 'Home actions will appear here.'
  },
  {
    id: 'edit',
    label: 'Edit',
    groups: [['tools'], ['text']],
    emptyLabel: 'Edit tools will appear here.'
  },
  {
    id: 'page',
    label: 'Page',
    groups: [['page']],
    emptyLabel: 'Page tools will appear here.'
  },
  {
    id: 'tools',
    label: 'Tools',
    groups: [['utilities']],
    emptyLabel: 'More tools coming soon.'
  }
]

const getGroupClassName = (group: ToolbarGroup): string => {
  switch (group) {
    case 'search':
      return 'app-shell-ribbon-group--search'
    case 'zoom':
      return 'app-shell-ribbon-group--zoom'
    case 'navigation':
      return 'app-shell-ribbon-group--navigation'
    case 'text':
      return 'app-shell-ribbon-group--text'
    case 'history':
      return 'app-shell-ribbon-group--history'
    case 'page':
      return 'app-shell-ribbon-group--page'
    case 'file':
      return 'app-shell-ribbon-group--file'
    case 'tools':
      return 'app-shell-ribbon-group--tools'
    case 'utilities':
      return 'app-shell-ribbon-group--utilities'
    default:
      return 'app-shell-ribbon-group--default'
  }
}

export interface AppToolbarProps {
  items: ToolbarItemDef[]
}

export const AppToolbar = memo(function AppToolbar({ items }: AppToolbarProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<RibbonTabId>('home')

  const itemsByGroup = useMemo(() => {
    const map = new Map<ToolbarGroup, ToolbarItemDef[]>()
    items.forEach((item) => {
      const groupItems = map.get(item.group) ?? []
      groupItems.push(item)
      map.set(item.group, groupItems)
    })

    map.forEach((groupItems, group) => {
      map.set(
        group,
        [...groupItems].sort((left, right) => left.order - right.order)
      )
    })

    return map
  }, [items])

  const activeTabDefinition =
    TAB_DEFINITIONS.find((tab) => tab.id === activeTab) ?? TAB_DEFINITIONS[0]

  const activeSections = activeTabDefinition.groups
    .map((groups, sectionIndex) => {
      const sectionItems = groups.flatMap((group) => itemsByGroup.get(group) ?? [])
      if (sectionItems.length === 0) {
        return null
      }

      const primaryGroup = groups[0]

      return (
        <section
          key={`${activeTabDefinition.id}-${String(sectionIndex)}`}
          className={`app-shell-ribbon-group ${getGroupClassName(primaryGroup)}`}
          aria-label={`${groups.join(' + ')} controls`}
        >
          {sectionItems.map((item) => (
            <div
              key={item.id}
              className={`app-shell-ribbon-item app-shell-ribbon-item--${item.id}`}
            >
              {item.render()}
            </div>
          ))}
        </section>
      )
    })
    .filter((section): section is React.JSX.Element => section !== null)

  return (
    <header className="app-shell-ribbon" aria-label="Application ribbon">
      <div className="app-shell-tabbar" role="tablist" aria-label="Editor tabs">
        {TAB_DEFINITIONS.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`ribbon-panel-${tab.id}`}
              className={isActive ? 'app-shell-tab app-shell-tab--active' : 'app-shell-tab'}
              onClick={() => {
                setActiveTab(tab.id)
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        className="app-shell-ribbon-toolbar"
        role="toolbar"
        id={`ribbon-panel-${activeTabDefinition.id}`}
        aria-label={`${activeTabDefinition.label} ribbon`}
      >
        {activeSections.length > 0 ? (
          activeSections
        ) : (
          <div className="app-shell-ribbon-empty">{activeTabDefinition.emptyLabel}</div>
        )}
      </div>
    </header>
  )
})
