/**
 * Diagnóstico OOWP: rivales, categoría, bye, OWP intermedio.
 * Uso: npx tsx scripts/diagnose-oowp-players.mjs <path.tdf>
 */
import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml, buildMatchRecordsFromMatches } =
  await import('../app/lib/tournament-xml.ts')
const {
  buildPlayerTiebreakersFromMatches,
  filterMatchesForTiebreakers,
  buildMatchRecordsExcludingByes,
  buildOpponentSetsFromMatches,
  playerWinPercentForTiebreaker
} = await import('../app/lib/tournament-tiebreakers.ts')
const { inferPlayCategoryIndexForPlayer } =
  await import('../app/lib/inferred-tdf-standings.ts')

const TARGETS = {
  4766204: { owp: 56.25, oowp: 54.69, name: 'Agustin Guzman' },
  5048227: { owp: 50.0, oowp: 64.58, name: 'Javiera Lopez' },
  3946136: { owp: 50.0, oowp: 63.02, name: 'Bastian Gutierrez' },
  5736449: { owp: 58.33, oowp: 54.17, name: 'Francisco Miranda' }
}

const parsed = parseTournamentXml(xml)
const records = buildMatchRecordsFromMatches(parsed.matches)
const n = parsed.players.length
const swiss = filterMatchesForTiebreakers(parsed.matches, n)
const swissRec = buildMatchRecordsExcludingByes(swiss)

const playersByPop = new Map(parsed.players.map(p => [p.popId.trim(), p]))
const catLabel = ci => (ci === 0 ? 'J' : ci === 1 ? 'S' : 'M')

function buildCtx(sameCat) {
  return {
    swissMatches: swiss,
    swissRecords: swissRec,
    playersByPopId: playersByPop,
    options: { sameCategoryOnly: sameCat }
  }
}

function calc(sameCat, roundOwp = false) {
  const ctx = buildCtx(sameCat)
  const opps = buildOpponentSetsFromMatches(swiss, ctx)
  const winPct = new Map()
  for (const p of parsed.players.map(x => x.popId.trim())) {
    winPct.set(p, playerWinPercentForTiebreaker(p, ctx))
  }
  const owp = new Map()
  for (const p of parsed.players.map(x => x.popId.trim())) {
    const os = [...(opps.get(p) ?? [])]
    if (!os.length) {
      owp.set(p, 0.25)
      continue
    }
    const vals = os.map(o => winPct.get(o) ?? 0.25)
    owp.set(
      p,
      roundOwp
        ? vals.reduce((s, v) => s + Math.round(v * 10000) / 10000, 0) /
            os.length
        : vals.reduce((s, v) => s + v, 0) / os.length
    )
  }
  const oowp = new Map()
  for (const p of parsed.players.map(x => x.popId.trim())) {
    const os = [...(opps.get(p) ?? [])]
    if (!os.length) {
      oowp.set(p, 0.25)
      continue
    }
    const vals = os.map(o => {
      const v = owp.get(o) ?? 0.25
      return roundOwp ? Math.round(v * 10000) / 10000 : v
    })
    oowp.set(p, vals.reduce((s, v) => s + v, 0) / os.length)
  }
  return { opps, winPct, owp, oowp }
}

const lib = buildPlayerTiebreakersFromMatches(
  parsed.matches,
  records,
  undefined,
  n,
  parsed.players,
  { sameCategoryOnly: false }
)
const libCat = buildPlayerTiebreakersFromMatches(
  parsed.matches,
  records,
  undefined,
  n,
  parsed.players,
  { sameCategoryOnly: true }
)
const all = calc(false, false)
const allRound = calc(false, true)
const catOnly = calc(true, false)

console.log('=== Modos ===')
for (const pop of Object.keys(TARGETS)) {
  const e = TARGETS[pop]
  const pct = v => (v * 100).toFixed(2) + '%'
  console.log(
    `\n${pop} ${e.name}`,
    `\n  TOM     OWP ${e.owp}% OOWP ${e.oowp}%`,
    `\n  lib     OWP ${pct(lib.get(pop)?.owp)} OOWP ${pct(lib.get(pop)?.oowp)}`,
    `\n  lib+cat OWP ${pct(libCat.get(pop)?.owp)} OOWP ${pct(libCat.get(pop)?.oowp)}`,
    `\n  round   OWP ${pct(allRound.owp.get(pop))} OOWP ${pct(allRound.oowp.get(pop))}`
  )
}

for (const pop of Object.keys(TARGETS)) {
  const e = TARGETS[pop]
  const myCat = inferPlayCategoryIndexForPlayer(playersByPop.get(pop))
  const os = [...(all.opps.get(pop) ?? [])]
  console.log(`\n=== ${pop} ${e.name} [${catLabel(myCat)}] — ${os.length} rivales ===`)
  console.log(
    'Rival'.padEnd(10),
    'Cat',
    'W-L-T(sw)',
    'Win%',
    'OWP(ours)',
    'OWP(TOM est)',
    'Δ OWP'
  )
  let sumOwp = 0
  for (const o of os) {
    const r = swissRec.get(o) ?? { wins: 0, losses: 0, ties: 0 }
    const wlt = `${r.wins}-${r.losses}-${r.ties}`
    const wp = (all.winPct.get(o) ?? 0) * 100
    const ow = (all.owp.get(o) ?? 0) * 100
    const oc = inferPlayCategoryIndexForPlayer(playersByPop.get(o))
    sumOwp += all.owp.get(o) ?? 0.25
    console.log(
      o.padEnd(10),
      catLabel(oc),
      wlt.padEnd(8),
      wp.toFixed(2).padStart(6),
      ow.toFixed(2).padStart(8),
      ''.padStart(8),
      oc !== myCat ? '← otra cat' : ''
    )
  }
  const ourOowp = (all.oowp.get(pop) ?? 0) * 100
  console.log(
    `OOWP calc: avg OWP rivales = ${((sumOwp / os.length) * 100).toFixed(2)}% | ours ${ourOowp.toFixed(2)}% | TOM ${e.oowp}%`
  )
}
