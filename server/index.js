require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', require('./routes/parse'))
app.use('/api', require('./routes/generateScript'))
app.use('/api', require('./routes/generateAudio'))
app.use('/api', require('./routes/generateSummary'))
app.use('/api', require('./routes/generateQuiz'))

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
