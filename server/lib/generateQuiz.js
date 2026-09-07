const { getOpenAIClient } = require('./openaiClient')
const { serializeSections } = require('./generateScript')

const TOTAL_QUESTIONS = 5
const MAX_OUTPUT_TOKENS = 2000

const QUIZ_SCHEMA = {
  name: 'quiz_questions',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correctIndex: { type: 'integer' },
          },
          required: ['question', 'options', 'correctIndex'],
          additionalProperties: false,
        },
      },
    },
    required: ['questions'],
    additionalProperties: false,
  },
}

function buildSystemPrompt(count) {
  return `You are creating quiz questions to test factual recall of the source content given to you.

Generate exactly ${count} question(s) that test the ACTUAL FACTUAL CONTENT of the material below -- names, numbers, definitions, causes, sequences, specific details. Do not test framing, tone, or anything not literally stated.

Each question must be either:
- Multiple-choice, with 3-4 plausible options where only one is correct, or
- True/false, with exactly two options: ["True", "False"]

Make incorrect options plausible but clearly wrong to someone who read the material carefully. Return the zero-based index of the correct option as correctIndex.`
}

function groupSectionsIntoBuckets(sections, numBuckets) {
  const buckets = []
  const sizePerBucket = Math.ceil(sections.length / numBuckets)
  for (let i = 0; i < sections.length; i += sizePerBucket) {
    buckets.push(sections.slice(i, i + sizePerBucket))
  }
  return buckets
}

function distributeQuestionCounts(numBuckets, total) {
  const base = Math.floor(total / numBuckets)
  const remainder = total % numBuckets
  return Array.from({ length: numBuckets }, (_, i) => base + (i < remainder ? 1 : 0))
}

async function generateQuestionsForBucket(openai, bucketSections, count, bucketIndex, totalBuckets) {
  const systemPrompt = buildSystemPrompt(count)
  const userContent = serializeSections(bucketSections)

  console.log(
    `[generateQuiz] bucket ${bucketIndex + 1}/${totalBuckets} — ${bucketSections.length} section(s), ${userContent.length} chars, requesting ${count} question(s)`,
  )

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_schema', json_schema: QUIZ_SCHEMA },
    max_tokens: MAX_OUTPUT_TOKENS,
  })

  const choice = completion.choices[0]
  console.log(
    `[generateQuiz] bucket ${bucketIndex + 1}/${totalBuckets} — finish_reason: ${choice.finish_reason}, usage: ${JSON.stringify(completion.usage)}`,
  )

  let parsed
  try {
    parsed = JSON.parse(choice.message.content)
  } catch {
    throw new Error('The model returned invalid JSON for the quiz.')
  }

  if (!parsed || !Array.isArray(parsed.questions) || !parsed.questions.length) {
    throw new Error('The model did not return usable quiz questions.')
  }

  return parsed.questions
}

async function generateQuiz(sections) {
  const openai = getOpenAIClient()
  const numBuckets = Math.min(sections.length, TOTAL_QUESTIONS)
  const buckets = groupSectionsIntoBuckets(sections, numBuckets)
  const counts = distributeQuestionCounts(buckets.length, TOTAL_QUESTIONS)

  console.log(
    `[generateQuiz] ${sections.length} section(s) split into ${buckets.length} bucket(s) for coverage, targeting ${TOTAL_QUESTIONS} total questions`,
  )

  const results = await Promise.all(
    buckets.map((bucket, i) => generateQuestionsForBucket(openai, bucket, counts[i], i, buckets.length)),
  )

  return results.flat()
}

module.exports = generateQuiz
