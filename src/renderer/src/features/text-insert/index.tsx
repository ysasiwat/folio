/**
 * @file index.tsx
 * @brief Text-insert feature registration for AppShell toolbar controls and mode lifecycle.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { AppShell } from '@renderer/core/AppShell'
import type { PdfDocumentApi } from '@renderer/core/PdfDocument'
import {
  TextInsertMode,
  type TextInsertShellApi
} from '@renderer/features/text-insert/text-insert-mode'
import { useTextInsertStore } from '@renderer/features/text-insert/text-insert-store'
import type { ToolbarItemDef } from '@renderer/types/appShell'
import type { Result } from '@renderer/types/result'

const TEXT_FONT_OPTIONS = [
  { value: 'Sarabun', label: 'Sarabun (Thai)' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times-Roman', label: 'Times' },
  { value: 'Courier', label: 'Courier' }
] as const

type TextInsertFontOption = (typeof TEXT_FONT_OPTIONS)[number]['value']

const isTextInsertFontOption = (value: string): value is TextInsertFontOption =>
  TEXT_FONT_OPTIONS.some((option) => option.value === value)

export interface RegisterTextInsertDeps {
  shell: AppShell
  applyDocumentBytes: (bytes: Uint8Array) => Promise<Result<void>>
  documentApi: PdfDocumentApi
  onShellChanged: () => void
}

export interface TextInsertFeatureBindings {
  mode: TextInsertMode
}

export const registerTextInsert = (deps: RegisterTextInsertDeps): TextInsertFeatureBindings => {
  const { shell, applyDocumentBytes, documentApi, onShellChanged } = deps

  const shellApi: TextInsertShellApi = {
    executeCommand: async (command) => {
      const result = await shell.executeCommand(command)
      if (!result.ok) {
        return result
      }

      onShellChanged()

      const latestBytesResult = await documentApi.getBytes()
      if (!latestBytesResult.ok) {
        return latestBytesResult
      }

      const applyResult = await applyDocumentBytes(latestBytesResult.value)
      if (!applyResult.ok) {
        return applyResult
      }

      return result
    }
  }

  const mode = new TextInsertMode({
    shell: shellApi,
    documentApi,
    applyDocumentBytes
  })

  const items: ToolbarItemDef[] = [
    {
      id: 'text-insert-toggle',
      group: 'tools',
      order: 2,
      render: () => {
        const state = useTextInsertStore.getState()
        const label = state.isActive ? 'Exit Text' : 'Insert Text'

        return (
          <button
            className="viewer-button"
            type="button"
            onClick={() => {
              if (useTextInsertStore.getState().isActive) {
                mode.deactivate()
              } else {
                mode.activate()
              }
              onShellChanged()
            }}
            aria-label={label}
          >
            {label}
          </button>
        )
      }
    },
    {
      id: 'text-font-family',
      group: 'text',
      order: 1,
      render: () => {
        const state = useTextInsertStore.getState()
        if (!state.isActive) {
          return <></>
        }

        return (
          <select
            className="viewer-input"
            value={state.style.fontFamily}
            onChange={(event) => {
              const selectedFont = event.target.value
              if (!isTextInsertFontOption(selectedFont)) {
                return
              }

              useTextInsertStore.getState().setFontFamily(selectedFont)
              onShellChanged()
            }}
            aria-label="Text font family"
          >
            {TEXT_FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      }
    },
    {
      id: 'text-font-size',
      group: 'text',
      order: 2,
      render: () => {
        const state = useTextInsertStore.getState()
        if (!state.isActive) {
          return <></>
        }

        return (
          <input
            className="viewer-input viewer-input--page"
            type="number"
            min={1}
            max={256}
            value={state.style.fontSize}
            onChange={(event) => {
              useTextInsertStore.getState().setFontSize(Number(event.target.value))
              onShellChanged()
            }}
            aria-label="Text font size"
          />
        )
      }
    },
    {
      id: 'text-color',
      group: 'text',
      order: 3,
      render: () => {
        const state = useTextInsertStore.getState()
        if (!state.isActive) {
          return <></>
        }

        return (
          <input
            className="viewer-input"
            type="color"
            value={state.style.colorHex}
            onChange={(event) => {
              useTextInsertStore.getState().setColorHex(event.target.value)
              onShellChanged()
            }}
            aria-label="Text color"
          />
        )
      }
    },
    {
      id: 'text-delete-selected',
      group: 'text',
      order: 4,
      render: () => {
        const state = useTextInsertStore.getState()
        if (!state.isActive) {
          return <></>
        }

        return (
          <button
            className="viewer-button"
            type="button"
            disabled={!state.selectedItemId}
            onClick={() => {
              void mode.deleteSelectedItem().then(() => {
                onShellChanged()
              })
            }}
            aria-label="Delete selected inserted text"
            title="Delete selected inserted text"
          >
            Delete Text
          </button>
        )
      }
    },
    {
      id: 'text-move-selected',
      group: 'text',
      order: 5,
      render: () => {
        const state = useTextInsertStore.getState()
        if (!state.isActive) {
          return <></>
        }

        const isMoveMode = Boolean(state.moveTargetItemId)

        return (
          <button
            className="viewer-button"
            type="button"
            disabled={!state.selectedItemId && !isMoveMode}
            onClick={() => {
              if (isMoveMode) {
                mode.cancelMoveSelection()
                onShellChanged()
                return
              }

              mode.requestMoveSelectedItem()
              onShellChanged()
            }}
            aria-label={isMoveMode ? 'Cancel move inserted text' : 'Move selected inserted text'}
            title={
              isMoveMode
                ? 'Click to cancel move mode'
                : 'Click then pick a new location on the page'
            }
          >
            {isMoveMode ? 'Cancel Move' : 'Move Text'}
          </button>
        )
      }
    }
  ]

  items.forEach((item) => {
    const result = shell.addToolbarItem(item)
    void result
  })

  return {
    mode
  }
}
