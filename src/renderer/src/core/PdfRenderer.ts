/**
 * @file PdfRenderer.ts
 * @brief Wrapper around pdfjs-dist for loading and rendering PDF pages to canvas.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type {
  GetPageSizeInput,
  PdfOutlineItem,
  PdfRendererApi,
  PdfLoadInfo,
  PdfTextMatchBox,
  RenderPageInput,
  SearchPageTextInput
} from '@renderer/types/pdfViewer'
import { err, ok, type Result } from '@renderer/types/result'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type PdfOutlineNode = NonNullable<Awaited<ReturnType<PDFDocumentProxy['getOutline']>>>[number]
type PdfPageRef = Parameters<PDFDocumentProxy['getPageIndex']>[0]

const normalizeUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Failed to render PDF page'
}

const isPdfPageRef = (value: unknown): value is PdfPageRef => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return 'num' in value && 'gen' in value
}

export class PdfRenderer implements PdfRendererApi {
  private document: PDFDocumentProxy | null = null

  private renderTasks = new Map<number, RenderTask>()

  private renderGeneration = 0

  public async load(bytes: Uint8Array): Promise<Result<PdfLoadInfo>> {
    this.disposeDocument()

    try {
      const loadingTask = getDocument({ data: bytes })
      const document = await loadingTask.promise
      this.document = document
      this.renderGeneration += 1

      return ok({ pageCount: document.numPages })
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }

  public async getPageSize(
    input: GetPageSizeInput
  ): Promise<Result<{ width: number; height: number }>> {
    if (!this.document) {
      return err('No PDF loaded')
    }

    try {
      const pageNumber = input.pageIndex + 1
      const page = await this.document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: input.scale ?? 1 })

      return ok({
        width: viewport.width,
        height: viewport.height
      })
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }

  public async searchPageText(input: SearchPageTextInput): Promise<Result<PdfTextMatchBox[]>> {
    if (!this.document) {
      return err('No PDF loaded')
    }

    const query = input.query.trim().toLowerCase()
    if (!query) {
      return ok([])
    }

    try {
      const pageNumber = input.pageIndex + 1
      const page = await this.document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: input.scale })
      const textContent = await page.getTextContent()
      const boxes: PdfTextMatchBox[] = []

      for (const item of textContent.items) {
        if (!('str' in item)) {
          continue
        }

        const textItem = item as {
          str: string
          height: number
          transform: number[]
        }
        const sourceText = textItem.str
        const lowerText = sourceText.toLowerCase()

        if (!lowerText.includes(query) || sourceText.length === 0) {
          continue
        }

        const transform = viewport.transform
        const textTransform =
          typeof DOMMatrix !== 'undefined'
            ? new DOMMatrix(transform).multiply(new DOMMatrix(textItem.transform))
            : null

        if (!textTransform) {
          continue
        }

        const fullWidth = Math.abs(textTransform.a)
        const fullHeight = Math.max(Math.abs(textTransform.d), textItem.height * input.scale)
        const unitWidth = fullWidth / sourceText.length

        let searchIndex = 0
        while (searchIndex < lowerText.length) {
          const matchIndex = lowerText.indexOf(query, searchIndex)
          if (matchIndex < 0) {
            break
          }

          const x = textTransform.e + unitWidth * matchIndex
          const width = unitWidth * query.length
          const y = textTransform.f - fullHeight

          boxes.push({
            x,
            y,
            width,
            height: fullHeight
          })

          searchIndex = matchIndex + Math.max(query.length, 1)
        }
      }

      return ok(boxes)
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }

  public async getOutline(): Promise<Result<PdfOutlineItem[]>> {
    if (!this.document) {
      return err('No PDF loaded')
    }

    const convertOutline = async (items: PdfOutlineNode[]): Promise<PdfOutlineItem[]> => {
      const result: PdfOutlineItem[] = []

      for (let index = 0; index < items.length; index += 1) {
        const source = items[index]
        const pageIndex = await this.resolveOutlinePageIndex(source.dest ?? null)
        const children = await convertOutline(source.items ?? [])

        result.push({
          id: `${source.title}-${index}-${pageIndex ?? 'none'}`,
          title: source.title || 'Untitled',
          pageIndex,
          children
        })
      }

      return result
    }

    try {
      const outline = await this.document.getOutline()
      if (!outline || outline.length === 0) {
        return ok([])
      }

      const tree = await convertOutline(outline)
      return ok(tree)
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }

  public async renderPage(input: RenderPageInput): Promise<Result<void>> {
    if (!this.document) {
      return err('No PDF loaded')
    }

    const pageNumber = input.pageIndex + 1
    const generation = this.renderGeneration

    this.cancelRenderTask(input.pageIndex)

    try {
      const page = await this.document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: input.scale })
      const context = input.canvas.getContext('2d')

      if (!context) {
        return err('Unable to get canvas 2D context')
      }

      input.canvas.width = Math.floor(viewport.width)
      input.canvas.height = Math.floor(viewport.height)

      const task = page.render({
        canvasContext: context,
        viewport
      })

      this.renderTasks.set(input.pageIndex, task)

      await task.promise

      if (generation !== this.renderGeneration) {
        return err('Render aborted due to newer request')
      }

      this.renderTasks.delete(input.pageIndex)
      return ok(undefined)
    } catch (error: unknown) {
      this.renderTasks.delete(input.pageIndex)
      const message = normalizeUnknownError(error)

      if (message.includes('Rendering cancelled')) {
        return err('Render aborted due to newer request')
      }

      return err(message)
    }
  }

  public dispose(): void {
    this.renderGeneration += 1
    this.cancelAllRenderTasks()
    this.disposeDocument()
  }

  private disposeDocument(): void {
    if (this.document) {
      this.document.destroy()
      this.document = null
    }
  }

  private cancelRenderTask(pageIndex: number): void {
    const task = this.renderTasks.get(pageIndex)
    if (task) {
      task.cancel()
      this.renderTasks.delete(pageIndex)
    }
  }

  private cancelAllRenderTasks(): void {
    for (const task of this.renderTasks.values()) {
      task.cancel()
    }
    this.renderTasks.clear()
  }

  private async resolveOutlinePageIndex(
    destination: string | Array<unknown> | null
  ): Promise<number | null> {
    if (!this.document || destination === null) {
      return null
    }

    try {
      const explicitDestination =
        typeof destination === 'string'
          ? await this.document.getDestination(destination)
          : destination

      if (!explicitDestination || explicitDestination.length === 0) {
        return null
      }

      const refCandidate = explicitDestination[0]
      if (typeof refCandidate === 'number' && Number.isFinite(refCandidate)) {
        return refCandidate
      }

      if (!isPdfPageRef(refCandidate)) {
        return null
      }

      const pageIndex = await this.document.getPageIndex(refCandidate)
      return Number.isFinite(pageIndex) ? pageIndex : null
    } catch {
      return null
    }
  }
}
