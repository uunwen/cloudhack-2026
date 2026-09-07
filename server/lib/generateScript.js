const { getOpenAIClient } = require('./openaiClient')
const { buildSystemPrompt } = require('./genrePrompts')

const MAX_OUTPUT_TOKENS = 16384
// Conservative per-chunk input budget (chars, ~4 chars/token). Dialogue expansion of dense
// source prose can easily exceed 1x token count, so this stays well under MAX_OUTPUT_TOKENS
// even with generous expansion.
const MAX_CHARS_PER_CHUNK = 16000
const CONTINUATION_CONTEXT_LINES = 4

const SCRIPT_SCHEMA = {
  name: 'podcast_script',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      script: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            speaker: { type: 'string', enum: ['A', 'B'] },
            text: { type: 'string' },
          },
          required: ['speaker', 'text'],
          additionalProperties: false,
        },
      },
    },
    required: ['script'],
    additionalProperties: false,
  },
}

function serializeSection(section) {
  let block = `### ${section.sectionTitle}\n${section.bodyText}`
  if (section.notes) {
    block += `\nSpeaker notes: ${section.notes}`
  }
  return block
}

function serializeSections(sections) {
  return sections.map(serializeSection).join('\n\n')
}

function chunkSections(sections, maxChars) {
  const chunks = []
  let current = []
  let currentLength = 0

  for (const section of sections) {
    const blockLength = serializeSection(section).length
    if (current.length && currentLength + blockLength > maxChars) {
      chunks.push(current)
      current = []
      currentLength = 0
    }
    current.push(section)
    currentLength += blockLength
  }

  if (current.length) {
    chunks.push(current)
  }

  return chunks
}

async function generateChunkScript(openai, sectionsChunk, genreId, part, totalParts, previousScript) {
  const systemPrompt = buildSystemPrompt(genreId, { part, totalParts })
  let userContent = serializeSections(sectionsChunk)

  if (previousScript && previousScript.length) {
    const tail = previousScript
      .slice(-CONTINUATION_CONTEXT_LINES)
      .map((line) => `Host ${line.speaker}: ${line.text}`)
      .join('\n')
    const lastSpeaker = previousScript[previousScript.length - 1].speaker
    const nextSpeaker = lastSpeaker === 'A' ? 'B' : 'A'
    userContent = `The conversation so far ended with:\n${tail}\n\nContinue from there with Host ${nextSpeaker} responding next (do not repeat the same speaker twice in a row), then cover this next part of the source material:\n\n${userContent}`
  }

  console.log(
    `[generateScript] part ${part}/${totalParts} — ${sectionsChunk.length} section(s), ${userContent.length} chars (~${Math.round(userContent.length / 4)} tokens) of input`,
  )

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_schema', json_schema: SCRIPT_SCHEMA },
    max_tokens: MAX_OUTPUT_TOKENS,
  })

  const choice = completion.choices[0]
  console.log(
    `[generateScript] part ${part}/${totalParts} — finish_reason: ${choice.finish_reason}, usage: ${JSON.stringify(completion.usage)}`,
  )

  if (choice.finish_reason === 'length') {
    console.error(`[generateScript] part ${part}/${totalParts} was truncated by the output token limit.`)
  }

  const raw = choice.message.content
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The model returned invalid JSON.')
  }

  if (!parsed || !Array.isArray(parsed.script) || !parsed.script.length) {
    throw new Error('The model did not return a usable script.')
  }

  return parsed.script
}

async function generateScript(sections, genreId) {
  const openai = getOpenAIClient()
  const chunks = chunkSections(sections, MAX_CHARS_PER_CHUNK)

  console.log(
    `[generateScript] ${sections.length} total section(s), ${serializeSections(sections).length} total chars, split into ${chunks.length} chunk(s)`,
  )

  const fullScript = []
  for (let i = 0; i < chunks.length; i++) {
    const chunkScript = await generateChunkScript(openai, chunks[i], genreId, i + 1, chunks.length, fullScript)
    fullScript.push(...chunkScript)
  }

  return fullScript
}

module.exports = generateScript
module.exports.serializeSections = serializeSections
