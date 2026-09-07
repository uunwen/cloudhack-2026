const BASE_INSTRUCTIONS = `You are turning lecture/document content into an audio script for a two-host podcast.

Rules you must always follow:
- Rewrite the given source content as a natural back-and-forth dialogue between exactly two hosts, "Host A" and "Host B". Both hosts should speak throughout, not just one.
- CRITICALLY: preserve every factual, testable detail from the source content. Names, numbers, definitions, causes, sequences, and any other specific facts must all still be present and accurate somewhere in the dialogue. You may dramatize the delivery, tone, and reactions -- you must never dramatize, invent, omit, or alter the facts themselves.
- Keep each line short: 1-3 sentences per line. Each line will later be converted into its own separate audio clip, so long monologue-style lines are not usable.
- Cover the entire source content given to you -- do not skip sections.
`

const GENRE_STYLES = {
  'gossip-podcast': `Style: Gossip Podcast.
Write it like two best friends catching up over coffee, gushing over the "tea" from the source material. Casual, warm, conversational language ("okay wait", "no because", "I'm obsessed"), frequent reactions and interjections from the other host ("WAIT WHAT", "shut up", "stoppp"), and a breezy, fun energy throughout -- while still landing every fact clearly.`,

  'true-crime': `Style: True Crime.
Write it with slow-burn suspense and an ominous, narrator-driven pace, like a true crime podcast building toward a reveal. Use dramatic pauses implied through short lines, foreboding phrasing ("but here's where it gets strange..."), and a serious, hushed tone -- while still delivering every fact accurately and in a clear sequence.`,

  'sports-commentary': `Style: Sports Commentary.
Write it like two hyped play-by-play commentators calling a live game -- fast-paced, excited, full of energy and exclamations ("AND THERE IT IS", "unbelievable", "he's not gonna believe this stat"). Treat facts and details like game plays and highlights worth getting excited about, while keeping every detail accurate.`,

  'gen-z-slang': `Style: Gen-Z Slang Explainer.
Write it with heavy current internet/Gen-Z slang (e.g. "no cap", "rizz", "it's giving...", "lowkey/highkey", "bestie", "the way that..."), like two terminally-online friends explaining something to each other. It should still clearly and correctly explain every fact underneath the slang -- slang is flavor, not a replacement for clarity.`,

  'reality-tv': `Style: Reality TV Drama.
Write it like a reality TV confessional segment -- dramatic reactions, gasps, interpersonal-style commentary on the material as if it were "messy" drama between characters/ideas in the source ("I was SHOOK when I found out..."), with a soap-opera level of emotional delivery, while every underlying fact stays accurate.`,
}

const VALID_GENRES = Object.keys(GENRE_STYLES)

function buildContinuationNote(part, totalParts) {
  if (!totalParts || totalParts <= 1) return ''

  const lines = [
    `\nThis is part ${part} of ${totalParts} of a single continuous episode covering a large amount of source material, split up only because of length -- the listener will hear it as one seamless episode.`,
  ]
  if (part > 1) {
    lines.push('This is a continuation of an ongoing conversation. Do NOT reintroduce the show, the hosts, or the topic from scratch -- continue naturally as if mid-conversation.')
  }
  if (part < totalParts) {
    lines.push('Do NOT wrap up, say goodbye, or give closing remarks yet -- more source material follows in later parts.')
  }
  return lines.join('\n')
}

function buildSystemPrompt(genreId, { part, totalParts } = {}) {
  const style = GENRE_STYLES[genreId]
  if (!style) {
    throw new Error(`Unknown genre: ${genreId}`)
  }
  return `${BASE_INSTRUCTIONS}\n${style}${buildContinuationNote(part, totalParts)}`
}

module.exports = { buildSystemPrompt, VALID_GENRES }
