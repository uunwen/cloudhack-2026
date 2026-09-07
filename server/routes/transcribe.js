const express = require('express')
const multer = require('multer')

const transcribeAudio = require('../lib/transcribeAudio')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

const router = express.Router()

router.post('/transcribe', (req, res) => {
  upload.single('audio')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message =
        uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'That recording is too large (25MB max).'
          : uploadErr.message || 'Could not process the uploaded audio.'
      return res.status(400).json({ error: message })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please provide an audio recording to transcribe.' })
    }

    try {
      const text = await transcribeAudio(req.file.buffer, req.file.originalname || 'recording.webm', req.file.mimetype)
      res.json({ text })
    } catch (err) {
      console.error('Transcription error:', err)
      const status = err.message?.includes('OPENAI_API_KEY') ? 500 : 502
      res.status(status).json({ error: err.message || 'Something went wrong while transcribing your recording.' })
    }
  })
})

module.exports = router
