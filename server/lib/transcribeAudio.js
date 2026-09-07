const { toFile } = require('openai')
const { getOpenAIClient } = require('./openaiClient')

async function transcribeAudio(buffer, filename, mimetype) {
  const openai = getOpenAIClient()
  const file = await toFile(buffer, filename, { type: mimetype })
  const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' })
  return transcription.text?.trim() || ''
}

module.exports = transcribeAudio
