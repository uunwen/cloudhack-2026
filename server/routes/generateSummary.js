const express = require('express')

const generateSummary = require('../lib/generateSummary')

const router = express.Router()

router.post('/generate-summary', async (req, res) => {
  const { sections } = req.body || {}

  if (!Array.isArray(sections) || !sections.length) {
    return res.status(400).json({ error: 'Please provide a non-empty array of sections to summarize.' })
  }

  try {
    const summary = await generateSummary(sections)
    res.json({ summary })
  } catch (err) {
    console.error('Summary generation error:', err)
    const status = err.message?.includes('OPENAI_API_KEY') ? 500 : 502
    res.status(status).json({ error: err.message || 'Something went wrong while generating the summary.' })
  }
})

module.exports = router
