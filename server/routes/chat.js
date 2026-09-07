const express = require('express')

const { ChatRequestError, createChatResponse } = require('../lib/chat')

const router = express.Router()

router.post('/chat', async (req, res) => {
  try {
    const response = await createChatResponse(req.body)
    res.json(response)
  } catch (err) {
    if (err instanceof ChatRequestError) {
      return res.status(err.statusCode).json({ error: err.message })
    }

    console.error('Chat error:', err)
    res.status(502).json({ error: 'Something went wrong while checking your notes. Please try again.' })
  }
})

module.exports = router
