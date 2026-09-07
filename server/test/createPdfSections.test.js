const test = require('node:test')
const assert = require('node:assert/strict')

const { createTextPdfSections, createVisionPdfMetadata } = require('../lib/createPdfSections')

test('text PDF pages remain independently identifiable', () => {
  const sections = createTextPdfSections(
    [
      { pageNumber: 1, text: 'First page' },
      { pageNumber: 2, text: '' },
      { pageNumber: 3, text: 'Third page' },
    ],
    3,
  )

  assert.deepEqual(sections.map((section) => section.sectionTitle), ['Page 1', 'Page 3'])
  assert.deepEqual(sections.map((section) => section.pageNumber), [1, 3])
  assert.ok(sections.every((section) => section.metadata.extractionMethod === 'text'))
  assert.ok(sections.every((section) => section.metadata.totalPages === 3))
  assert.ok(sections.every((section) => section.metadata.truncated === false))
})

test('scanned PDF metadata explicitly reports truncation', () => {
  const metadata = createVisionPdfMetadata(25, 20)

  assert.equal(metadata.extractionMethod, 'vision')
  assert.equal(metadata.totalPages, 25)
  assert.equal(metadata.parsedPages, 20)
  assert.equal(metadata.truncated, true)
  assert.equal(metadata.warning, 'Only the first 20 of 25 scanned PDF pages were processed.')
})

test('complete scanned PDF metadata does not invent a warning', () => {
  const metadata = createVisionPdfMetadata(10, 10)
  assert.equal(metadata.truncated, false)
  assert.equal(metadata.warning, undefined)
})
