import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml, buildMatchRecordsFromMatches } = await import(
  '../app/lib/tournament-xml.ts'
)
const { buildUnifiedInferredStandings } = await import(
  '../app/lib/inferred-tdf-standings.ts'
)

const parsed = parseTournamentXml(xml)
const records = buildMatchRecordsFromMatches(parsed.matches)
const standings = buildUnifiedInferredStandings(
  parsed.players,
  records,
  parsed.matches
)
const senior = standings.find(c => c.categoryIndex === 1)
const names = new Map(
  parsed.players.map(p => [p.popId, `${p.firstName} ${p.lastName}`])
)

console.log('Bottom 5:')
for (const row of senior.finished.slice(-5)) {
  const r = records.get(row.popId)
  console.log(
    row.place,
    names.get(row.popId),
    r ? `${r.wins}-${r.losses}-${r.ties}` : '?'
  )
}

const vaitiare = senior.finished.find(r => r.popId === '5263820')
console.log('\nVaitiare place', vaitiare?.place, '/ total', senior.finished.length)
