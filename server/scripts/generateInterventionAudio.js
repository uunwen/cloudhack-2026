// One-off generator for the Player page's pre-written "caught you" / "welcome back" lines.
// These are synthesized ONCE and committed as static files -- never generated live, per spec.
//
// Usage: node server/scripts/generateInterventionAudio.js
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { synthesizeSpeech } = require('../lib/elevenLabsClient')
const { HOST_VOICES } = require('../lib/generateAudio')

const OUT_DIR = path.join(__dirname, '..', '..', 'client', 'public', 'audio', 'intervention')

const LINES = [
  { category: 'ghosting', id: 1, text: "Umm... did you just ghost us? Rude." },
  { category: 'ghosting', id: 2, text: "Hello? Anyone still out there? Helloooo?" },
  { category: 'doomscroll', id: 1, text: "We see that phone. Put it down. Put it DOWN." },
  { category: 'doomscroll', id: 2, text: "Wow, we're just background noise now? Cool, cool, cool." },
  { category: 'welcomeBack', id: 1, text: "Oh, look who's back. Welcome back, superstar." },
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const line of LINES) {
    for (const host of ['A', 'B']) {
      const filename = `${line.category}-${host}-${line.id}.mp3`
      const outPath = path.join(OUT_DIR, filename)
      console.log(`Synthesizing ${filename}: "${line.text}"`)
      const buffer = await synthesizeSpeech(line.text, HOST_VOICES[host])
      fs.writeFileSync(outPath, buffer)
      console.log(`  wrote ${filename} (${buffer.length} bytes)`)
    }
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
