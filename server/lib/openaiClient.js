const OpenAI = require('openai')

let client = null

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured on the server.')
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

async function extractTextFromImage(base64DataUrl, instructions) {
  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: instructions },
          { type: 'image_url', image_url: { url: base64DataUrl } },
        ],
      },
    ],
  })
  return completion.choices[0].message.content?.trim() || ''
}

module.exports = { getOpenAIClient, extractTextFromImage }
