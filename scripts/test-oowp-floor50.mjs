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

const TOM = {
  5572829: 54.69, 5549103: 54.69, 5040944: 58.33, 4766204: 54.69,
  5048227: 64.58, 5404457: 57.29, 5216758: 55.21, 5147394: 54.69,
  5249454: 55.21, 3946136: 63.02, 4969557: 60.42, 4278367: 57.29,
  5736449: 54.17, 5949695: 52.08, 5589196: 52.08, 5670164: 45.83, 4969547: 53.13
}

function oowpWithFloor(floorPct) {
  const hit = []
  const miss = []
  for (const [pop, tom] of Object.entries(TOM)) {
    const os = [...(opps.get(pop) ?? [])]
    const vals = os.map(o => Math.max(floorPct, (tb.get(o)?.owp ?? 0.25)))
    const oo = (vals.reduce((a, b) => a + b, 0) / (vals.length || 1)) * 100
    if (Math.abs(oo - tom) < 0.02) hit.push(pop)
    else miss.push({ pop, calc: oo.toFixed(2), tom, os: os.length })
  }
  return { hit, miss }
}

for (const f of [0.25, 0.375, 0.5, 0.5625, 0.625, 0.75]) {
  const { hit, miss } = oowpWithFloor(f)
  console.log(`\nOOWP floor ${(f * 100).toFixed(2)}%: ${hit.length}/17`)
  for (const m of miss) console.log(' ', m)
}

// dropped boost: max(owp, 0.75) for dropped opps + floor 0.5 for others
const dropped = new Set()
for (const p of parsed.players) {
  const block =
    xml.match(
      new RegExp(`<player userid="${p.popId}"[\\s\\S]*?</player>`, 'i')
    )?.[0] ?? ''
  if (block.includes('<dropped>')) dropped.add(p.popId.trim())
}
console.log('\ndropped', [...dropped])

function oowpDroppedBoost(dropMin, otherMin) {
  let hit = 0
  const miss = []
  for (const [pop, tom] of Object.entries(TOM)) {
    const os = [...(opps.get(pop) ?? [])]
    const vals = os.map(o => {
      const raw = tb.get(o)?.owp ?? 0.25
      const min = dropped.has(o) ? dropMin : otherMin
      return Math.max(min, raw)
    })
    const oo = (vals.reduce((a, b) => a + b, 0) / vals.length) * 100
    if (Math.abs(oo - tom) < 0.02) hit++
    else miss.push({ pop, oo: oo.toFixed(2), tom })
  }
  return { hit, miss }
}

for (const [d, o] of [
  [0.75, 0.25],
  [0.75, 0.5],
  [0.625, 0.5],
  [0.75, 0.375]
]) {
  const r = oowpDroppedBoost(d, o)
  console.log(`\ndrop>=${d * 100}% other>=${o * 100}%: ${r.hit}/17`)
  for (const m of r.miss) console.log(' ', m)
}
