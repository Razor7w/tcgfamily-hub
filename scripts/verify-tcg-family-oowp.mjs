import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml, buildMatchRecordsFromMatches, droppedPopIdsFromPlayers } =
  await import('../app/lib/tournament-xml.ts')
const { buildPlayerTiebreakersFromMatches } = await import(
  '../app/lib/tournament-tiebreakers.ts'
)

const parsed = parseTournamentXml(xml)
const records = buildMatchRecordsFromMatches(parsed.matches)
const dropped = droppedPopIdsFromPlayers(parsed.players)
console.log('dropped', [...dropped])

const tb = buildPlayerTiebreakersFromMatches(
  parsed.matches,
  records,
  dropped,
  parsed.players.length,
  parsed.players,
  { sameCategoryOnly: false }
)

const TOM = {
  5572829: 54.69, 5549103: 54.69, 5040944: 58.33, 4766204: 54.69,
  5048227: 64.58, 5404457: 57.29, 5216758: 55.21, 5147394: 54.69,
  5249454: 55.21, 3946136: 63.02, 4969557: 60.42, 4278367: 57.29,
  5736449: 54.17, 5949695: 52.08, 5589196: 52.08, 5670164: 45.83, 4969547: 53.13
}

let hit = 0
for (const [pop, tom] of Object.entries(TOM)) {
  const owp = (tb.get(pop)?.owp ?? 0) * 100
  const oowp = (tb.get(pop)?.oowp ?? 0) * 100
  const okO = Math.abs(owp - (TOM[pop] ? tb.get(pop) : 0)) // placeholder
  const ok = Math.abs(oowp - tom) < 0.02
  if (!ok) console.log('MISS', pop, 'OOWP', oowp.toFixed(2), 'TOM', tom)
  else hit++
}
console.log(`OOWP ${hit}/17`)
