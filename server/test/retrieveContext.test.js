const test = require('node:test')
const assert = require('node:assert/strict')

const retrieveContext = require('../lib/retrieveContext')

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

const studySections = [
  section({ id: 'docx-1-1', ordinal: 1, sectionTitle: 'Chapter 3 — Photosynthesis', headingLevel: 1, headingPath: ['Chapter 3 — Photosynthesis'], bodyText: 'Photosynthesis converts sunlight into chemical energy. Chlorophyll absorbs light.' }),
  section({ id: 'docx-1-2', ordinal: 2, sectionTitle: 'Light-dependent reactions', headingLevel: 2, headingPath: ['Chapter 3 — Photosynthesis', 'Light-dependent reactions'], bodyText: 'Light-dependent reactions create ATP and NADPH in the thylakoid membrane.' }),
  section({ id: 'docx-1-3', ordinal: 3, sectionTitle: 'Chapter 4 — Respiration', headingLevel: 1, headingPath: ['Chapter 4 — Respiration'], bodyText: 'Cellular respiration releases energy from glucose in mitochondria.' }),
]

test('explicit chapter scope excludes unrelated sections', () => {
  const result = retrieveContext('Explain Chapter 3', studySections)

  assert.equal(result.scope.status, 'resolved')
  assert.equal(result.scope.type, 'chapter')
  assert.deepEqual(result.chunks.map((chunk) => chunk.sectionId), ['docx-1-1', 'docx-1-2'])
  assert.ok(result.chunks.every((chunk) => !chunk.text.includes('mitochondria')))
})

test('scoped topic query selects cited chunks inside the chapter', () => {
  const result = retrieveContext('What does Chapter 3 say about chlorophyll?', studySections)

  assert.equal(result.scope.type, 'chapter')
  assert.ok(result.chunks.some((chunk) => chunk.text.includes('Chlorophyll')))
  assert.ok(result.chunks.every((chunk) => chunk.sourceName === 'Biology Notes.docx'))
  assert.ok(result.chunks.every((chunk) => chunk.contentKind === 'untrusted_reference'))
  assert.ok(result.chunks.every((chunk) => chunk.sourceLabel.includes('Chapter 3 — Photosynthesis')))
})

test('page scope returns only the requested page with provenance', () => {
  const pages = [
    section({ id: 'pdf-1-11', sourceName: 'Biology.pdf', sourceType: 'pdf', ordinal: 11, sectionTitle: 'Page 11', pageNumber: 11, bodyText: 'Previous topic.' }),
    section({ id: 'pdf-1-12', sourceName: 'Biology.pdf', sourceType: 'pdf', ordinal: 12, sectionTitle: 'Page 12', pageNumber: 12, bodyText: 'The Calvin cycle fixes carbon dioxide.' }),
  ]
  const result = retrieveContext('Explain page 12', pages)

  assert.equal(result.scope.type, 'page')
  assert.equal(result.chunks.length, 1)
  assert.equal(result.chunks[0].pageNumber, 12)
  assert.match(result.chunks[0].sourceLabel, /Biology\.pdf — Page 12/)
})

test('general topic terms rank relevant text and title terms receive a boost', () => {
  const sections = [
    section({ id: 'text-1-1', sourceName: 'Pasted text', sourceType: 'text', ordinal: 1, sectionTitle: 'Overview', bodyText: 'Neural networks are mentioned once.' }),
    section({ id: 'text-1-2', sourceName: 'Pasted text', sourceType: 'text', ordinal: 2, sectionTitle: 'Neural Networks', bodyText: 'Layers learn representations from training examples.' }),
    section({ id: 'text-1-3', sourceName: 'Pasted text', sourceType: 'text', ordinal: 3, sectionTitle: 'Databases', bodyText: 'Relational tables store records.' }),
  ]
  const result = retrieveContext('How do neural networks learn?', sections)

  assert.equal(result.scope.status, 'resolved', 'the clear heading is resolved before ranking')
  assert.equal(result.chunks[0].sectionId, 'text-1-2')
  assert.ok(result.chunks[0].score > 0)
})

test('general topic retrieval works without a structural scope', () => {
  const result = retrieveContext('Why is chlorophyll important?', studySections)

  assert.equal(result.scope.status, 'none')
  assert.equal(result.chunks[0].sectionId, 'docx-1-1')
  assert.match(result.chunks[0].text, /Chlorophyll/)
})

test('an unrelated general query produces no retrieval evidence', () => {
  const result = retrieveContext('Describe medieval architecture', studySections)
  assert.equal(result.scope.status, 'none')
  assert.deepEqual(result.chunks, [])
})

test('ambiguous multi-document page scope returns candidates and no chunks', () => {
  const pages = [
    section({ id: 'pdf-1-3', sourceName: 'biology.pdf', sourceType: 'pdf', sourceOrdinal: 1, ordinal: 3, sectionTitle: 'Page 3', pageNumber: 3, bodyText: 'Cells.' }),
    section({ id: 'pdf-2-3', sourceName: 'chemistry.pdf', sourceType: 'pdf', sourceOrdinal: 2, ordinal: 3, sectionTitle: 'Page 3', pageNumber: 3, bodyText: 'Atoms.' }),
  ]
  const result = retrieveContext('What does page 3 say?', pages)

  assert.equal(result.scope.status, 'ambiguous')
  assert.deepEqual(result.chunks, [])
  assert.deepEqual(result.scope.candidates.map((candidate) => candidate.sourceName), ['biology.pdf', 'chemistry.pdf'])
})

test('retrieval preserves multiple-document provenance and is deterministic', () => {
  const sections = [
    section({ id: 'pdf-1-1', sourceName: 'biology.pdf', sourceType: 'pdf', sourceOrdinal: 1, ordinal: 1, sectionTitle: 'Page 1', pageNumber: 1, bodyText: 'Photosynthesis uses chlorophyll.' }),
    section({ id: 'pdf-2-1', sourceName: 'chemistry.pdf', sourceType: 'pdf', sourceOrdinal: 2, ordinal: 1, sectionTitle: 'Page 1', pageNumber: 1, bodyText: 'Chlorophyll contains magnesium.' }),
  ]
  const first = retrieveContext('chlorophyll', sections)
  const second = retrieveContext('chlorophyll', sections)

  assert.deepEqual(first, second)
  assert.deepEqual(new Set(first.chunks.map((chunk) => chunk.sourceName)), new Set(['biology.pdf', 'chemistry.pdf']))
  assert.notEqual(first.chunks[0].sectionId, first.chunks[1].sectionId)
})

test('retrieval can find terms that exist only in PPTX speaker notes', () => {
  const sections = [
    section({
      id: 'pptx-1-1',
      sourceName: 'Lecture.pptx',
      sourceType: 'pptx',
      sectionTitle: 'Training',
      bodyText: 'Model optimization.',
      notes: 'Backpropagation uses the chain rule to update weights.',
      slideNumber: 1,
    }),
  ]
  const result = retrieveContext('How does backpropagation work?', sections)

  assert.equal(result.chunks.length, 1)
  assert.match(result.chunks[0].text, /chain rule/)
  assert.equal(result.chunks[0].slideNumber, 1)
})
