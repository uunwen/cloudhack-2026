const test = require('node:test')
const assert = require('node:assert/strict')

const resolveDocumentScope = require('../lib/resolveDocumentScope')

function section(overrides) {
  return {
    sectionTitle: 'Untitled',
    bodyText: '',
    notes: null,
    id: 'docx-1-1',
    sourceName: 'Biology Notes.docx',
    sourceType: 'docx',
    sourceOrdinal: 1,
    ordinal: 1,
    ...overrides,
  }
}

const structuredSections = [
  section({ id: 'docx-1-1', ordinal: 1, sectionTitle: 'Introduction', headingLevel: 1, headingPath: ['Introduction'] }),
  section({ id: 'docx-1-2', ordinal: 2, sectionTitle: 'Chapter 2 — Cells', headingLevel: 1, headingPath: ['Chapter 2 — Cells'] }),
  section({ id: 'docx-1-3', ordinal: 3, sectionTitle: 'Chapter 3 — Photosynthesis', headingLevel: 1, headingPath: ['Chapter 3 — Photosynthesis'] }),
  section({ id: 'docx-1-4', ordinal: 4, sectionTitle: '4.2 Neural Networks', headingLevel: 2, headingPath: ['Chapter 3 — Photosynthesis', '4.2 Neural Networks'] }),
  section({ id: 'docx-1-5', ordinal: 5, sectionTitle: 'Chapter 4 — Respiration', headingLevel: 1, headingPath: ['Chapter 4 — Respiration'] }),
  section({ id: 'docx-1-6', ordinal: 6, sectionTitle: 'Conclusion', headingLevel: 1, headingPath: ['Conclusion'] }),
]

test('resolves Arabic and word-form chapters as a source range', () => {
  for (const query of ['Explain chapter 3', 'Explain chapter three']) {
    const result = resolveDocumentScope(query, structuredSections)
    assert.equal(result.status, 'resolved')
    assert.equal(result.type, 'chapter')
    assert.equal(result.value, 3)
    assert.deepEqual(result.matchedSections.map((item) => item.id), ['docx-1-3', 'docx-1-4'])
  }
})

test('resolves simple Roman numeral chapters', () => {
  const sections = [
    section({ id: 'docx-1-1', ordinal: 1, sectionTitle: 'CHAPTER III — Energy' }),
    section({ id: 'docx-1-2', ordinal: 2, sectionTitle: 'Key Concepts' }),
    section({ id: 'docx-1-3', ordinal: 3, sectionTitle: 'CHAPTER IV — Motion' }),
  ]
  const result = resolveDocumentScope('Only use Chapter III', sections)
  assert.equal(result.status, 'resolved')
  assert.equal(result.value, 3)
  assert.deepEqual(result.matchedSections.map((item) => item.id), ['docx-1-1', 'docx-1-2'])
})

test('resolves explicit and standalone numbered sections', () => {
  for (const query of ['What happens in section 4.2?', 'Explain 4.2 Neural Networks']) {
    const result = resolveDocumentScope(query, structuredSections)
    assert.equal(result.status, 'resolved')
    assert.equal(result.type, 'section')
    assert.equal(result.value, '4.2')
    assert.deepEqual(result.matchedSections.map((item) => item.id), ['docx-1-4'])
  }
})

test('resolves pages, slides, and clear heading names', () => {
  const page = section({ id: 'pdf-2-12', sourceName: 'Biology.pdf', sourceType: 'pdf', sourceOrdinal: 2, ordinal: 12, sectionTitle: 'Page 12', pageNumber: 12 })
  const slide = section({ id: 'pptx-3-7', sourceName: 'Week 4.pptx', sourceType: 'pptx', sourceOrdinal: 3, ordinal: 7, sectionTitle: 'Neural Networks', slideNumber: 7 })

  assert.equal(resolveDocumentScope('Explain page 12', [page]).type, 'page')
  assert.equal(resolveDocumentScope('Summarize slide 7', [slide]).type, 'slide')
  assert.equal(resolveDocumentScope('Summarize the Introduction', structuredSections).type, 'heading')
  assert.equal(resolveDocumentScope('What is in the Conclusion?', structuredSections).type, 'heading')
  assert.equal(resolveDocumentScope('Explain the neural networks section simply', structuredSections).type, 'heading')

  const prefixed = structuredSections.map((item) => ({
    ...item,
    sectionTitle: `Biology Notes.docx — ${item.sectionTitle}`,
  }))
  const prefixedResult = resolveDocumentScope('Explain the neural networks section simply', prefixed)
  assert.equal(prefixedResult.type, 'heading')
  assert.equal(prefixedResult.label, '4.2 Neural Networks')
})

test('represents an ambiguous page across documents instead of guessing', () => {
  const sections = [
    section({ id: 'pdf-1-3', sourceName: 'biology.pdf', sourceType: 'pdf', sourceOrdinal: 1, ordinal: 3, sectionTitle: 'Page 3', pageNumber: 3 }),
    section({ id: 'pdf-2-3', sourceName: 'chemistry.pdf', sourceType: 'pdf', sourceOrdinal: 2, ordinal: 3, sectionTitle: 'Page 3', pageNumber: 3 }),
  ]

  const ambiguous = resolveDocumentScope('What does page 3 say?', sections)
  assert.equal(ambiguous.status, 'ambiguous')
  assert.equal(ambiguous.type, 'page')
  assert.equal(ambiguous.matchedSections.length, 0)
  assert.deepEqual(ambiguous.candidates.map((candidate) => candidate.sourceName), ['biology.pdf', 'chemistry.pdf'])

  const qualified = resolveDocumentScope('What does biology.pdf page 3 say?', sections)
  assert.equal(qualified.status, 'resolved')
  assert.equal(qualified.matchedSections[0].sourceName, 'biology.pdf')

  const qualifiedByStem = resolveDocumentScope('What does biology page 3 say?', sections)
  assert.equal(qualifiedByStem.status, 'resolved')
  assert.equal(qualifiedByStem.matchedSections[0].sourceName, 'biology.pdf')
})

test('returns no scope for a general topic query', () => {
  const result = resolveDocumentScope('Why do plants need sunlight?', structuredSections)
  assert.equal(result.status, 'none')
  assert.equal(result.type, null)
  assert.deepEqual(result.matchedSections, [])
})
