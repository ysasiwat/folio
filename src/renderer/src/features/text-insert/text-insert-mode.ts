/**
 * @file text-insert-mode.ts
 * @brief Text-insert canvas mode controller for draft lifecycle and command execution.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { PdfDocumentApi, TextInsertCommandInput } from '@renderer/core/PdfDocument'
import {
  TextInsertCommand,
  TextInsertStateCommand,
  type TextInsertStateCommandInput
} from '@renderer/features/text-insert/text-insert-command'
import {
  useTextInsertStore,
  type TextInsertCommittedItem,
  type TextInsertDraft,
  type TextInsertPoint
} from '@renderer/features/text-insert/text-insert-store'
import type { PdfOverlayPoint } from '@renderer/types/pdfViewer'
import { err, ok, type Result } from '@renderer/types/result'
import type { AppCommand } from '@renderer/types/appShell'

export interface TextInsertShellApi {
  executeCommand: (command: AppCommand) => Promise<Result<void>>
}

export interface TextInsertModeDeps {
  shell: TextInsertShellApi
  documentApi: PdfDocumentApi
  applyDocumentBytes: (bytes: Uint8Array) => Promise<Result<void>>
}

const cloneCommittedItems = (items: TextInsertCommittedItem[]): TextInsertCommittedItem[] =>
  items.map((item) => ({
    ...item,
    style: {
      ...item.style
    }
  }))

export class TextInsertMode {
  private readonly shell: TextInsertShellApi

  private readonly documentApi: PdfDocumentApi

  private readonly applyDocumentBytes: (bytes: Uint8Array) => Promise<Result<void>>

  public constructor(deps: TextInsertModeDeps) {
    this.shell = deps.shell
    this.documentApi = deps.documentApi
    this.applyDocumentBytes = deps.applyDocumentBytes
  }

  public async activate(): Promise<void> {
    const store = useTextInsertStore.getState()
    store.activate()

    if (store.anchorBytes) {
      return
    }

    const snapshotResult = await this.documentApi.snapshotBytes()
    if (!snapshotResult.ok) {
      return
    }

    store.setAnchorBytes(snapshotResult.value)
  }

  public deactivate(): void {
    useTextInsertStore.getState().deactivate()
  }

  public onCanvasPointerDown(point: PdfOverlayPoint): void {
    const store = useTextInsertStore.getState()
    if (!store.isActive) {
      return
    }

    if (store.moveTargetItemId) {
      void this.moveSelectedItemTo(point)
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

  public selectCommittedItem(itemId: string | null): void {
    useTextInsertStore.getState().selectCommittedItem(itemId)
  }

  public beginEditCommittedItem(itemId: string, overlayLeft: number, overlayTop: number): void {
    useTextInsertStore.getState().beginDraftFromCommittedItem(itemId, overlayLeft, overlayTop)
  }

  public requestMoveSelectedItem(): void {
    const store = useTextInsertStore.getState()
    if (!store.selectedItemId) {
      return
    }

    store.setMoveTargetItem(store.selectedItemId)
  }

  public cancelMoveSelection(): void {
    useTextInsertStore.getState().setMoveTargetItem(null)
  }

  public async deleteSelectedItem(): Promise<void> {
    const store = useTextInsertStore.getState()
    if (!store.selectedItemId) {
      return
    }

    const selectedItemId = store.selectedItemId

    await this.rebuildCommittedItems(
      (items) => items.filter((item) => item.id !== selectedItemId),
      null,
      'Delete inserted text'
    )
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
    const store = useTextInsertStore.getState()

    if (draftToCommit.sourceItemId) {
      if (text.length === 0) {
        await this.rebuildCommittedItems(
          (items) => items.filter((item) => item.id !== draftToCommit.sourceItemId),
          null,
          'Delete inserted text'
        )
        return
      }

      await this.rebuildCommittedItems(
        (items) =>
          items.map((item) =>
            item.id === draftToCommit.sourceItemId
              ? {
                  ...item,
                  pageIndex: draftToCommit.pageIndex,
                  x: draftToCommit.x,
                  y: draftToCommit.y,
                  text,
                  style: {
                    ...draftToCommit.style
                  }
                }
              : item
          ),
        draftToCommit.sourceItemId,
        'Edit inserted text'
      )
      return
    }

    if (text.length === 0) {
      return
    }

    const nextItem = store.appendCommittedItem({
      pageIndex: draftToCommit.pageIndex,
      x: draftToCommit.x,
      y: draftToCommit.y,
      text,
      style: {
        ...draftToCommit.style
      }
    })

    const nextSnapshot = store.captureSessionSnapshot()
    nextSnapshot.selectedItemId = nextItem.id

    const commandInput: TextInsertCommandInput = {
      pageIndex: nextItem.pageIndex,
      x: nextItem.x,
      y: nextItem.y,
      text: nextItem.text,
      style: {
        ...nextItem.style
      }
    }

    const command = new TextInsertCommand(
      commandInput,
      this.documentApi,
      this.applyDocumentBytes,
      nextSnapshot
    )

    const executeResult = await this.shell.executeCommand(command)
    if (!executeResult.ok) {
      return
    }
  }

  private async moveSelectedItemTo(point: PdfOverlayPoint): Promise<void> {
    const store = useTextInsertStore.getState()
    const moveItemId = store.moveTargetItemId
    if (!moveItemId) {
      return
    }

    await this.rebuildCommittedItems(
      (items) =>
        items.map((item) =>
          item.id === moveItemId
            ? {
                ...item,
                pageIndex: point.pageIndex,
                x: point.x,
                y: point.y
              }
            : item
        ),
      moveItemId,
      'Move inserted text'
    )
  }

  private async rebuildCommittedItems(
    transform: (items: TextInsertCommittedItem[]) => TextInsertCommittedItem[],
    selectedItemId: string | null,
    description: string
  ): Promise<void> {
    const store = useTextInsertStore.getState()
    const anchorBytes = store.anchorBytes
    if (!anchorBytes) {
      return
    }

    const previousSnapshot = store.captureSessionSnapshot()
    const previousItems = cloneCommittedItems(previousSnapshot.committedItems)
    const nextItems = transform(previousItems)

    const previousBytesResult = await this.generateBytesFromItems(anchorBytes, previousItems)
    if (!previousBytesResult.ok) {
      return
    }

    const nextBytesResult = await this.generateBytesFromItems(anchorBytes, nextItems)
    if (!nextBytesResult.ok) {
      return
    }

    const nextSnapshot = store.captureSessionSnapshot()
    nextSnapshot.committedItems = cloneCommittedItems(nextItems)
    nextSnapshot.selectedItemId = selectedItemId

    const commandInput: TextInsertStateCommandInput = {
      id: `text-insert-state-${Date.now()}`,
      description,
      previousBytes: previousBytesResult.value,
      nextBytes: nextBytesResult.value,
      previousSessionSnapshot: previousSnapshot,
      nextSessionSnapshot: nextSnapshot
    }

    const command = new TextInsertStateCommand(commandInput, this.applyDocumentBytes)
    const executeResult = await this.shell.executeCommand(command)
    if (!executeResult.ok) {
      return
    }

    useTextInsertStore.getState().setMoveTargetItem(null)
  }

  private async generateBytesFromItems(
    anchorBytes: Uint8Array,
    items: TextInsertCommittedItem[]
  ): Promise<Result<Uint8Array>> {
    const restoreResult = await this.documentApi.restoreBytes(anchorBytes)
    if (!restoreResult.ok) {
      return err(restoreResult.error)
    }

    for (const item of items) {
      const insertResult = await this.documentApi.insertText({
        pageIndex: item.pageIndex,
        x: item.x,
        y: item.y,
        text: item.text,
        style: {
          ...item.style
        }
      })

      if (!insertResult.ok) {
        return err(insertResult.error)
      }
    }

    const bytesResult = await this.documentApi.getBytes()
    if (!bytesResult.ok) {
      return err(bytesResult.error)
    }

    return ok(bytesResult.value)
  }
}
