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
  buildOpponentSetsFromMatches,
  buildMatchRecordsExcludingByes,
  playerWinPercentForTiebreaker
} = await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const records = (
  await import('../app/lib/tournament-xml.ts')
).buildMatchRecordsFromMatches(parsed.matches)
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const rec = buildMatchRecordsExcludingByes(swiss)
const playersByPop = new Map(parsed.players.map(p => [p.popId.trim(), p]))
const tb = buildPlayerTiebreakersFromMatches(
  parsed.matches,
  records,
  undefined,
  parsed.players.length,
  parsed.players,
  { sameCategoryOnly: false }
)
const opps = buildOpponentSetsFromMatches(swiss, {
  playersByPopId: playersByPop
})
const ctx = {
  swissMatches: swiss,
  swissRecords: rec,
  playersByPopId: playersByPop
}

const TOM = {
  4766204: 54.69,
  5048227: 64.58,
  3946136: 63.02,
  5736449: 54.17,
  5147394: 54.69,
  5572829: 54.69
}

function chain(pop) {
  const os = [...(opps.get(pop) ?? [])]
  console.log(
    `\n=== ${pop} OOWP web ${(tb.get(pop).oowp * 100).toFixed(2)}% TOM ${TOM[pop]}% ===`
  )
  for (const o of os) {
    const owp = (tb.get(o)?.owp ?? 0.25) * 100
    const os2 = [...(opps.get(o) ?? [])]
    const parts = os2.map(x => ({
      pop: x,
      wp: (playerWinPercentForTiebreaker(x, ctx) * 100).toFixed(2)
    }))
    const avgWp =
      parts.reduce((s, p) => s + parseFloat(p.wp), 0) / (parts.length || 1)
    console.log(
      `  rival ${o} OWP ${owp.toFixed(2)}% (avg win% rivales ${avgWp.toFixed(2)}%)`,
      parts.map(p => `${p.pop}:${p.wp}%`).join(' ')
    )
  }
}

for (const pop of Object.keys(TOM)) chain(pop)
