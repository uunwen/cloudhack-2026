const { getOpenAIClient } = require('./openaiClient')
const { serializeSections } = require('./generateScript')

const MAX_OUTPUT_TOKENS = 1200

const SYSTEM_PROMPT = `You are creating a concise study summary of the following lecture/document content.

Summarize the key facts, concepts, names, numbers, and other testable details as a bulleted list, with each bullet on its own line starting with "- ". Be concise, but make sure every important fact is captured somewhere in the bullets. Do not add commentary, a preamble, or a closing remark -- just the bullet list itself.`

async function generateSummary(sections) {
  const openai = getOpenAIClient()
  const userContent = serializeSections(sections)

  console.log(`[generateSummary] ${sections.length} section(s), ${userContent.length} chars of input`)
  const start = Date.now()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
  })

  const choice = completion.choices[0]
  console.log(
    `[generateSummary] done in ${Date.now() - start}ms — finish_reason: ${choice.finish_reason}, usage: ${JSON.stringify(completion.usage)}`,
  )

  const text = choice.message.content?.trim()
  if (!text) {
    throw new Error('The model did not return a usable summary.')
  }

  return text
}

module.exports = generateSummary
