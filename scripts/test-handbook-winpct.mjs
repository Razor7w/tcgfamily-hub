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
  buildOpponentSetsFromMatches,
  swissRoundCountForTiebreakers
} = await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const rec = buildMatchRecordsExcludingByes(swiss)
const playersByPop = new Map(parsed.players.map(p => [p.popId.trim(), p]))
const opps = buildOpponentSetsFromMatches(swiss, {
  playersByPopId: playersByPop
})
const R = swissRoundCountForTiebreakers(
  parsed.matches,
  parsed.players.length,
  rec
)

const dropped = new Set()
const dom2 = new JSDOM(xml, { contentType: 'text/xml' })
for (const d of dom2.window.document.querySelectorAll('dropped')) {
  const id = d.querySelector('userid')?.textContent?.trim()
  if (id) dropped.add(id)
}

const FLOOR = 0.25
const CAP_DROP = 0.75
const CAP_FIN = 1

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x))
}

function winPctPlayed(pop) {
  const r = rec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const n = r.wins + r.losses + r.ties
  if (n <= 0) return FLOOR
  return clamp((r.wins + 0.5 * r.ties) / n, FLOOR, CAP_FIN)
}

function winPctHandbook(pop) {
  const r = rec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const W = r.wins + 0.5 * r.ties
  if (dropped.has(pop)) {
    const n = r.wins + r.losses + r.ties
    if (n <= 0) return FLOOR
    return clamp(W / n, FLOOR, CAP_DROP)
  }
  return clamp(W / R, FLOOR, CAP_FIN)
}

function compute(winFn) {
  const wp = new Map()
  for (const pop of opps.keys()) wp.set(pop, winFn(pop))
  const owp = new Map()
  for (const [pop, os] of opps) {
    const vals = [...os].map(o => wp.get(o) ?? FLOOR)
    owp.set(pop, vals.reduce((a, b) => a + b, 0) / (vals.length || 1))
  }
  const oowp = new Map()
  for (const [pop, os] of opps) {
    const vals = [...os].map(o => owp.get(o) ?? FLOOR)
    oowp.set(pop, vals.reduce((a, b) => a + b, 0) / (vals.length || 1))
  }
  return { wp, owp, oowp }
}

const TOM = {
  5572829: { owp: 62.5, oowp: 54.69 },
  5549103: { owp: 56.25, oowp: 54.69 },
  5040944: { owp: 56.25, oowp: 58.33 },
  4766204: { owp: 56.25, oowp: 54.69 },
  5048227: { owp: 50.0, oowp: 64.58 },
  5404457: { owp: 50.0, oowp: 57.29 },
  5216758: { owp: 62.5, oowp: 55.21 },
  5147394: { owp: 62.5, oowp: 54.69 },
  5249454: { owp: 56.25, oowp: 55.21 },
  3946136: { owp: 50.0, oowp: 63.02 },
  4969557: { owp: 50.0, oowp: 60.42 },
  4278367: { owp: 37.5, oowp: 57.29 },
  5736449: { owp: 58.33, oowp: 54.17 },
  5949695: { owp: 58.33, oowp: 52.08 },
  5589196: { owp: 58.33, oowp: 52.08 },
  5670164: { owp: 58.33, oowp: 45.83 },
  4969547: { owp: 56.25, oowp: 53.12 }
}

function score(label, result) {
  let owpHit = 0
  let oowpHit = 0
  const misses = []
  for (const [pop, t] of Object.entries(TOM)) {
    const o = (result.owp.get(pop) ?? 0) * 100
    const oo = (result.oowp.get(pop) ?? 0) * 100
    const owpOk = Math.abs(o - t.owp) < 0.02
    const oowpOk = Math.abs(oo - t.oowp) < 0.02
    if (owpOk) owpHit++
    if (oowpOk) oowpHit++
    if (!oowpOk || !owpOk) {
      misses.push({
        pop,
        owp: o.toFixed(2),
        oowp: oo.toFixed(2),
        tomOowp: t.oowp
      })
    }
  }
  console.log(
    `\n${label}: OWP ${owpHit}/17 OOWP ${oowpHit}/17 R=${R} dropped=${[...dropped]}`
  )
  for (const m of misses) console.log(' ', m)
}

score('played', compute(winPctPlayed))
score('handbook', compute(winPctHandbook))

const hb = compute(winPctHandbook)
const oowpHybrid = new Map()
for (const [pop, os] of opps) {
  const vals = [...os].map(o => hb.owp.get(o) ?? FLOOR)
  oowpHybrid.set(pop, vals.reduce((a, b) => a + b, 0) / (vals.length || 1))
}
let hit = 0
for (const [pop, t] of Object.entries(TOM)) {
  const oo = (oowpHybrid.get(pop) ?? 0) * 100
  if (Math.abs(oo - t.oowp) < 0.02) hit++
}
console.log(`\nhybrid OWP=played OOWP=handbook-owp: ${hit}/17`)

// show win% diffs for key players
console.log('\nWin% played vs handbook (non-dropped with bye):')
for (const pop of [
  '5670164',
  '5736449',
  '5949695',
  '5589196',
  '4278367',
  '4766204'
]) {
  console.log(
    pop,
    (winPctPlayed(pop) * 100).toFixed(2),
    (winPctHandbook(pop) * 100).toFixed(2)
  )
}
