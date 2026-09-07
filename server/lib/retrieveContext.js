const chunkDocument = require('./chunkDocument')
const resolveDocumentScope = require('./resolveDocumentScope')
const { normalizeText } = require('./resolveDocumentScope')

const DEFAULT_MAX_RESULTS = 6
const MAX_SMALL_SCOPE_CHUNKS = 8

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'chapter', 'does', 'explain', 'for', 'from',
  'happens', 'in', 'is', 'it', 'just', 'me', 'my', 'notes', 'of', 'on', 'only', 'page', 'say',
  'section', 'simply', 'slide', 'summarize', 'tell', 'the', 'this', 'to', 'use', 'what', 'where',
])

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !/^\d+$/.test(token) && !STOP_WORDS.has(token))
}

function termFrequency(tokens) {
  const frequencies = new Map()
  for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1)
  return frequencies
}

function scoreChunk(chunk, queryTerms) {
  if (!queryTerms.length) return 0

  const textFrequency = termFrequency(tokenize(chunk.text))
  const titleFrequency = termFrequency(tokenize(chunk.sectionTitle))
  const headingFrequency = termFrequency(tokenize((chunk.headingPath || []).join(' ')))
  let score = 0
  let matchedTerms = 0

  for (const term of queryTerms) {
    const textCount = textFrequency.get(term) || 0
    const titleCount = titleFrequency.get(term) || 0
    const headingCount = headingFrequency.get(term) || 0
    if (textCount || titleCount || headingCount) matchedTerms++
    score += Math.min(textCount, 3)
    if (titleCount) score += 4
    if (headingCount) score += 3
  }

  const phrase = queryTerms.join(' ')
  const haystack = normalizeText(`${chunk.sectionTitle} ${(chunk.headingPath || []).join(' ')} ${chunk.text}`)
  if (queryTerms.length > 1 && haystack.includes(phrase)) score += 6
  score += (matchedTerms / queryTerms.length) * 2
  return Number(score.toFixed(3))
}

function compareRanked(a, b) {
  return (
    b.score - a.score ||
    (a.chunk.sourceOrdinal || 0) - (b.chunk.sourceOrdinal || 0) ||
    (a.chunk.ordinal || 0) - (b.chunk.ordinal || 0) ||
    a.chunk.id.localeCompare(b.chunk.id)
  )
}

function retrieveContext(query, sections, options = {}) {
  if (typeof query !== 'string' || !query.trim()) throw new TypeError('query must be a non-empty string.')
  if (!Array.isArray(sections)) throw new TypeError('sections must be an array.')

  const scope = resolveDocumentScope(query, sections)
  const queryTerms = [...new Set(tokenize(query))]

  if (scope.status === 'ambiguous') {
    return {
      contentKind: 'untrusted_reference',
      scope,
      queryTerms,
      chunks: [],
    }
  }

  const candidateSections = scope.status === 'resolved' ? scope.matchedSections : sections
  const chunks = chunkDocument(candidateSections)
  const maxResults = Number.isInteger(options.maxResults) && options.maxResults > 0
    ? options.maxResults
    : DEFAULT_MAX_RESULTS

  if (scope.status === 'resolved' && chunks.length <= MAX_SMALL_SCOPE_CHUNKS) {
    return {
      contentKind: 'untrusted_reference',
      scope,
      queryTerms,
      chunks: chunks.map((chunk) => ({ ...chunk, score: scoreChunk(chunk, queryTerms) })),
    }
  }

  if (scope.status === 'resolved' && !queryTerms.length) {
    return {
      contentKind: 'untrusted_reference',
      scope,
      queryTerms,
      chunks: chunks.slice(0, maxResults).map((chunk) => ({ ...chunk, score: 0 })),
    }
  }

  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTerms) }))
    .filter((entry) => entry.score > 0)
    .sort(compareRanked)
    .slice(0, maxResults)
    .map(({ chunk, score }) => ({ ...chunk, score }))

  if (!ranked.length && options.allowUnscoredFallback === true) {
    return {
      contentKind: 'untrusted_reference',
      scope,
      queryTerms,
      chunks: chunks.slice(0, maxResults).map((chunk) => ({ ...chunk, score: 0 })),
    }
  }

  return {
    contentKind: 'untrusted_reference',
    scope,
    queryTerms,
    chunks: ranked,
  }
}

module.exports = retrieveContext
module.exports.tokenize = tokenize
module.exports.scoreChunk = scoreChunk
