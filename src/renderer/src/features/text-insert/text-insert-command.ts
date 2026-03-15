/**
 * @file text-insert-command.ts
 * @brief Undoable AppShell command that inserts text into the active PDF through PdfDocument.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import type { AppCommand, AppCommandContext } from '@renderer/types/appShell'
import type { Result } from '@renderer/types/result'
import { err } from '@renderer/types/result'
import type { PdfDocumentApi, TextInsertCommandInput } from '@renderer/core/PdfDocument'

type ApplyDocumentBytes = (bytes: Uint8Array) => Promise<Result<void>>

const normalizeWhitespace = (value: string): string => value.trim()

export class TextInsertCommand implements AppCommand {
  public readonly id: string

  public readonly description: string

  private readonly input: TextInsertCommandInput

  private readonly documentApi: PdfDocumentApi

  private readonly applyDocumentBytes: ApplyDocumentBytes

  private snapshot: Uint8Array | null = null

  public constructor(
    input: TextInsertCommandInput,
    documentApi: PdfDocumentApi,
    applyDocumentBytes: ApplyDocumentBytes
  ) {
    this.input = input
    this.documentApi = documentApi
    this.applyDocumentBytes = applyDocumentBytes
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

    return this.applyDocumentBytes(nextBytesResult.value)
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

    return this.applyDocumentBytes(this.snapshot)
  }
}
