/**
 * @file PdfDocument.ts
 * @brief Wrapper around pdf-lib for loading, mutating, snapshotting, and restoring PDF bytes.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { err, ok, type Result } from '@renderer/types/result'

const UNICODE_FONT_PATH = '/fonts/Sarabun-Regular.ttf'

let cachedUnicodeFontBytes: ArrayBuffer | null = null

const loadUnicodeFontBytes = async (): Promise<ArrayBuffer> => {
  if (cachedUnicodeFontBytes) {
    return cachedUnicodeFontBytes
  }

  const response = await fetch(UNICODE_FONT_PATH)
  if (!response.ok) {
    throw new Error(`Failed to load Unicode font: ${response.status}`)
  }

  cachedUnicodeFontBytes = await response.arrayBuffer()
  return cachedUnicodeFontBytes
}

const hasNonLatinChars = (text: string): boolean => /[^\x20-\x7E\r\n\t]/.test(text)

export type TextInsertFontFamily = 'Helvetica' | 'Times-Roman' | 'Courier' | 'Sarabun'

export interface TextInsertStyle {
  fontFamily: TextInsertFontFamily
  fontSize: number
  colorHex: string
}

export interface TextInsertCommandInput {
  pageIndex: number
  x: number
  y: number
  text: string
  style: TextInsertStyle
}

export interface PdfDocumentApi {
  load: (bytes: Uint8Array) => Promise<Result<void>>
  snapshotBytes: () => Promise<Result<Uint8Array>>
  restoreBytes: (bytes: Uint8Array) => Promise<Result<void>>
  insertText: (input: TextInsertCommandInput) => Promise<Result<void>>
  getBytes: () => Promise<Result<Uint8Array>>
}

const normalizeUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unexpected PDF processing error'
}

const normalizeHexColor = (value: string): Result<{ r: number; g: number; b: number }> => {
  const normalized = value.trim()
  const withoutHash = normalized.startsWith('#') ? normalized.slice(1) : normalized

  if (!/^[0-9A-Fa-f]{6}$/.test(withoutHash)) {
    return err('Color must be a 6-digit hex value, e.g. #000000')
  }

  const red = Number.parseInt(withoutHash.slice(0, 2), 16)
  const green = Number.parseInt(withoutHash.slice(2, 4), 16)
  const blue = Number.parseInt(withoutHash.slice(4, 6), 16)

  return ok({
    r: red / 255,
    g: green / 255,
    b: blue / 255
  })
}

const clampToRange = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

const toStandardFont = (fontFamily: Exclude<TextInsertFontFamily, 'Sarabun'>): StandardFonts => {
  if (fontFamily === 'Times-Roman') {
    return StandardFonts.TimesRoman
  }

  if (fontFamily === 'Courier') {
    return StandardFonts.Courier
  }

  return StandardFonts.Helvetica
}

export class PdfDocument implements PdfDocumentApi {
  private document: PDFDocument | null = null

  private fontkitRegistered = false

  private ensureFontkitRegistered(): void {
    if (!this.document || this.fontkitRegistered) {
      return
    }

    this.document.registerFontkit(fontkit)
    this.fontkitRegistered = true
  }

  public async load(bytes: Uint8Array): Promise<Result<void>> {
    try {
      this.document = await PDFDocument.load(bytes)
      this.fontkitRegistered = false
      return ok(undefined)
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }

  public async snapshotBytes(): Promise<Result<Uint8Array>> {
    return this.getBytes()
  }

  public async restoreBytes(bytes: Uint8Array): Promise<Result<void>> {
    return this.load(bytes)
  }

  public async insertText(input: TextInsertCommandInput): Promise<Result<void>> {
    if (!this.document) {
      return err('No PDF loaded')
    }

    if (!Number.isFinite(input.pageIndex) || input.pageIndex < 0) {
      return err('Invalid page index')
    }

    const pageCount = this.document.getPageCount()
    if (input.pageIndex >= pageCount) {
      return err('Page index out of range')
    }

    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
      return err('Invalid text position')
    }

    if (!Number.isFinite(input.style.fontSize) || input.style.fontSize <= 0) {
      return err('Font size must be greater than zero')
    }

    const text = input.text
    if (text.length === 0) {
      return err('Text cannot be empty')
    }

    const colorResult = normalizeHexColor(input.style.colorHex)
    if (!colorResult.ok) {
      return err(colorResult.error)
    }

    try {
      const page = this.document.getPage(input.pageIndex)
      const pageSize = page.getSize()

      const normalizedX = clampToRange(input.x, 0, pageSize.width)
      const normalizedY = clampToRange(input.y, 0, pageSize.height)

      let font
      const shouldUseUnicodeFont =
        input.style.fontFamily === 'Sarabun' || hasNonLatinChars(input.text)

      if (shouldUseUnicodeFont) {
        this.ensureFontkitRegistered()
        const fontBytes = await loadUnicodeFontBytes()
        font = await this.document.embedFont(fontBytes, { subset: true })
      } else {
        const standardFontFamily: Exclude<TextInsertFontFamily, 'Sarabun'> =
          input.style.fontFamily === 'Times-Roman' || input.style.fontFamily === 'Courier'
            ? input.style.fontFamily
            : 'Helvetica'

        font = await this.document.embedFont(toStandardFont(standardFontFamily))
      }

      page.drawText(text, {
        x: normalizedX,
        y: normalizedY,
        size: input.style.fontSize,
        font,
        color: rgb(colorResult.value.r, colorResult.value.g, colorResult.value.b)
      })

      return ok(undefined)
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }

  public async getBytes(): Promise<Result<Uint8Array>> {
    if (!this.document) {
      return err('No PDF loaded')
    }

    try {
      const bytes = await this.document.save()
      return ok(bytes)
    } catch (error: unknown) {
      return err(normalizeUnknownError(error))
    }
  }
}
