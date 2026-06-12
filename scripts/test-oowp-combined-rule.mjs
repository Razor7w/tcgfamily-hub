import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml } = await import('../app/lib/tournament-xml.ts')
const {
  buildPlayerTiebreakersFromMatches,
  filterMatchesForTiebreakers,
  buildOpponentSetsFromMatches
} = await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const records = (await import('../app/lib/tournament-xml.ts')).buildMatchRecordsFromMatches(
  parsed.matches
)
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const playersByPop = new Map(parsed.players.map(p => [p.popId.trim(), p]))
const tb = buildPlayerTiebreakersFromMatches(
  parsed.matches,
  records,
  undefined,
  parsed.players.length,
  parsed.players,
  { sameCategoryOnly: false }
)
const opps = buildOpponentSetsFromMatches(swiss, { playersByPopId: playersByPop })

const dropped = new Set()
for (const p of parsed.players) {
  const block =
    xml.match(
      new RegExp(`<player userid="${p.popId}"[\\s\\S]*?</player>`, 'i')
    )?.[0] ?? ''
  if (block.includes('<dropped>')) dropped.add(p.popId.trim())
}

const TOM = {
  5572829: 54.69, 5549103: 54.69, 5040944: 58.33, 4766204: 54.69,
  5048227: 64.58, 5404457: 57.29, 5216758: 55.21, 5147394: 54.69,
  5249454: 55.21, 3946136: 63.02, 4969557: 60.42, 4278367: 57.29,
  5736449: 54.17, 5949695: 52.08, 5589196: 52.08, 5670164: 45.83, 4969547: 53.13
}

function adjustOwpForOowp(oppPop, rawOwp) {
  if (dropped.has(oppPop)) return rawOwp + 0.125
  if (rawOwp < 0.5) return 0.5
  return rawOwp
}

function score(label, adjFn) {
  let hit = 0
  const miss = []
  for (const [pop, tom] of Object.entries(TOM)) {
    const os = [...(opps.get(pop) ?? [])]
    const vals = os.map(o => adjFn(o, tb.get(o)?.owp ?? 0.25))
    const oo = (vals.reduce((a, b) => a + b, 0) / vals.length) * 100
    if (Math.abs(oo - tom) < 0.02) hit++
    else miss.push({ pop, oo: oo.toFixed(2), tom, detail: os.map(o => `${o}:${(tb.get(o).owp * 100).toFixed(1)}→${(adjFn(o, tb.get(o).owp) * 100).toFixed(1)}`) })
  }
  console.log(`\n${label}: ${hit}/17`)
  for (const m of miss) console.log(' ', m.pop, m.oo, 'TOM', m.tom, m.detail?.join(' '))
}

score('drop+12.5% + floor50 sub50', adjustOwpForOowp)

// variants
score('drop+12.5 only', (o, raw) => (dropped.has(o) ? raw + 0.125 : raw))
score('floor50 only', (o, raw) => (raw < 0.5 ? 0.5 : raw))
score('drop max75', (o, raw) => (dropped.has(o) ? Math.max(raw, 0.75) : raw < 0.5 ? 0.5 : raw))
