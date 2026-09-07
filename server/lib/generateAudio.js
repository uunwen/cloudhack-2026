const crypto = require('crypto')
const { synthesizeSpeech } = require('./elevenLabsClient')

const HOST_VOICES = {
  A: 'cgSgspJ2msm6clMCkdW9', // Jessica -- playful, bright, warm
  B: 'iP95p4xoKVk53GoZ742B', // Chris -- charming, down-to-earth
}

const CONCURRENCY = 4
const RETRY_DELAY_MS = 500

// In-memory only, per spec -- resets on server restart, persists for the process lifetime.
const cache = new Map()

function cacheKey(text, voiceId) {
  return crypto.createHash('sha256').update(`${voiceId}:${text}`).digest('hex')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function synthesizeLine(line, index) {
  const voiceId = HOST_VOICES[line.speaker]
  const key = cacheKey(line.text, voiceId)

  const cached = cache.get(key)
  if (cached) {
    return { index, status: 'cached', audioUrl: cached }
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const buffer = await synthesizeSpeech(line.text, voiceId)
      const audioUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`
      cache.set(key, audioUrl)
      return { index, status: 'synthesized', audioUrl }
    } catch (err) {
      if (attempt === 1) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return { index, status: 'failed', error: err.message || 'Unknown error' }
    }
  }
}

async function generateAudio(script) {
  console.log(`[generateAudio] ${script.length} line(s) to synthesize`)
  const start = Date.now()

  const results = await mapWithConcurrency(script, CONCURRENCY, synthesizeLine)

  const elapsedMs = Date.now() - start
  const cachedCount = results.filter((r) => r.status === 'cached').length
  const synthesizedCount = results.filter((r) => r.status === 'synthesized').length
  const failures = results.filter((r) => r.status === 'failed')

  console.log(
    `[generateAudio] done in ${elapsedMs}ms — ${cachedCount} cached, ${synthesizedCount} synthesized, ${failures.length} failed`,
  )

  if (failures.length) {
    const detail = failures
      .map((f) => `line ${f.index + 1} (Host ${script[f.index].speaker}): ${f.error}`)
      .join('; ')
    throw new Error(`Failed to generate audio for ${failures.length} line(s): ${detail}`)
  }

  return script.map((line, i) => ({ ...line, audioUrl: results[i].audioUrl }))
}

module.exports = generateAudio
module.exports.HOST_VOICES = HOST_VOICES
