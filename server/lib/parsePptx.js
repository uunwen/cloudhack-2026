const officeParser = require('officeparser')

function collectText(node) {
  if (!node) return ''
  if (typeof node.text === 'string' && node.text.trim()) return node.text.trim()
  if (Array.isArray(node.children)) {
    return node.children.map(collectText).filter(Boolean).join('\n')
  }
  return ''
}

async function parsePptx(buffer) {
  const ast = await officeParser.parseOffice(buffer, { fileType: 'pptx' })
  const slides = ast.content.filter((node) => node.type === 'slide')

  if (!slides.length) {
    throw new Error("Couldn't find any slides in this presentation.")
  }

  return slides.map((slide, i) => {
    const children = slide.children || []
    const firstText = children[0] ? collectText(children[0]) : ''
    const bodyText =
      children.length > 1 ? children.slice(1).map(collectText).filter(Boolean).join('\n') : firstText
    const notesText = slide.notes?.length
      ? slide.notes.map(collectText).filter(Boolean).join('\n')
      : ''

    return {
      sectionTitle: firstText || `Slide ${i + 1}`,
      bodyText,
      notes: notesText || null,
      slideNumber: i + 1,
    }
  })
}

module.exports = parsePptx
