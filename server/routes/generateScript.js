const express = require('express')

const generateScript = require('../lib/generateScript')
const { VALID_GENRES } = require('../lib/genrePrompts')

const router = express.Router()

router.post('/generate-script', async (req, res) => {
  const { sections, genre } = req.body || {}

  if (!Array.isArray(sections) || !sections.length) {
    return res.status(400).json({ error: 'Please provide a non-empty array of sections to work from.' })
  }

  if (!genre || !VALID_GENRES.includes(genre)) {
    return res.status(400).json({
      error: `Please provide a valid genre. Expected one of: ${VALID_GENRES.join(', ')}.`,
    })
  }

  try {
    const script = await generateScript(sections, genre)
    res.json(script)
  } catch (err) {
    console.error('Script generation error:', err)
    const status = err.message?.includes('OPENAI_API_KEY') ? 500 : 502
    res.status(status).json({ error: err.message || 'Something went wrong while generating the script.' })
  }
})

module.exports = router
