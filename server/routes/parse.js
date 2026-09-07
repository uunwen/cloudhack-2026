const express = require('express')
const multer = require('multer')

const parsePdf = require('../lib/parsePdf')
const parsePptx = require('../lib/parsePptx')
const parseDocx = require('../lib/parseDocx')
const parseImage = require('../lib/parseImage')
const parseText = require('../lib/parseText')
const withSectionProvenance = require('../lib/withSectionProvenance')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

async function parseFile(file) {
  switch (file.mimetype) {
    case 'application/pdf':
      return { sourceType: 'pdf', sections: await parsePdf(file.buffer) }
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return { sourceType: 'pptx', sections: await parsePptx(file.buffer) }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return { sourceType: 'docx', sections: await parseDocx(file.buffer) }
    case 'image/png':
    case 'image/jpeg':
      return { sourceType: 'image', sections: await parseImage(file.buffer, file.mimetype) }
    default:
      throw new Error('Unsupported file type.')
  }
}

const router = express.Router()

router.post('/parse', (req, res) => {
  upload.array('files', 10)(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message =
        uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'One of those files is too large (25MB max).'
          : uploadErr.message || 'Could not process the uploaded files.'
      return res.status(400).json({ error: message })
    }

    const files = req.files || []
    const text = req.body.text && req.body.text.trim() ? req.body.text : null

    if (!files.length && !text) {
      return res.status(400).json({ error: 'Please provide at least one file or some text to parse.' })
    }

    const multipleFiles = files.length > 1
    const allSections = []
    const failedFiles = []

    for (const [fileIndex, file] of files.entries()) {
      try {
        const { sourceType, sections } = await parseFile(file)
        const titled = multipleFiles
          ? sections.map((s) => ({ ...s, sectionTitle: `${file.originalname} — ${s.sectionTitle}` }))
          : sections
        allSections.push(
          ...withSectionProvenance(titled, {
            sourceName: file.originalname,
            sourceType,
            sourceOrdinal: fileIndex + 1,
          }),
        )
      } catch (err) {
        console.error(`Parse error (${file.originalname}):`, err)
        failedFiles.push({ name: file.originalname, error: err.message || 'Failed to parse this file.' })
      }
    }

    if (text) {
      try {
        allSections.push(
          ...withSectionProvenance(parseText(text), {
            sourceName: 'Pasted text',
            sourceType: 'text',
            sourceOrdinal: files.length + 1,
          }),
        )
      } catch (err) {
        console.error('Parse error (pasted text):', err)
        failedFiles.push({ name: 'Pasted text', error: err.message || 'Failed to parse the pasted text.' })
      }
    }

    if (!allSections.length) {
      const status = failedFiles.some((f) => f.error?.includes('OPENAI_API_KEY')) ? 500 : 422
      const message = failedFiles.length
        ? `Couldn't parse any of the provided content: ${failedFiles.map((f) => `${f.name} (${f.error})`).join('; ')}`
        : 'Something went wrong while parsing your content.'
      return res.status(status).json({ error: message })
    }

    if (failedFiles.length) {
      return res.json({ sections: allSections, failedFiles })
    }

    res.json(allSections)
  })
})

module.exports = router
