const { extractTextFromImage } = require('./openaiClient')

async function parseImage(buffer, mimetype) {
  const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`
  const text = await extractTextFromImage(
    dataUrl,
    'Extract the key content and any visible text from this image. Respond with plain, well-organized text only.',
  )

  if (!text) {
    throw new Error('Could not extract any content from this image.')
  }

  return [{ sectionTitle: 'Image', bodyText: text, notes: null }]
}

module.exports = parseImage
