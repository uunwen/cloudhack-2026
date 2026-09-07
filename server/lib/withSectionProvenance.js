const VALID_SOURCE_TYPES = new Set(['pdf', 'docx', 'pptx', 'image', 'text'])

function withSectionProvenance(sections, { sourceName, sourceType, sourceOrdinal }) {
  if (!Array.isArray(sections)) {
    throw new TypeError('Expected parser output to be an array of sections.')
  }
  if (typeof sourceName !== 'string' || !sourceName.trim()) {
    throw new TypeError('A non-empty sourceName is required.')
  }
  if (!VALID_SOURCE_TYPES.has(sourceType)) {
    throw new TypeError(`Unsupported sourceType: ${sourceType}`)
  }
  if (!Number.isInteger(sourceOrdinal) || sourceOrdinal < 1) {
    throw new TypeError('sourceOrdinal must be a positive integer.')
  }

  return sections.map((section, index) => {
    const ordinal = index + 1
    return {
      ...section,
      id: `${sourceType}-${sourceOrdinal}-${ordinal}`,
      sourceName: sourceName.trim(),
      sourceType,
      sourceOrdinal,
      ordinal,
    }
  })
}

module.exports = withSectionProvenance
