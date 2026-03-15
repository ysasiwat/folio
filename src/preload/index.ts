/**
 * @file index.ts
 * @brief Secure preload bridge exposing typed IPC APIs to renderer.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { contextBridge } from 'electron'
import { ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

interface OpenPdfSuccess {
  filePath: string
  fileName: string
  bytes: number[]
}

interface OpenPdfSuccessRenderer {
  filePath: string
  fileName: string
  bytes: Uint8Array
}

interface FolioApi {
  file: {
    open: () => Promise<Result<OpenPdfSuccessRenderer>>
  }
}

const toRendererResult = (result: Result<OpenPdfSuccess>): Result<OpenPdfSuccessRenderer> => {
  if (!result.ok) {
    return result
  }

  return {
    ok: true,
    value: {
      filePath: result.value.filePath,
      fileName: result.value.fileName,
      bytes: new Uint8Array(result.value.bytes)
    }
  }
}

// Custom APIs for renderer
const api: FolioApi = {
  file: {
    open: async (): Promise<Result<OpenPdfSuccessRenderer>> => {
      const result = (await ipcRenderer.invoke('file:open')) as Result<OpenPdfSuccess>
      return toRendererResult(result)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
