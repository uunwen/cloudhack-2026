const NUMBER_WORDS = new Map([
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fourteen', 14],
  ['fifteen', 15],
  ['sixteen', 16],
  ['seventeen', 17],
  ['eighteen', 18],
  ['nineteen', 19],
  ['twenty', 20],
])

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function romanToInteger(value) {
  const roman = String(value || '').toUpperCase()
  if (!/^(?=[IVXLCDM]+$)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(roman)) {
    return null
  }

  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  let total = 0
  for (let i = 0; i < roman.length; i++) {
    const current = values[roman[i]]
    const next = values[roman[i + 1]] || 0
    total += current < next ? -current : current
  }
  return total || null
}

function parseChapterNumber(value) {
  const normalized = normalizeText(value)
  if (/^\d+$/.test(normalized)) return Number(normalized)
  if (NUMBER_WORDS.has(normalized)) return NUMBER_WORDS.get(normalized)
  return romanToInteger(normalized)
}

function sourceKey(section) {
  return `${section.sourceType || 'unknown'}:${section.sourceOrdinal || 0}:${section.sourceName || ''}`
}

function sourceLabel(section) {
  return section.sourceName || `Source ${section.sourceOrdinal || 1}`
}

function searchablePrefix(section) {
  const headingPath = Array.isArray(section.headingPath) ? section.headingPath.join(' ') : ''
  return `${headingPath}\n${section.sectionTitle || ''}\n${String(section.bodyText || '').slice(0, 320)}`
}

function extractChapterNumber(section) {
  const match = searchablePrefix(section).match(
    /\bchapter\s+([0-9]+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/i,
  )
  return match ? parseChapterNumber(match[1]) : null
}

function sectionHasNumber(section, number) {
  const escaped = number.replace(/\./g, '\\.')
  const pattern = new RegExp(`(?:^|[^0-9])${escaped}(?=[^0-9.]|$)`)
  const labels = [section.sectionTitle, ...(Array.isArray(section.headingPath) ? section.headingPath : [])]
  if (labels.some((label) => pattern.test(String(label || '')))) return true
  return pattern.test(String(section.bodyText || '').slice(0, 180))
}

function groupBySource(sections) {
  const groups = new Map()
  for (const section of sections) {
    const key = sourceKey(section)
    if (!groups.has(key)) {
      groups.set(key, {
        sourceKey: key,
        sourceName: sourceLabel(section),
        sourceOrdinal: section.sourceOrdinal,
        sections: [],
      })
    }
    groups.get(key).sections.push(section)
  }
  return [...groups.values()]
}

function filterGroupsBySourceMention(query, groups) {
  const normalizedQuery = normalizeText(query)
  const mentioned = groups.filter((group) => {
    const full = normalizeText(group.sourceName)
    const stem = full.replace(/\.(pdf|docx|pptx|png|jpg|jpeg)$/, '')
    return (full.length >= 4 && normalizedQuery.includes(full)) || (stem.length >= 4 && normalizedQuery.includes(stem))
  })
  return mentioned.length ? mentioned : groups
}

function resultFromGroups(type, value, label, confidence, query, groups) {
  const filteredGroups = filterGroupsBySourceMention(query, groups)
  const candidates = filteredGroups.map((group) => ({
    sourceName: group.sourceName,
    sourceOrdinal: group.sourceOrdinal,
    label,
    sectionIds: group.sections.map((section) => section.id).filter(Boolean),
  }))

  if (filteredGroups.length === 1) {
    return {
      status: 'resolved',
      type,
      value,
      label,
      confidence,
      matchedSections: filteredGroups[0].sections,
      candidates,
    }
  }

  return {
    status: 'ambiguous',
    type,
    value,
    label,
    confidence,
    matchedSections: [],
    candidates,
  }
}

function matchPageOrSlide(query, sections, type) {
  const match = query.match(new RegExp(`\\b${type}\\s+(\\d+)\\b`, 'i'))
  if (!match) return null
  const value = Number(match[1])
  const field = type === 'page' ? 'pageNumber' : 'slideNumber'
  const titlePattern = new RegExp(`^${type}\\s+${value}$`, 'i')
  const matches = sections.filter(
    (section) => section[field] === value || (section[field] == null && titlePattern.test(section.sectionTitle || '')),
  )
  if (!matches.length) return null
  return resultFromGroups(type, value, `${type[0].toUpperCase()}${type.slice(1)} ${value}`, 'high', query, groupBySource(matches))
}

function matchNumberedSection(query, sections) {
  const explicit = query.match(/\bsection\s+(\d+(?:\.\d+)*)\b/i)
  const implicit = query.match(/\b(\d+\.\d+(?:\.\d+)*)\b/)
  const number = explicit?.[1] || implicit?.[1]
  if (!number) return null
  const matches = sections.filter((section) => sectionHasNumber(section, number))
  if (!matches.length) return null
  return resultFromGroups('section', number, `Section ${number}`, 'high', query, groupBySource(matches))
}

function chapterRangeForSource(sourceSections, chapterNumber) {
  const ordered = [...sourceSections].sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0))
  const start = ordered.findIndex((section) => extractChapterNumber(section) === chapterNumber)
  if (start < 0) return []

  const matched = []
  for (let i = start; i < ordered.length; i++) {
    const foundChapter = extractChapterNumber(ordered[i])
    if (i > start && foundChapter != null && foundChapter !== chapterNumber) break
    matched.push(ordered[i])
  }
  return matched
}

function matchChapter(query, sections) {
  const match = query.match(
    /\bchapter\s+([0-9]+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/i,
  )
  if (!match) return null
  const value = parseChapterNumber(match[1])
  if (value == null) return null

  const groups = groupBySource(sections)
    .map((group) => ({ ...group, sections: chapterRangeForSource(group.sections, value) }))
    .filter((group) => group.sections.length)
  if (!groups.length) return null
  return resultFromGroups('chapter', value, `Chapter ${value}`, 'high', query, groups)
}

function matchingHeadingLabel(query, section) {
  const normalizedQuery = normalizeText(query)
  const labels = [
    ...(Array.isArray(section.headingPath) ? [...section.headingPath].reverse() : []),
    section.sectionTitle,
  ]

  for (const label of labels) {
    const title = normalizeText(label)
    if (!title || /^(page|slide|section) \d+(?:\.\d+)*$/.test(title)) continue
    const plainTitle = title
      .replace(/^\d+(?:\.\d+)*\s+/, '')
      .replace(/^chapter\s+(?:\d+|[ivxlcdm]+)\s+/, '')
      .trim()
    const matches = [title, plainTitle].some(
      (candidate) => candidate && (normalizedQuery === candidate || (candidate.length >= 4 && normalizedQuery.includes(candidate))),
    )
    if (matches) return label
  }
  return null
}

function matchHeading(query, sections) {
  const matchesWithLabels = sections
    .map((section) => ({ section, label: matchingHeadingLabel(query, section) }))
    .filter((match) => match.label)
  if (!matchesWithLabels.length) return null

  const labels = [...new Set(matchesWithLabels.map((match) => match.label))]
  if (labels.length > 1) return null
  return resultFromGroups(
    'heading',
    labels[0],
    labels[0],
    'medium',
    query,
    groupBySource(matchesWithLabels.map((match) => match.section)),
  )
}

function resolveDocumentScope(query, sections) {
  if (typeof query !== 'string' || !query.trim() || !Array.isArray(sections) || !sections.length) {
    return {
      status: 'none',
      type: null,
      value: null,
      label: null,
      confidence: 'none',
      matchedSections: [],
      candidates: [],
    }
  }

  return (
    matchPageOrSlide(query, sections, 'page') ||
    matchPageOrSlide(query, sections, 'slide') ||
    matchNumberedSection(query, sections) ||
    matchChapter(query, sections) ||
    matchHeading(query, sections) || {
      status: 'none',
      type: null,
      value: null,
      label: null,
      confidence: 'none',
      matchedSections: [],
      candidates: [],
    }
  )
}

module.exports = resolveDocumentScope
module.exports.normalizeText = normalizeText
module.exports.parseChapterNumber = parseChapterNumber
