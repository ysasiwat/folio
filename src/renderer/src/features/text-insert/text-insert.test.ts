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
import { AppShell } from '@renderer/core/AppShell'
import { PdfDocument } from '@renderer/core/PdfDocument'

const SAMPLE_SNAPSHOT = new Uint8Array([1, 2, 3])
const SAMPLE_OUTPUT = new Uint8Array([4, 5, 6])

const createDocumentApiMock = (): PdfDocumentApi => ({
  load: vi.fn(async () => ok(undefined)),
  snapshotBytes: vi.fn(async () => ok(SAMPLE_SNAPSHOT)),
  restoreBytes: vi.fn(async () => ok(undefined)),
  insertText: vi.fn(async () => ok(undefined)),
  getBytes: vi.fn(async () => ok(SAMPLE_OUTPUT))
})

interface MockInsertPage {
  getSize: () => { width: number; height: number }
  drawText: ReturnType<typeof vi.fn>
}

interface MockInsertDocument {
  getPageCount: () => number
  getPage: (pageIndex: number) => MockInsertPage
  embedFont: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  registerFontkit: ReturnType<typeof vi.fn>
}

const createPdfDocumentWithMockPage = (
  width: number,
  height: number
): { pdfDocument: PdfDocument; drawText: ReturnType<typeof vi.fn> } => {
  const drawText = vi.fn()
  const page: MockInsertPage = {
    getSize: () => ({ width, height }),
    drawText
  }

  const internalDocument: MockInsertDocument = {
    getPageCount: () => 1,
    getPage: (pageIndex: number) => {
      void pageIndex
      return page
    },
    embedFont: vi.fn(async () => ({ id: 'mock-font' })),
    save: vi.fn(async () => new Uint8Array([9, 9, 9])),
    registerFontkit: vi.fn()
  }

  const pdfDocument = new PdfDocument()
  const mutablePdfDocument = pdfDocument as unknown as {
    document: MockInsertDocument | null
    fontkitRegistered: boolean
  }

  mutablePdfDocument.document = internalDocument
  mutablePdfDocument.fontkitRegistered = true

  return {
    pdfDocument,
    drawText
  }
}

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

  it('execute -> undo -> redo replay insertion through AppShell history', async () => {
    const documentApi = createDocumentApiMock()
    const applyDocumentBytes = vi.fn(async () => ok(undefined))

    const command = new TextInsertCommand(
      {
        pageIndex: 0,
        x: 10,
        y: 20,
        text: 'History replay',
        style: {
          fontFamily: 'Helvetica',
          fontSize: 12,
          colorHex: '#000000'
        }
      },
      documentApi,
      applyDocumentBytes
    )

    const shell = new AppShell({
      getFileName: () => 'sample.pdf',
      getCurrentPage: () => 0,
      getPageCount: () => 1
    })

    const executeResult = await shell.executeCommand(command)
    expect(executeResult.ok).toBe(true)

    const undoResult = await shell.undo()
    expect(undoResult.ok).toBe(true)
    expect(documentApi.restoreBytes).toHaveBeenCalledTimes(1)

    const redoResult = await shell.redo()
    expect(redoResult.ok).toBe(true)
    expect(documentApi.insertText).toHaveBeenCalledTimes(2)
    expect(applyDocumentBytes).toHaveBeenCalledTimes(3)
  })

  it('normalizes insertion point for portrait and landscape pages', async () => {
    const portrait = createPdfDocumentWithMockPage(595, 842)
    const landscape = createPdfDocumentWithMockPage(842, 595)

    const style = {
      fontFamily: 'Helvetica' as const,
      fontSize: 12,
      colorHex: '#000000'
    }

    const portraitInsert = await portrait.pdfDocument.insertText({
      pageIndex: 0,
      x: 800,
      y: -100,
      text: 'portrait',
      style
    })
    expect(portraitInsert.ok).toBe(true)

    const portraitCall = portrait.drawText.mock.calls[0]
    const portraitOptions = portraitCall?.[1] as { x: number; y: number }
    expect(portraitOptions.x).toBe(595)
    expect(portraitOptions.y).toBe(0)

    const landscapeInsert = await landscape.pdfDocument.insertText({
      pageIndex: 0,
      x: -200,
      y: 1000,
      text: 'landscape',
      style
    })
    expect(landscapeInsert.ok).toBe(true)

    const landscapeCall = landscape.drawText.mock.calls[0]
    const landscapeOptions = landscapeCall?.[1] as { x: number; y: number }
    expect(landscapeOptions.x).toBe(0)
    expect(landscapeOptions.y).toBe(595)
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

  it('clicking new location starts a fresh draft without auto-committing old draft', () => {
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
    mode.updateDraftText('First draft')

    mode.onCanvasPointerDown({ pageIndex: 0, x: 50, y: 60, overlayLeft: 70, overlayTop: 80 })

    const nextDraft = useTextInsertStore.getState().draft
    expect(nextDraft).not.toBeNull()
    expect(nextDraft?.text).toBe('')
    expect(nextDraft?.x).toBe(50)
    expect(nextDraft?.y).toBe(60)
    expect(executeCommand).not.toHaveBeenCalled()
  })
})
