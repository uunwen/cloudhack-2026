const express = require('express')

const generateAudio = require('../lib/generateAudio')

const router = express.Router()

function isValidLine(line) {
  return (
    line &&
    typeof line === 'object' &&
    (line.speaker === 'A' || line.speaker === 'B') &&
    typeof line.text === 'string' &&
    line.text.trim().length > 0
  )
}

router.post('/generate-audio', async (req, res) => {
  const { script } = req.body || {}

  if (!Array.isArray(script) || !script.length || !script.every(isValidLine)) {
    return res.status(400).json({
      error: 'Please provide a non-empty array of { speaker: "A" | "B", text } lines.',
    })
  }

  try {
    const scriptWithAudio = await generateAudio(script)
    res.json(scriptWithAudio)
  } catch (err) {
    console.error('Audio generation error:', err)
    const status = err.message?.includes('ELEVENLABS_API_KEY') ? 500 : 502
    res.status(status).json({ error: err.message || 'Something went wrong while generating audio.' })
  }
})

module.exports = router
