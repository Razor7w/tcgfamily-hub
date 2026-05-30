import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const tdfPath = process.argv[2]
if (!tdfPath) {
  console.error('Usage: node scripts/verify-tdf-tiebreakers.mjs <path.tdf>')
  process.exit(1)
}

const xml = readFileSync(tdfPath, 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml, buildMatchRecordsFromMatches } =
  await import('../app/lib/tournament-xml.ts')
const {
  buildPlayerTiebreakersFromMatches,
  formatTiebreakerPercent,
  filterMatchesForTiebreakers,
  swissRoundCountForTiebreakers,
  buildMatchRecordsExcludingByes
} = await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const records = buildMatchRecordsFromMatches(parsed.matches)
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const swissRec = buildMatchRecordsExcludingByes(swiss)
const rounds = swissRoundCountForTiebreakers(
  parsed.matches,
  parsed.players.length,
  swissRec
)
const tb = buildPlayerTiebreakersFromMatches(
  parsed.matches,
  records,
  undefined,
  parsed.players.length,
  parsed.players,
  { sameCategoryOnly: false }
)

console.log('players', parsed.players.length)
console.log(
  'matches total',
  parsed.matches.length,
  'swiss scored',
  swiss.length
)
console.log('swiss rounds', rounds)
console.log('---')

const expected = {
  2381556: { owp: 55.56, oowp: 56.94, name: 'Jesse' },
  3946136: { owp: 33.33, oowp: 64.82, name: 'Bastian' },
  5589196: { owp: 62.5, oowp: 51.39, name: 'Cristobal T' },
  5480377: { owp: 50.0, oowp: 59.26, name: 'Cristian S' },
  4616199: { owp: 66.67, oowp: 45.83, name: 'Pablo' },
  5196410: { owp: 58.33, oowp: 58.34, name: 'Fabian' },
  4736214: { owp: 75.0, oowp: 41.66, name: 'Christian Z' },
  4504572: { owp: 52.78, oowp: 46.29, name: 'Andres' },
  5216758: { owp: 47.22, oowp: 55.09, name: 'Francy' }
}

for (const p of parsed.players) {
  const pop = p.popId
  const r = records.get(pop)
  const t = tb.get(pop)
  const exp = expected[pop]
  const owpPct = (t?.owp ?? 0) * 100
  const oowpPct = (t?.oowp ?? 0) * 100
  const ok =
    exp &&
    Math.abs(owpPct - exp.owp) < 0.02 &&
    Math.abs(oowpPct - exp.oowp) < 0.02
  console.log(
    ok ? 'OK' : 'MISS',
    pop,
    p.firstName,
    r ? `${r.wins}-${r.losses}-${r.ties}` : '?',
    'OWP',
    formatTiebreakerPercent(t?.owp ?? 0),
    exp ? `exp ${exp.owp}%` : '',
    'OOWP',
    formatTiebreakerPercent(t?.oowp ?? 0),
    exp ? `exp ${exp.oowp}%` : ''
  )
}

const { inferPlayCategoryIndexForPlayer } =
  await import('../app/lib/inferred-tdf-standings.ts')

function catOf(pop) {
  const p = parsed.players.find(x => x.popId === pop)
  return p ? inferPlayCategoryIndexForPlayer(p) : 1
}

function mpPct(pop, recMap, rnds) {
  const r = recMap.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const raw = (r.wins * 3 + r.ties) / (3 * rnds)
  return Math.max(1 / 3, raw)
}

function owpSameCat(pop, recMap, rnds) {
  const opps = new Set()
  for (const m of swiss) {
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    if (u1 === pop && u2) opps.add(u2)
    if (u2 === pop && u1) opps.add(u1)
  }
  const c = catOf(pop)
  const same = [...opps].filter(o => catOf(o) === c)
  if (same.length === 0) return 1 / 3
  return (
    same.map(o => mpPct(o, recMap, rnds)).reduce((a, b) => a + b, 0) /
    same.length
  )
}

function owpAllMp(pop, recMap, rnds) {
  const opps = new Set()
  for (const m of swiss) {
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    if (u1 === pop && u2) opps.add(u2)
    if (u2 === pop && u1) opps.add(u1)
  }
  const vals = [...opps].map(o => mpPct(o, recMap, rnds))
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1 / 3
}

function owpAllWinsPerRound(pop, recMap, rnds, fl) {
  const opps = new Set()
  for (const m of swiss) {
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    if (u1 === pop && u2) opps.add(u2)
    if (u2 === pop && u1) opps.add(u1)
  }
  const vals = [...opps].map(o => {
    const r = recMap.get(o) ?? { wins: 0, losses: 0, ties: 0 }
    return Math.max(fl, Math.min(1, r.wins / rnds))
  })
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : fl
}

console.log('--- all opponents wins/rounds (bye=win in record) ---')
for (const p of parsed.players) {
  const pop = p.popId
  const exp = expected[pop]
  const owpPct = owpAllWinsPerRound(pop, records, rounds, 0.25) * 100
  const ok = exp && Math.abs(owpPct - exp.owp) < 0.15
  console.log(
    ok ? 'OK' : 'MISS',
    pop,
    p.firstName,
    owpPct.toFixed(2) + '%',
    exp ? `exp ${exp.owp}%` : ''
  )
}

console.log('--- all opponents MP% (bye in record) OWP ---')
for (const p of parsed.players) {
  const pop = p.popId
  const exp = expected[pop]
  const owpPct = owpAllMp(pop, records, rounds) * 100
  const ok = exp && Math.abs(owpPct - exp.owp) < 0.15
  console.log(
    ok ? 'OK' : 'MISS',
    pop,
    p.firstName,
    owpPct.toFixed(2) + '%',
    exp ? `exp ${exp.owp}%` : ''
  )
}

console.log('--- same-category MP% OWP ---')
for (const p of parsed.players) {
  const pop = p.popId
  const exp = expected[pop]
  const owpPct = owpSameCat(pop, records, rounds) * 100
  const ok = exp && Math.abs(owpPct - exp.owp) < 0.15
  console.log(
    ok ? 'OK' : 'MISS',
    pop,
    p.firstName,
    'cat',
    catOf(pop),
    'OWP',
    owpPct.toFixed(2) + '%',
    exp ? `exp ${exp.owp}%` : ''
  )
}
