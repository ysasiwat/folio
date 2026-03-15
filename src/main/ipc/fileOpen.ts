/**
 * @file fileOpen.ts
 * @brief Handles the file:open IPC channel for selecting and reading PDF files.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { dialog, type BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

export const FILE_OPEN_CANCELLED = 'FILE_OPEN_CANCELLED'

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const err = <E = string>(error: E): Result<never, E> => ({ ok: false, error })

export interface OpenPdfSuccess {
  filePath: string
  fileName: string
  bytes: number[]
}

const normalizeUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Failed to open PDF file'
}

export const handleFileOpen = async (
  browserWindow: BrowserWindow | null
): Promise<Result<OpenPdfSuccess>> => {
  try {
    const selection = browserWindow
      ? await dialog.showOpenDialog(browserWindow, {
          title: 'Open PDF',
          properties: ['openFile'],
          filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
        })
      : await dialog.showOpenDialog({
          title: 'Open PDF',
          properties: ['openFile'],
          filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
        })

    if (selection.canceled || selection.filePaths.length === 0) {
      return err(FILE_OPEN_CANCELLED)
    }

    const [filePath] = selection.filePaths
    const bytes = await readFile(filePath)

    return ok({
      filePath,
      fileName: basename(filePath),
      bytes: Array.from(bytes)
    })
  } catch (error: unknown) {
    return err(normalizeUnknownError(error))
  }
}
