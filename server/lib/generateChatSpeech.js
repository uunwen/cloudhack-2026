const { synthesizeSpeech } = require('./elevenLabsClient')

// A single neutral assistant voice, distinct from the two podcast hosts (Jessica/Chris in generateAudio.js).
const CHAT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel

async function generateChatSpeech(text) {
  const buffer = await synthesizeSpeech(text, CHAT_VOICE_ID)
  return `data:audio/mpeg;base64,${buffer.toString('base64')}`
}

module.exports = generateChatSpeech
module.exports.CHAT_VOICE_ID = CHAT_VOICE_ID
