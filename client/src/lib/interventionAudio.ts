export type InterventionType = 'ghosting' | 'doomscroll'
export type Host = 'A' | 'B'

const BASE = '/audio/intervention'

const GHOSTING: Record<Host, string[]> = {
  A: [`${BASE}/ghosting-A-1.mp3`, `${BASE}/ghosting-A-2.mp3`],
  B: [`${BASE}/ghosting-B-1.mp3`, `${BASE}/ghosting-B-2.mp3`],
}

const DOOMSCROLL: Record<Host, string[]> = {
  A: [`${BASE}/doomscroll-A-1.mp3`, `${BASE}/doomscroll-A-2.mp3`],
  B: [`${BASE}/doomscroll-B-1.mp3`, `${BASE}/doomscroll-B-2.mp3`],
}

const WELCOME_BACK: Record<Host, string[]> = {
  A: [`${BASE}/welcomeBack-A-1.mp3`],
  B: [`${BASE}/welcomeBack-B-1.mp3`],
}

function pickRandom(paths: string[]): string {
  return paths[Math.floor(Math.random() * paths.length)]
}

export function pickInterventionLine(type: InterventionType, host: Host): string {
  const bank = type === 'ghosting' ? GHOSTING : DOOMSCROLL
  return pickRandom(bank[host])
}

export function pickWelcomeBackLine(host: Host): string {
  return pickRandom(WELCOME_BACK[host])
}
