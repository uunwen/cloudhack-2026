const express = require('express')

const generateChatSpeech = require('../lib/generateChatSpeech')

const router = express.Router()

router.post('/chat-speech', async (req, res) => {
  const { text } = req.body || {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Please provide non-empty text to synthesize.' })
  }
  if (text.length > 4000) {
    return res.status(400).json({ error: 'Text is too long to synthesize (4000 characters max).' })
  }

  try {
    const audioUrl = await generateChatSpeech(text.trim())
    res.json({ audioUrl })
  } catch (err) {
    console.error('Chat speech generation error:', err)
    const status = err.message?.includes('ELEVENLABS_API_KEY') ? 500 : 502
    res.status(status).json({ error: err.message || 'Something went wrong while generating audio.' })
  }
})

module.exports = router
