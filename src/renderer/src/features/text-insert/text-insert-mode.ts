/**
 * @file text-insert-mode.ts
 * @brief Text-insert canvas mode controller for draft lifecycle and command execution.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { PdfDocumentApi, TextInsertCommandInput } from '@renderer/core/PdfDocument'
import { TextInsertCommand } from '@renderer/features/text-insert/text-insert-command'
import {
  useTextInsertStore,
  type TextInsertDraft,
  type TextInsertPoint
} from '@renderer/features/text-insert/text-insert-store'
import type { PdfOverlayPoint } from '@renderer/types/pdfViewer'
import type { Result } from '@renderer/types/result'
import type { AppCommand } from '@renderer/types/appShell'

export interface TextInsertShellApi {
  executeCommand: (command: AppCommand) => Promise<Result<void>>
}

export interface TextInsertModeDeps {
  shell: TextInsertShellApi
  documentApi: PdfDocumentApi
  applyDocumentBytes: (bytes: Uint8Array) => Promise<Result<void>>
}

export class TextInsertMode {
  private readonly shell: TextInsertShellApi

  private readonly documentApi: PdfDocumentApi

  private readonly applyDocumentBytes: (bytes: Uint8Array) => Promise<Result<void>>

  public constructor(deps: TextInsertModeDeps) {
    this.shell = deps.shell
    this.documentApi = deps.documentApi
    this.applyDocumentBytes = deps.applyDocumentBytes
  }

  public activate(): void {
    useTextInsertStore.getState().activate()
  }

  public deactivate(): void {
    useTextInsertStore.getState().deactivate()
  }

  public onCanvasPointerDown(point: PdfOverlayPoint): void {
    const store = useTextInsertStore.getState()
    if (!store.isActive) {
      return
    }

    const draftPoint: TextInsertPoint = {
      pageIndex: point.pageIndex,
      x: point.x,
      y: point.y,
      overlayLeft: point.overlayLeft,
      overlayTop: point.overlayTop
    }

    store.beginDraft(draftPoint)
  }

  public updateDraftText(text: string): void {
    useTextInsertStore.getState().updateDraftText(text)
  }

  public async confirmCurrentDraft(): Promise<void> {
    const store = useTextInsertStore.getState()
    if (!store.draft) {
      return
    }

    await this.confirmDraft(store.draft)
  }

  public async confirmDraftIfCurrent(expectedDraft: TextInsertDraft): Promise<void> {
    const store = useTextInsertStore.getState()
    if (store.draft !== expectedDraft) {
      return
    }

    await this.confirmDraft(expectedDraft)
  }

  public cancelCurrentDraft(): void {
    useTextInsertStore.getState().cancelDraft()
  }

  private async confirmDraft(draft: TextInsertDraft): Promise<void> {
    const finalizedDraft = useTextInsertStore.getState().confirmDraft()
    const draftToCommit = finalizedDraft ?? draft
    const text = draftToCommit.text.trim()

    if (text.length === 0) {
      return
    }

    const commandInput: TextInsertCommandInput = {
      pageIndex: draftToCommit.pageIndex,
      x: draftToCommit.x,
      y: draftToCommit.y,
      text,
      style: draftToCommit.style
    }

    const command = new TextInsertCommand(commandInput, this.documentApi, this.applyDocumentBytes)
    const executeResult = await this.shell.executeCommand(command)
    if (!executeResult.ok) {
      return
    }
  }
}
