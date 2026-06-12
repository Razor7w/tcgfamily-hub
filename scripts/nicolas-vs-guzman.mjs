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

function show(pop, name) {
  const os = [...(opps.get(pop) ?? [])]
  console.log(`\n${name} (${pop}) OOWP=${(tb.get(pop).oowp * 100).toFixed(2)}%`)
  const parts = os.map(o => {
    const p = playersByPop.get(o)
    return { o, name: `${p?.firstName} ${p?.lastName}`, owp: (tb.get(o)?.owp ?? 0) * 100 }
  })
  parts.sort((a, b) => a.o.localeCompare(b.o))
  for (const x of parts) console.log(`  ${x.o} ${x.name} OWP ${x.owp.toFixed(2)}%`)
  const avg = parts.reduce((s, x) => s + x.owp, 0) / parts.length
  console.log(`  avg ${avg.toFixed(2)}%`)
}

show('5572829', 'Nicolas')
show('4766204', 'Guzman')
show('5147394', 'Thomas')

// shared opponents?
const n = opps.get('5572829')
const g = opps.get('4766204')
const shared = [...n].filter(x => g.has(x))
console.log('\nShared opponents Nicolas∩Guzman:', shared)
