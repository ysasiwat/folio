/**
 * @file index.d.ts
 * @brief Global Window typings for preload-exposed APIs.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { ElectronAPI } from '@electron-toolkit/preload'

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

declare global {
  interface Window {
    electron: ElectronAPI
    api: FolioApi
  }
}
