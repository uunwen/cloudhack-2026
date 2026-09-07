const WRONG_ANSWER_ROASTS = [
  'Oof. The hosts are judging you right now.',
  'Wrong! Were you even listening?',
  "That's a swing and a miss.",
  'Big oof energy on that one.',
  'The correct answer is crying right now.',
  "Bestie... no. Just no.",
]

export function pickRoastLine(): string {
  return WRONG_ANSWER_ROASTS[Math.floor(Math.random() * WRONG_ANSWER_ROASTS.length)]
}
