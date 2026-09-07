function parseText(text) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) {
    throw new Error('No text provided.')
  }

  return blocks.map((block, i) => ({
    sectionTitle: `Section ${i + 1}`,
    bodyText: block,
    notes: null,
  }))
}

module.exports = parseText
