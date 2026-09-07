const test = require('node:test')
const assert = require('node:assert/strict')

const chunkDocument = require('../lib/chunkDocument')
const { MAX_CHUNK_CHARS } = require('../lib/chunkDocument')

function parsedSection(bodyText, overrides = {}) {
  return {
    sectionTitle: 'Photosynthesis',
    bodyText,
    notes: null,
    id: 'pdf-1-12',
    sourceName: 'Biology.pdf',
    sourceType: 'pdf',
    sourceOrdinal: 1,
    ordinal: 12,
    pageNumber: 12,
    ...overrides,
  }
}

test('keeps a small section intact with its provenance', () => {
  const chunks = chunkDocument([parsedSection('Plants convert light energy into chemical energy.')])

  assert.equal(chunks.length, 1)
  assert.equal(chunks[0].text, 'Plants convert light energy into chemical energy.')
  assert.equal(chunks[0].id, 'pdf-1-12-chunk-1')
  assert.equal(chunks[0].sectionId, 'pdf-1-12')
  assert.equal(chunks[0].sourceLabel, 'Biology.pdf — Page 12 — Photosynthesis')
  assert.equal(chunks[0].contentKind, 'untrusted_reference')
})

test('splits a large section into bounded non-empty chunks', () => {
  const paragraph = Array.from({ length: 900 }, (_, index) => `word${index}`).join(' ')
  const chunks = chunkDocument([parsedSection(paragraph)])

  assert.ok(chunks.length > 1)
  assert.ok(chunks.every((chunk) => chunk.text.length > 0))
  assert.ok(chunks.every((chunk) => chunk.text.length <= MAX_CHUNK_CHARS))
  assert.deepEqual(chunks.map((chunk) => chunk.id), chunks.map((_, index) => `pdf-1-12-chunk-${index + 1}`))
})

test('preserves paragraph boundaries when combining paragraphs', () => {
  const first = 'Alpha '.repeat(70).trim()
  const second = 'Beta '.repeat(70).trim()
  const [chunk] = chunkDocument([parsedSection(`${first}\n\n${second}`)])

  assert.equal(chunk.text, `${first}\n\n${second}`)
})

test('avoids empty chunks and deterministic output is stable', () => {
  const sections = [
    parsedSection('   '),
    parsedSection('Useful content.', { id: 'docx-2-1', sourceType: 'docx', sourceOrdinal: 2, ordinal: 1, pageNumber: undefined }),
  ]
  const first = chunkDocument(sections)
  const second = chunkDocument(sections)

  assert.equal(first.length, 1)
  assert.deepEqual(first, second)
  assert.equal(first[0].id, 'docx-2-1-chunk-1')
})

test('preserves slide and heading provenance without inventing page numbers', () => {
  const [chunk] = chunkDocument([
    parsedSection('Gradient descent reduces loss.', {
      id: 'pptx-2-7',
      sourceName: 'Week 4.pptx',
      sourceType: 'pptx',
      sourceOrdinal: 2,
      ordinal: 7,
      pageNumber: undefined,
      slideNumber: 7,
      headingLevel: 2,
      headingPath: ['Machine Learning', 'Neural Networks'],
    }),
  ])

  assert.equal(chunk.slideNumber, 7)
  assert.equal(chunk.pageNumber, undefined)
  assert.equal(chunk.sourceLabel, 'Week 4.pptx — Slide 7 — Machine Learning — Neural Networks')
})

test('source labels do not duplicate multi-file display-title prefixes', () => {
  const [pageChunk] = chunkDocument([
    parsedSection('Page text', { sectionTitle: 'Biology.pdf — Page 12' }),
  ])
  const [slideChunk] = chunkDocument([
    parsedSection('Slide text', {
      id: 'pptx-2-7',
      sourceName: 'Week 4.pptx',
      sourceType: 'pptx',
      sourceOrdinal: 2,
      ordinal: 7,
      pageNumber: undefined,
      slideNumber: 7,
      sectionTitle: 'Week 4.pptx — Neural Networks',
    }),
  ])

  assert.equal(pageChunk.sourceLabel, 'Biology.pdf — Page 12')
  assert.equal(slideChunk.sourceLabel, 'Week 4.pptx — Slide 7 — Neural Networks')
})

test('includes PPTX speaker notes in retrieval text', () => {
  const [chunk] = chunkDocument([
    parsedSection('', {
      id: 'pptx-1-2',
      sourceName: 'Lecture.pptx',
      sourceType: 'pptx',
      ordinal: 2,
      pageNumber: undefined,
      slideNumber: 2,
      notes: 'Remember that backpropagation applies the chain rule.',
    }),
  ])

  assert.match(chunk.text, /Speaker notes:/)
  assert.match(chunk.text, /backpropagation applies the chain rule/)
})
