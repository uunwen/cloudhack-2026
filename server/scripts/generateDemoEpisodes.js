// One-off generator for the pre-generated "backup episode" demo bundles used as a live-demo
// fallback when wifi/API calls are slow or flaky (see client/src/pages/Upload.tsx's
// "jump straight to a demo episode" links). Bundles the FULL pipeline output -- script, audio,
// summary, and quiz -- generated once via the existing, already-tested lib functions, and
// written as static JSON under client/public/demo-episodes/ so the frontend can load them
// with a plain fetch() of a static asset, bypassing every /api/generate-* call entirely.
//
// Usage: node server/scripts/generateDemoEpisodes.js
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const generateScript = require('../lib/generateScript')
const generateAudio = require('../lib/generateAudio')
const generateSummary = require('../lib/generateSummary')
const generateQuiz = require('../lib/generateQuiz')

const OUT_DIR = path.join(__dirname, '..', '..', 'client', 'public', 'demo-episodes')

const EPISODES = [
  {
    slug: 'gossip-podcast',
    genre: 'gossip-podcast',
    genreLabel: 'Gossip Podcast',
    sectionTitle: 'How Vaccines Work',
    bodyText: `Vaccines work by training the immune system to recognize and fight a specific pathogen without causing the disease itself. Most vaccines contain a weakened or inactivated form of a virus or bacterium, or a harmless piece of it, such as a protein from its surface. When this is introduced into the body, the immune system responds by producing antibodies and creating memory cells that remember the pathogen. If the person is later exposed to the real disease, their immune system can recognize it quickly and mount a much faster, stronger defense than it would have without prior exposure. This is why vaccinated people either avoid the disease entirely or experience a much milder case. Some vaccines require multiple doses, called a primary series, to build strong initial immunity, and booster shots later on to keep that immune memory strong over time. When enough people in a community are vaccinated, it becomes harder for a disease to spread at all, a protective effect known as herd immunity, which also helps protect people who cannot be vaccinated themselves, such as newborns or people with certain medical conditions.`,
  },
  {
    slug: 'true-crime',
    genre: 'true-crime',
    genreLabel: 'True Crime',
    sectionTitle: 'The French Revolution',
    bodyText: `The French Revolution began in 1789, driven by a combination of financial crisis, food shortages, and widespread frustration with the rigid social class system that divided France into three estates, with the clergy and nobility holding most privileges while the common people bore most of the tax burden. In July 1789, Parisians stormed the Bastille, a fortress and prison that had become a symbol of royal tyranny, marking a turning point that emboldened revolutionaries across the country. The National Assembly abolished feudal privileges and issued the Declaration of the Rights of Man and of the Citizen, asserting principles of liberty and equality. Over the following years, the monarchy was abolished, and King Louis XVI was executed by guillotine in 1793. The Revolution then entered a violent phase known as the Reign of Terror, led by Maximilien Robespierre, during which tens of thousands of people accused of counter-revolutionary activity were executed. The Terror ended in 1794 when Robespierre himself was arrested and executed. The instability that followed eventually paved the way for Napoleon Bonaparte to seize power in 1799, bringing the revolutionary period to a close.`,
  },
  {
    slug: 'gen-z-slang',
    genre: 'gen-z-slang',
    genreLabel: 'Gen-Z Slang Explainer',
    sectionTitle: 'Black Holes',
    bodyText: `A black hole is a region of space where gravity is so strong that nothing, not even light, can escape once it crosses a boundary called the event horizon. Black holes form when massive stars, at least a few times heavier than our sun, run out of nuclear fuel and collapse under their own gravity at the end of their lives. The point at the very center of a black hole, where all of its mass is compressed into an infinitely small point, is called a singularity, and our current understanding of physics breaks down there. Black holes come in different sizes: stellar black holes form from collapsing stars, while supermassive black holes, millions or even billions of times the mass of the sun, sit at the centers of most large galaxies, including our own Milky Way. Because black holes don't emit light themselves, scientists detect them indirectly, by observing how their gravity affects nearby stars and gas, or by capturing the glow of superheated material spiraling into them. In 2019, astronomers released the first-ever direct image of a black hole's silhouette, located in the galaxy M87, confirming decades of theoretical predictions.`,
  },
]

async function buildEpisode(episode) {
  const sections = [{ sectionTitle: episode.sectionTitle, bodyText: episode.bodyText, notes: null }]

  console.log(`\n=== ${episode.slug} ===`)
  console.log('Generating script...')
  const script = await generateScript(sections, episode.genre)
  console.log(`  ${script.length} line(s)`)

  console.log('Generating audio...')
  const audioScript = await generateAudio(script)
  console.log(`  ${audioScript.length} line(s) with audio`)

  console.log('Generating summary...')
  const summary = await generateSummary(sections)

  console.log('Generating quiz...')
  const quiz = await generateQuiz(sections)
  console.log(`  ${quiz.length} question(s)`)

  return {
    genreLabel: episode.genreLabel,
    sections,
    script,
    audioScript,
    summary,
    quiz,
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const episode of EPISODES) {
    const bundle = await buildEpisode(episode)
    const outPath = path.join(OUT_DIR, `${episode.slug}.json`)
    fs.writeFileSync(outPath, JSON.stringify(bundle))
    const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2)
    console.log(`Wrote ${outPath} (${sizeMb} MB)`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
