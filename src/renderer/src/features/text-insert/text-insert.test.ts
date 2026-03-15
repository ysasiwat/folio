/**
 * @file text-insert.test.ts
 * @brief Unit tests for text-insert command execution/undo and mode confirm/cancel behavior.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PdfDocumentApi } from '@renderer/core/PdfDocument'
import type { AppCommand } from '@renderer/types/appShell'
import { ok } from '@renderer/types/result'
import { TextInsertCommand } from '@renderer/features/text-insert/text-insert-command'
import { TextInsertMode } from '@renderer/features/text-insert/text-insert-mode'
import { useTextInsertStore } from '@renderer/features/text-insert/text-insert-store'

const SAMPLE_SNAPSHOT = new Uint8Array([1, 2, 3])
const SAMPLE_OUTPUT = new Uint8Array([4, 5, 6])

const createDocumentApiMock = (): PdfDocumentApi => ({
  load: vi.fn(async () => ok(undefined)),
  snapshotBytes: vi.fn(async () => ok(SAMPLE_SNAPSHOT)),
  restoreBytes: vi.fn(async () => ok(undefined)),
  insertText: vi.fn(async () => ok(undefined)),
  getBytes: vi.fn(async () => ok(SAMPLE_OUTPUT))
})

describe('TextInsertCommand', () => {
  it('execute success updates bytes and undo restores snapshot bytes', async () => {
    const documentApi = createDocumentApiMock()
    const applyDocumentBytes = vi.fn(async () => ok(undefined))

    const command = new TextInsertCommand(
      {
        pageIndex: 0,
        x: 10,
        y: 20,
        text: 'Hello',
        style: {
          fontFamily: 'Helvetica',
          fontSize: 12,
          colorHex: '#000000'
        }
      },
      documentApi,
      applyDocumentBytes
    )

    const executeResult = await command.execute({
      fileName: 'sample.pdf',
      currentPage: 0,
      pageCount: 1
    })

    expect(executeResult.ok).toBe(true)
    expect(documentApi.snapshotBytes).toHaveBeenCalledTimes(1)
    expect(documentApi.insertText).toHaveBeenCalledTimes(1)
    expect(documentApi.getBytes).toHaveBeenCalledTimes(1)
    expect(applyDocumentBytes).toHaveBeenCalledWith(SAMPLE_OUTPUT)

    const undoResult = await command.undo({ fileName: 'sample.pdf', currentPage: 0, pageCount: 1 })

    expect(undoResult.ok).toBe(true)
    expect(documentApi.restoreBytes).toHaveBeenCalledWith(SAMPLE_SNAPSHOT)
    expect(applyDocumentBytes).toHaveBeenLastCalledWith(SAMPLE_SNAPSHOT)
  })

  it('empty text does not commit', async () => {
    const documentApi = createDocumentApiMock()
    const applyDocumentBytes = vi.fn(async () => ok(undefined))

    const command = new TextInsertCommand(
      {
        pageIndex: 0,
        x: 10,
        y: 20,
        text: '   ',
        style: {
          fontFamily: 'Helvetica',
          fontSize: 12,
          colorHex: '#000000'
        }
      },
      documentApi,
      applyDocumentBytes
    )

    const executeResult = await command.execute({ fileName: null, currentPage: 0, pageCount: 1 })

    expect(executeResult.ok).toBe(false)
    expect(documentApi.insertText).not.toHaveBeenCalled()
    expect(applyDocumentBytes).not.toHaveBeenCalled()
  })
})

describe('TextInsertMode', () => {
  beforeEach(() => {
    useTextInsertStore.setState({
      isActive: false,
      isEditing: false,
      draft: null,
      style: {
        fontFamily: 'Helvetica',
        fontSize: 12,
        colorHex: '#000000'
      }
    })
  })

  it('confirm behavior executes shell command when draft has text', async () => {
    const documentApi = createDocumentApiMock()
    const applyDocumentBytes = vi.fn(async () => ok(undefined))
    const executeCommand = vi.fn(async (command: AppCommand) => {
      void command
      return ok(undefined)
    })

    const mode = new TextInsertMode({
      shell: { executeCommand },
      documentApi,
      applyDocumentBytes
    })

    mode.activate()
    mode.onCanvasPointerDown({ pageIndex: 0, x: 12, y: 34, overlayLeft: 56, overlayTop: 78 })
    mode.updateDraftText('Draft text')

    await mode.confirmCurrentDraft()

    expect(executeCommand).toHaveBeenCalledTimes(1)
    expect(useTextInsertStore.getState().draft).toBeNull()
  })

  it('cancel behavior clears draft without command execution', () => {
    const documentApi = createDocumentApiMock()
    const applyDocumentBytes = vi.fn(async () => ok(undefined))
    const executeCommand = vi.fn(async (command: AppCommand) => {
      void command
      return ok(undefined)
    })

    const mode = new TextInsertMode({
      shell: { executeCommand },
      documentApi,
      applyDocumentBytes
    })

    mode.activate()
    mode.onCanvasPointerDown({ pageIndex: 0, x: 10, y: 20, overlayLeft: 30, overlayTop: 40 })
    mode.updateDraftText('Will cancel')

    mode.cancelCurrentDraft()

    expect(useTextInsertStore.getState().draft).toBeNull()
    expect(executeCommand).not.toHaveBeenCalled()
  })
})
