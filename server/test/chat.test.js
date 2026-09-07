const assert = require('node:assert/strict')
const test = require('node:test')

const { ChatRequestError, createChatResponse } = require('../lib/chat')

function section(overrides = {}) {
  return {
    id: 'docx-1-1',
    sourceName: 'Biology Notes.docx',
    sourceType: 'docx',
    sourceOrdinal: 1,
    ordinal: 1,
    sectionTitle: 'Chapter 3 — Photosynthesis',
    bodyText: 'Photosynthesis converts light energy into chemical energy.',
    notes: null,
    headingPath: ['Chapter 3 — Photosynthesis'],
    ...overrides,
  }
}

function fakeOpenAI(answer = 'A grounded answer.') {
  let calls = 0
  let lastRequest = null
  return {
    get calls() {
      return calls
    },
    get lastRequest() {
      return lastRequest
    },
    getClient() {
      return {
        chat: {
          completions: {
            async create(request) {
              calls++
              lastRequest = request
              return { choices: [{ message: { content: answer } }] }
            },
          },
        },
      }
    },
  }
}

test('chat rejects an empty question', async () => {
  await assert.rejects(
    () => createChatResponse({ question: '   ', sections: [section()] }),
    (err) => err instanceof ChatRequestError && err.statusCode === 400,
  )
})

test('ambiguous scope returns a deterministic answer without calling OpenAI', async () => {
  const openai = fakeOpenAI()
  const sections = [
    section({ id: 'pdf-1-1', sourceName: 'A.pdf', sourceType: 'pdf', pageNumber: 3, sectionTitle: 'Page 3' }),
    section({ id: 'pdf-2-1', sourceName: 'B.pdf', sourceType: 'pdf', sourceOrdinal: 2, pageNumber: 3, sectionTitle: 'Page 3' }),
  ]

  const response = await createChatResponse(
    { question: 'Explain page 3.', sections },
    { getOpenAIClient: openai.getClient },
  )

  assert.equal(openai.calls, 0)
  assert.match(response.answer, /more than one uploaded document/i)
  assert.deepEqual(response.sources, [])
})

test('zero evidence returns an honest answer without calling OpenAI', async () => {
  const openai = fakeOpenAI()
  const response = await createChatResponse(
    { question: 'Explain quantum chromodynamics.', sections: [section()] },
    { getOpenAIClient: openai.getClient },
  )

  assert.equal(openai.calls, 0)
  assert.match(response.answer, /couldn't find enough information/i)
  assert.deepEqual(response.sources, [])
})

test('successful chat returns the model answer and server-derived sources', async () => {
  const openai = fakeOpenAI('Plants turn light into stored chemical energy.')
  const response = await createChatResponse(
    { question: 'What does Chapter 3 say about photosynthesis?', sections: [section()] },
    { getOpenAIClient: openai.getClient },
  )

  assert.equal(response.answer, 'Plants turn light into stored chemical energy.')
  assert.equal(response.sources.length, 1)
  assert.equal(response.sources[0].sectionId, 'docx-1-1')
  assert.equal(response.sources[0].sourceName, 'Biology Notes.docx')
  assert.equal(response.resolvedScope.label, 'Chapter 3')
  assert.deepEqual(response.resolvedScope.sectionIds, ['docx-1-1'])
  assert.equal(openai.lastRequest.model, 'gpt-4o')
  assert.doesNotMatch(openai.lastRequest.messages[0].content, /Photosynthesis converts/)
  assert.match(openai.lastRequest.messages.at(-1).content, /content_kind="untrusted_reference"/)
})

test('an explicit whole-material prompt uses bounded retrieved excerpts', async () => {
  const openai = fakeOpenAI('Your notes focus on photosynthesis.')
  const response = await createChatResponse(
    { question: 'Summarize my notes', sections: [section()] },
    { getOpenAIClient: openai.getClient },
  )

  assert.equal(openai.calls, 1)
  assert.deepEqual(response.sources.map((source) => source.sectionId), ['docx-1-1'])
})

test('a simple follow-up reuses the previous resolved scope', async () => {
  const openai = fakeOpenAI('In simpler terms, plants store sunlight as energy.')
  const response = await createChatResponse(
    {
      question: 'What does that mean?',
      sections: [section(), section({ id: 'docx-1-2', ordinal: 2, sectionTitle: 'Chapter 4 — Statistics', bodyText: 'The mean value is the arithmetic average.' })],
      history: [
        { role: 'user', content: 'Explain Chapter 3.' },
        { role: 'assistant', content: 'Chapter 3 explains photosynthesis.' },
      ],
      activeScope: { label: 'Chapter 3', sectionIds: ['docx-1-1'] },
    },
    { getOpenAIClient: openai.getClient },
  )

  assert.equal(openai.calls, 1)
  assert.equal(response.resolvedScope.label, 'Chapter 3')
  assert.deepEqual(response.sources.map((source) => source.sectionId), ['docx-1-1'])
  assert.equal(openai.lastRequest.messages[1].content, 'Explain Chapter 3.')
})
