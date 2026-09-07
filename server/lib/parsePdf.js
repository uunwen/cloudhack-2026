const path = require('path')
const { pathToFileURL } = require('url')
const { createCanvas, ImageData, DOMMatrix, Path2D } = require('@napi-rs/canvas')
const { extractTextFromImage } = require('./openaiClient')
const { createTextPdfSections, createVisionPdfMetadata } = require('./createPdfSections')

// pdfjs-dist's Node rendering path assumes these browser globals exist; @napi-rs/canvas
// ships compatible implementations we can hand it before rendering any page.
globalThis.ImageData ??= ImageData
globalThis.DOMMatrix ??= DOMMatrix
globalThis.Path2D ??= Path2D

const MAX_VISION_PAGES = 20
const MIN_AVG_CHARS_PER_PAGE = 20

let pdfjsLibPromise = null
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs')
  }
  return pdfjsLibPromise
}

const standardFontDataUrl = pathToFileURL(
  path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/'),
).href

// pdfjs-dist's built-in NodeCanvasFactory needs a Node API (process.getBuiltinModule) that
// doesn't exist before Node 20.16 -- this factory swaps in @napi-rs/canvas instead, which
// works on any Node 10+ since it ships prebuilt native binaries.
class NapiCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height)
    return { canvas, context: canvas.getContext('2d') }
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width
    canvasAndContext.canvas.height = height
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0
    canvasAndContext.canvas.height = 0
    canvasAndContext.canvas = null
    canvasAndContext.context = null
  }
}

async function getPageText(page) {
  const content = await page.getTextContent()
  let text = ''
  for (const item of content.items) {
    if (typeof item.str !== 'string' || !item.str) continue
    text += item.str
    text += item.hasEOL ? '\n' : ' '
  }
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function renderPageToPngBuffer(page) {
  const viewport = page.getViewport({ scale: 2.0 })
  const canvas = createCanvas(viewport.width, viewport.height)
  const context = canvas.getContext('2d')
  await page.render({ canvasContext: context, viewport, canvasFactory: new NapiCanvasFactory() }).promise
  return canvas.toBuffer('image/png')
}

async function parsePdf(buffer) {
  const pdfjsLib = await loadPdfjs()
  const pdfDocument = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl,
    CanvasFactory: NapiCanvasFactory,
  }).promise

  const pageTexts = []
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber)
    pageTexts.push({ pageNumber, text: await getPageText(page) })
  }

  const fullText = pageTexts.map((page) => page.text).join('\n\n').trim()
  const avgCharsPerPage = fullText.length / pdfDocument.numPages

  if (avgCharsPerPage >= MIN_AVG_CHARS_PER_PAGE) {
    return createTextPdfSections(pageTexts, pdfDocument.numPages)
  }

  // Near-empty text layer -- likely a scanned PDF. Render pages to images and use vision.
  const pageCount = Math.min(pdfDocument.numPages, MAX_VISION_PAGES)
  const metadata = createVisionPdfMetadata(pdfDocument.numPages, pageCount)
  const sections = []
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber)
    const pngBuffer = await renderPageToPngBuffer(page)
    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
    const extracted = await extractTextFromImage(
      dataUrl,
      'This is a scanned document page. Transcribe its readable content as plain text.',
    )
    sections.push({
      sectionTitle: `Page ${pageNumber}`,
      bodyText: extracted || '(No readable content found on this page.)',
      notes: null,
      pageNumber,
      metadata,
    })
  }

  if (!sections.length) {
    throw new Error("Couldn't extract any content from this scanned PDF.")
  }

  return sections
}

module.exports = parsePdf
