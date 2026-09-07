const mammoth = require('mammoth')
const cheerio = require('cheerio')

async function parseDocx(buffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  const $ = cheerio.load(html)

  const sections = []
  let current = null

  $('body')
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase()
      const text = $(el).text().trim()
      if (!text) return

      if (/^h[1-6]$/.test(tag)) {
        current = { sectionTitle: text, bodyText: '', notes: null }
        sections.push(current)
        return
      }

      if (!current) {
        current = { sectionTitle: 'Introduction', bodyText: '', notes: null }
        sections.push(current)
      }
      current.bodyText += (current.bodyText ? '\n\n' : '') + text
    })

  const nonEmptySections = sections.filter((s) => s.bodyText.trim().length > 0 || s.sectionTitle)

  if (!nonEmptySections.length) {
    throw new Error("Couldn't find any readable text in this document.")
  }

  return nonEmptySections.map((s) => ({ ...s, bodyText: s.bodyText.trim() }))
}

module.exports = parseDocx
