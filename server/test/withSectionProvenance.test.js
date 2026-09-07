const test = require('node:test')
const assert = require('node:assert/strict')

const withSectionProvenance = require('../lib/withSectionProvenance')

test('adds deterministic source and section provenance without changing required fields', () => {
  const input = [
    { sectionTitle: 'Page 1', bodyText: 'Alpha', notes: null, pageNumber: 1 },
    { sectionTitle: 'Page 2', bodyText: 'Beta', notes: null, pageNumber: 2 },
  ]

  const result = withSectionProvenance(input, {
    sourceName: 'biology.pdf',
    sourceType: 'pdf',
    sourceOrdinal: 1,
  })

  assert.deepEqual(result.map((section) => section.id), ['pdf-1-1', 'pdf-1-2'])
  assert.deepEqual(result.map((section) => section.ordinal), [1, 2])
  assert.equal(result[0].sourceName, 'biology.pdf')
  assert.equal(result[0].sourceType, 'pdf')
  assert.equal(result[0].pageNumber, 1)
  assert.deepEqual(
    result.map(({ sectionTitle, bodyText, notes }) => ({ sectionTitle, bodyText, notes })),
    input.map(({ sectionTitle, bodyText, notes }) => ({ sectionTitle, bodyText, notes })),
  )
  assert.equal(input[0].id, undefined, 'input sections are not mutated')
})

test('source ordinals distinguish duplicate filenames in one parse result', () => {
  const section = [{ sectionTitle: 'Page 3', bodyText: 'Content', notes: null, pageNumber: 3 }]
  const first = withSectionProvenance(section, {
    sourceName: 'notes.pdf',
    sourceType: 'pdf',
    sourceOrdinal: 1,
  })
  const second = withSectionProvenance(section, {
    sourceName: 'notes.pdf',
    sourceType: 'pdf',
    sourceOrdinal: 2,
  })

  assert.equal(first[0].id, 'pdf-1-1')
  assert.equal(second[0].id, 'pdf-2-1')
  assert.notEqual(first[0].id, second[0].id)
})

test('preserves format-specific metadata', () => {
  const [section] = withSectionProvenance(
    [
      {
        sectionTitle: 'Chapter 3',
        bodyText: 'Cells',
        notes: null,
        headingLevel: 1,
        headingPath: ['Chapter 3'],
        metadata: { truncated: true, warning: 'Partial source' },
      },
    ],
    { sourceName: 'lecture.docx', sourceType: 'docx', sourceOrdinal: 3 },
  )

  assert.equal(section.headingLevel, 1)
  assert.deepEqual(section.headingPath, ['Chapter 3'])
  assert.deepEqual(section.metadata, { truncated: true, warning: 'Partial source' })
})

test('rejects invalid provenance options', () => {
  assert.throws(
    () => withSectionProvenance([], { sourceName: '', sourceType: 'pdf', sourceOrdinal: 1 }),
    /sourceName/,
  )
  assert.throws(
    () => withSectionProvenance([], { sourceName: 'x', sourceType: 'video', sourceOrdinal: 1 }),
    /sourceType/,
  )
})
