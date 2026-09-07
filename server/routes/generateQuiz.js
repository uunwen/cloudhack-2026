const express = require('express')

const generateQuiz = require('../lib/generateQuiz')

const router = express.Router()

router.post('/generate-quiz', async (req, res) => {
  const { sections } = req.body || {}

  if (!Array.isArray(sections) || !sections.length) {
    return res.status(400).json({ error: 'Please provide a non-empty array of sections to quiz on.' })
  }

  try {
    const questions = await generateQuiz(sections)
    res.json(questions)
  } catch (err) {
    console.error('Quiz generation error:', err)
    const status = err.message?.includes('OPENAI_API_KEY') ? 500 : 502
    res.status(status).json({ error: err.message || 'Something went wrong while generating the quiz.' })
  }
})

module.exports = router
