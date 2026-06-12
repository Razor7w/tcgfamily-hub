import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml } = await import('../app/lib/tournament-xml.ts')
const {
  filterMatchesForTiebreakers,
  buildMatchRecordsExcludingByes,
  swissRoundCountForTiebreakers,
  buildOpponentSetsFromMatches
} = await import('../app/lib/tournament-tiebreakers.ts')

const TOM = {
  4766204: { owp: 56.25, oowp: 54.69 },
  5048227: { owp: 50.0, oowp: 64.58 },
  3946136: { owp: 50.0, oowp: 63.02 },
  5736449: { owp: 58.33, oowp: 54.17 }
}

const parsed = parseTournamentXml(xml)
const pops = parsed.players.map(p => p.popId.trim())
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const rec = buildMatchRecordsExcludingByes(swiss)
const R = swissRoundCountForTiebreakers(
  parsed.matches,
  parsed.players.length,
  rec
)
const opps = buildOpponentSetsFromMatches(swiss, {})
const FLOOR = 0.25

function wp(pop, mode) {
  const r = rec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const played = r.wins + r.losses + r.ties
  if (played <= 0) return FLOOR
  if (mode === 'rp') return Math.max(FLOOR, (r.wins + 0.5 * r.ties) / played)
  if (mode === 'r') return Math.max(FLOOR, (r.wins + 0.5 * r.ties) / R)
  if (mode === 'wins_r') return Math.max(FLOOR, r.wins / R)
  if (mode === 'completed_r') {
    const raw =
      played >= R
        ? (r.wins + 0.5 * r.ties) / R
        : (r.wins + 0.5 * r.ties) / played
    return Math.max(FLOOR, raw)
  }
  return FLOOR
}

function fullTb(wpMode, oowpUsesOwpFrom) {
  const winPct = new Map(pops.map(p => [p, wp(p, wpMode)]))
  const owp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) owp.set(pop, FLOOR)
    else owp.set(pop, os.reduce((s, o) => s + winPct.get(o), 0) / os.length)
  }
  const owp2 =
    oowpUsesOwpFrom === 'same'
      ? owp
      : (() => {
          const w2 = new Map(pops.map(p => [p, wp(p, oowpUsesOwpFrom)]))
          const m = new Map()
          for (const pop of pops) {
            const os = [...(opps.get(pop) ?? [])]
            if (!os.length) m.set(pop, FLOOR)
            else m.set(pop, os.reduce((s, o) => s + w2.get(o), 0) / os.length)
          }
          return m
        })()
  const oowp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) oowp.set(pop, FLOOR)
    else oowp.set(pop, os.reduce((s, o) => s + owp2.get(o), 0) / os.length)
  }
  return { owp, oowp }
}

function score(tb) {
  let o = 0
  let oo = 0
  for (const pop of Object.keys(TOM)) {
    const e = TOM[pop]
    if (Math.abs(tb.owp.get(pop) * 100 - e.owp) < 0.02) o++
    if (Math.abs(tb.oowp.get(pop) * 100 - e.oowp) < 0.02) oo++
  }
  return { o, oo }
}

const modes = [
  ['rp / rp', 'rp', 'same'],
  ['rp / r', 'rp', 'r'],
  ['rp / completed_r', 'rp', 'completed_r'],
  ['rp / wins_r', 'rp', 'wins_r'],
  ['r / r', 'r', 'same'],
  ['completed_r / completed_r', 'completed_r', 'same']
]

console.log('R=', R)
for (const [label, wm, om] of modes) {
  const tb = fullTb(wm, om)
  const s = score(tb)
  console.log(`\n${label}: OWP ${s.o}/4 OOWP ${s.oo}/4`)
  for (const pop of Object.keys(TOM)) {
    const e = TOM[pop]
    const ov = Math.round(tb.owp.get(pop) * 10000) / 100
    const oov = Math.round(tb.oowp.get(pop) * 10000) / 100
    console.log(
      `  ${pop} OWP ${ov} ${Math.abs(ov - e.owp) < 0.02 ? 'OK' : 'MISS'} OOWP ${oov} ${Math.abs(oov - e.oowp) < 0.02 ? 'OK' : 'MISS'}`
    )
  }
}
