/**
 * @file text-insert-command.ts
 * @brief Undoable AppShell command that inserts text into the active PDF through PdfDocument.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { AppCommand, AppCommandContext } from '@renderer/types/appShell'
import type { Result } from '@renderer/types/result'
import { err } from '@renderer/types/result'
import type { PdfDocumentApi, TextInsertCommandInput } from '@renderer/core/PdfDocument'
import {
  type TextInsertCommittedItem,
  type TextInsertSessionSnapshot,
  useTextInsertStore
} from '@renderer/features/text-insert/text-insert-store'

type ApplyDocumentBytes = (bytes: Uint8Array) => Promise<Result<void>>

const normalizeWhitespace = (value: string): string => value.trim()

const cloneSessionSnapshot = (snapshot: TextInsertSessionSnapshot): TextInsertSessionSnapshot => {
  const cloneItem = (item: TextInsertCommittedItem): TextInsertCommittedItem => ({
    ...item,
    style: {
      ...item.style
    }
  })

  return {
    anchorBytes: snapshot.anchorBytes ? snapshot.anchorBytes.slice() : null,
    committedItems: snapshot.committedItems.map(cloneItem),
    selectedItemId: snapshot.selectedItemId,
    nextItemId: snapshot.nextItemId
  }
}

export class TextInsertCommand implements AppCommand {
  public readonly id: string

  public readonly description: string

  private readonly input: TextInsertCommandInput

  private readonly documentApi: PdfDocumentApi

  private readonly applyDocumentBytes: ApplyDocumentBytes

  private readonly nextSessionSnapshot: TextInsertSessionSnapshot | null

  private snapshot: Uint8Array | null = null

  private previousSessionSnapshot: TextInsertSessionSnapshot | null = null

  public constructor(
    input: TextInsertCommandInput,
    documentApi: PdfDocumentApi,
    applyDocumentBytes: ApplyDocumentBytes,
    nextSessionSnapshot: TextInsertSessionSnapshot | null = null
  ) {
    this.input = input
    this.documentApi = documentApi
    this.applyDocumentBytes = applyDocumentBytes
    this.nextSessionSnapshot = nextSessionSnapshot
    this.id = `text-insert-${input.pageIndex}-${Math.round(input.x)}-${Math.round(input.y)}-${Date.now()}`
    this.description = `Insert text on page ${input.pageIndex + 1}`
  }

  public async execute(context: AppCommandContext): Promise<Result<void>> {
    void context

    const text = normalizeWhitespace(this.input.text)
    if (text.length === 0) {
      return err('Text cannot be empty')
    }

    if (this.snapshot === null) {
      const snapshotResult = await this.documentApi.snapshotBytes()
      if (!snapshotResult.ok) {
        return err(snapshotResult.error)
      }

      this.snapshot = snapshotResult.value
    }

    if (this.previousSessionSnapshot === null) {
      this.previousSessionSnapshot = useTextInsertStore.getState().captureSessionSnapshot()
    }

    const insertResult = await this.documentApi.insertText({
      ...this.input,
      text
    })
    if (!insertResult.ok) {
      return err(insertResult.error)
    }

    const nextBytesResult = await this.documentApi.getBytes()
    if (!nextBytesResult.ok) {
      return err(nextBytesResult.error)
    }

    const applyResult = await this.applyDocumentBytes(nextBytesResult.value)
    if (!applyResult.ok) {
      return err(applyResult.error)
    }

    if (this.nextSessionSnapshot) {
      useTextInsertStore.getState().applySessionSnapshot(this.nextSessionSnapshot)
    }

    return applyResult
  }

  public async undo(context: AppCommandContext): Promise<Result<void>> {
    void context

    if (this.snapshot === null) {
      return err('Cannot undo before execute')
    }

    const restoreResult = await this.documentApi.restoreBytes(this.snapshot)
    if (!restoreResult.ok) {
      return err(restoreResult.error)
    }

    const applyResult = await this.applyDocumentBytes(this.snapshot)
    if (!applyResult.ok) {
      return err(applyResult.error)
    }

    if (this.previousSessionSnapshot) {
      useTextInsertStore.getState().applySessionSnapshot(this.previousSessionSnapshot)
    }

    return applyResult
  }
}

export interface TextInsertStateCommandInput {
  id: string
  description: string
  previousBytes: Uint8Array
  nextBytes: Uint8Array
  previousSessionSnapshot: TextInsertSessionSnapshot
  nextSessionSnapshot: TextInsertSessionSnapshot
}

export class TextInsertStateCommand implements AppCommand {
  public readonly id: string

  public readonly description: string

  private readonly previousBytes: Uint8Array

  private readonly nextBytes: Uint8Array

  private readonly previousSessionSnapshot: TextInsertSessionSnapshot

  private readonly nextSessionSnapshot: TextInsertSessionSnapshot

  private readonly applyDocumentBytes: ApplyDocumentBytes

  public constructor(input: TextInsertStateCommandInput, applyDocumentBytes: ApplyDocumentBytes) {
    this.id = input.id
    this.description = input.description
    this.previousBytes = input.previousBytes.slice()
    this.nextBytes = input.nextBytes.slice()
    this.previousSessionSnapshot = cloneSessionSnapshot(input.previousSessionSnapshot)
    this.nextSessionSnapshot = cloneSessionSnapshot(input.nextSessionSnapshot)
    this.applyDocumentBytes = applyDocumentBytes
  }

  public async execute(context: AppCommandContext): Promise<Result<void>> {
    void context

    const applyResult = await this.applyDocumentBytes(this.nextBytes)
    if (!applyResult.ok) {
      return err(applyResult.error)
    }

    useTextInsertStore
      .getState()
      .applySessionSnapshot(cloneSessionSnapshot(this.nextSessionSnapshot))

    return applyResult
  }

  public async undo(context: AppCommandContext): Promise<Result<void>> {
    void context

    const applyResult = await this.applyDocumentBytes(this.previousBytes)
    if (!applyResult.ok) {
      return err(applyResult.error)
    }

    useTextInsertStore
      .getState()
      .applySessionSnapshot(cloneSessionSnapshot(this.previousSessionSnapshot))

    return applyResult
  }
}
