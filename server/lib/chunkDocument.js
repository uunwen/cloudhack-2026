const TARGET_CHUNK_CHARS = 1200
const MAX_CHUNK_CHARS = 1800
const MIN_CHUNK_CHARS = 300

function splitLongParagraph(paragraph) {
  if (paragraph.length <= MAX_CHUNK_CHARS) return [paragraph]

  const words = paragraph.split(/\s+/).filter(Boolean)
  const parts = []
  let current = ''

  function pushCurrent() {
    if (current) parts.push(current)
    current = ''
  }

  for (const word of words) {
    if (word.length > MAX_CHUNK_CHARS) {
      pushCurrent()
      for (let offset = 0; offset < word.length; offset += MAX_CHUNK_CHARS) {
        parts.push(word.slice(offset, offset + MAX_CHUNK_CHARS))
      }
      continue
    }

    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > TARGET_CHUNK_CHARS && current.length >= MIN_CHUNK_CHARS) {
      pushCurrent()
      current = word
    } else if (candidate.length > MAX_CHUNK_CHARS) {
      pushCurrent()
      current = word
    } else {
      current = candidate
    }
  }
  pushCurrent()
  return parts
}

function paragraphsFromText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/[ \t]+\n/g, '\n').trim())
    .filter(Boolean)
    .flatMap(splitLongParagraph)
}

function combineParagraphs(paragraphs) {
  const chunks = []
  let current = ''

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (current && candidate.length > MAX_CHUNK_CHARS) {
      chunks.push(current)
      current = paragraph
      continue
    }

    if (current && current.length >= TARGET_CHUNK_CHARS && paragraph.length >= MIN_CHUNK_CHARS) {
      chunks.push(current)
      current = paragraph
      continue
    }

    current = candidate
  }

  if (current) chunks.push(current)

  if (chunks.length > 1 && chunks.at(-1).length < MIN_CHUNK_CHARS) {
    const merged = `${chunks.at(-2)}\n\n${chunks.at(-1)}`
    if (merged.length <= MAX_CHUNK_CHARS) {
      chunks.splice(-2, 2, merged)
    }
  }

  return chunks
}

function formatSourceLabel(section) {
  const parts = []
  if (section.sourceName) parts.push(section.sourceName)
  if (section.pageNumber != null) parts.push(`Page ${section.pageNumber}`)
  else if (section.slideNumber != null) parts.push(`Slide ${section.slideNumber}`)

  const structuralTitles = Array.isArray(section.headingPath) && section.headingPath.length
    ? section.headingPath
    : [section.sectionTitle]
  const sourcePrefix = section.sourceName ? `${section.sourceName} — ` : ''

  for (let structuralTitle of structuralTitles) {
    if (sourcePrefix && structuralTitle?.startsWith(sourcePrefix)) {
      structuralTitle = structuralTitle.slice(sourcePrefix.length)
    }
    if (
      structuralTitle &&
      !new RegExp(`^(page|slide)\\s+${section.pageNumber ?? section.slideNumber ?? ''}$`, 'i').test(structuralTitle) &&
      !parts.includes(structuralTitle)
    ) {
      parts.push(structuralTitle)
    }
  }
  return parts.join(' — ')
}

function chunkDocument(sections) {
  if (!Array.isArray(sections)) throw new TypeError('sections must be an array.')

  const chunks = []
  sections.forEach((section, sectionIndex) => {
    const sectionId = section.id || `legacy-section-${sectionIndex + 1}`
    const retrievalText = section.notes
      ? `${section.bodyText || ''}\n\nSpeaker notes:\n${section.notes}`.trim()
      : section.bodyText
    const texts = combineParagraphs(paragraphsFromText(retrievalText))

    texts.forEach((text, chunkIndex) => {
      chunks.push({
        id: `${sectionId}-chunk-${chunkIndex + 1}`,
        text,
        sectionId,
        sectionTitle: section.sectionTitle,
        sourceName: section.sourceName,
        sourceType: section.sourceType,
        sourceOrdinal: section.sourceOrdinal,
        ordinal: section.ordinal,
        pageNumber: section.pageNumber,
        slideNumber: section.slideNumber,
        headingLevel: section.headingLevel,
        headingPath: section.headingPath,
        metadata: section.metadata,
        sourceLabel: formatSourceLabel(section),
        contentKind: 'untrusted_reference',
      })
    })
  })
  return chunks
}

module.exports = chunkDocument
module.exports.TARGET_CHUNK_CHARS = TARGET_CHUNK_CHARS
module.exports.MAX_CHUNK_CHARS = MAX_CHUNK_CHARS
module.exports.MIN_CHUNK_CHARS = MIN_CHUNK_CHARS
module.exports.formatSourceLabel = formatSourceLabel
