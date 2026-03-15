/**
 * @file AppToolbar.tsx
 * @brief Shell-level toolbar that renders registered toolbar items by group.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'
import type { ToolbarGroup, ToolbarItemDef } from '@renderer/types/appShell'

const LEFT_TOOLBAR_SECTIONS: ToolbarGroup[][] = [
  ['tools', 'file'],
  ['text'],
  ['navigation'],
  ['zoom']
]
const RIGHT_TOOLBAR_SECTIONS: ToolbarGroup[][] = [['search'], ['history']]

export interface AppToolbarProps {
  items: ToolbarItemDef[]
}

export const AppToolbar = memo(function AppToolbar({ items }: AppToolbarProps): React.JSX.Element {
  const getItemsByGroup = (group: ToolbarGroup): ToolbarItemDef[] =>
    items.filter((item) => item.group === group).sort((left, right) => left.order - right.order)

  const renderSections = (sections: ToolbarGroup[][]): React.JSX.Element[] =>
    sections
      .map((sectionGroups) => {
        const sectionItems = sectionGroups.flatMap((group) => getItemsByGroup(group))
        if (sectionItems.length === 0) {
          return null
        }

        const groupClassName = sectionGroups.includes('search')
          ? 'app-shell-toolbar-group--search'
          : sectionGroups.includes('history')
            ? 'app-shell-toolbar-group--history'
            : sectionGroups.includes('text')
              ? 'app-shell-toolbar-group--text'
              : sectionGroups.includes('zoom')
                ? 'app-shell-toolbar-group--zoom'
                : sectionGroups.includes('navigation')
                  ? 'app-shell-toolbar-group--navigation'
                  : 'app-shell-toolbar-group--primary'

        return (
          <section
            key={sectionGroups.join('-')}
            className={`app-shell-toolbar-group ${groupClassName}`}
            aria-label={`${sectionGroups.join(' + ')} controls`}
          >
            {sectionItems.map((item) => (
              <div
                key={item.id}
                className={`app-shell-toolbar-item app-shell-toolbar-item--${item.id}`}
              >
                {item.render()}
              </div>
            ))}
          </section>
        )
      })
      .filter((node): node is React.JSX.Element => node !== null)

  return (
    <header className="app-shell-toolbar" role="toolbar" aria-label="Application toolbar">
      <div className="app-shell-toolbar-track">
        {renderSections(LEFT_TOOLBAR_SECTIONS)}
        <div className="app-shell-toolbar-spacer" />
        {renderSections(RIGHT_TOOLBAR_SECTIONS)}
      </div>
    </header>
  )
})
