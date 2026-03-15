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
  bytes: Uint8Array
}

interface FolioApi {
  file: {
    open: () => Promise<Result<OpenPdfSuccess>>
  }
}

// Custom APIs for renderer
const api: FolioApi = {
  file: {
    open: async (): Promise<Result<OpenPdfSuccess>> => {
      return ipcRenderer.invoke('file:open') as Promise<Result<OpenPdfSuccess>>
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
