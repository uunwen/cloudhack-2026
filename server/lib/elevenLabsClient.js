const TTS_URL = (voiceId) => `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`

function getElevenLabsApiKey() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured on the server.')
  }
  return process.env.ELEVENLABS_API_KEY
}

async function synthesizeSpeech(text, voiceId) {
  const apiKey = getElevenLabsApiKey()

  const response = await fetch(TTS_URL(voiceId), {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`ElevenLabs request failed (${response.status}): ${body.slice(0, 200)}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

module.exports = { getElevenLabsApiKey, synthesizeSpeech }
