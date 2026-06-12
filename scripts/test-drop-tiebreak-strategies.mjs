/**
 * Prueba estrategias de drops vs valores TOM export.
 */
import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml } = await import('../app/lib/tournament-xml.ts')
const { filterMatchesForTiebreakers, buildMatchRecordsExcludingByes } =
  await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const swissRec = buildMatchRecordsExcludingByes(swiss)
const FLOOR = 0.25

const dropped = new Map()
for (const p of parsed.players) {
  const re = new RegExp(`<player userid="${p.popId}"[\\s\\S]*?</player>`, 'i')
  const block = xml.match(re)?.[0] ?? ''
  const m = block.match(/<round>(\d+)<\/round>/)
  if (block.includes('<dropped>'))
    dropped.set(p.popId.trim(), Number(m?.[1] ?? 0))
}

const opps = new Map()
for (const m of swiss) {
  const u1 = m.player1UserId.trim()
  const u2 = m.player2UserId.trim()
  const o = m.outcome.trim()
  if (!u1 || !u2 || !['1', '2', '3'].includes(o)) continue
  const add = (a, b) => {
    if (!opps.has(a)) opps.set(a, new Set())
    opps.get(a).add(b)
  }
  add(u1, u2)
  add(u2, u1)
}

function winPct(pop, mode) {
  const r = swissRec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const rounds = r.wins + r.losses + r.ties
  if (rounds <= 0) return FLOOR
  let raw = (r.wins + 0.5 * r.ties) / rounds
  if (mode === 'cap_drop' && dropped.has(pop)) {
    raw = Math.min(0.75, Math.max(FLOOR, raw))
  } else {
    raw = Math.max(FLOOR, raw)
  }
  return raw
}

function calc(mode, skipDroppedOpps) {
  const pops = parsed.players.map(p => p.popId.trim()).filter(Boolean)
  const wp = new Map(pops.map(p => [p, winPct(p, mode)]))
  const owp = new Map()
  const oowp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])].filter(
      o => !skipDroppedOpps || !dropped.has(o)
    )
    if (!os.length) {
      owp.set(pop, FLOOR)
      oowp.set(pop, FLOOR)
      continue
    }
    owp.set(pop, os.reduce((s, o) => s + (wp.get(o) ?? FLOOR), 0) / os.length)
    oowp.set(pop, os.reduce((s, o) => s + (owp.get(o) ?? FLOOR), 0) / os.length)
  }
  return { owp, oowp }
}

const tom = {
  5572829: [62.5, 54.69],
  5549103: [56.25, 54.69],
  5216758: [62.5, 55.21],
  4278367: [37.5, 57.29]
}

const modes = [
  ['TOM export: suelo 25%, todos los rivales', 'floor_only', false],
  ['Handbook: cap 25-75% drops, todos los rivales', 'cap_drop', false],
  ['Suelo 25%, excluir rivales que dropearon', 'floor_only', true],
  ['Cap 25-75%, excluir rivales que dropearon', 'cap_drop', true]
]

console.log('Dropped:', [...dropped.entries()])
for (const [label, mode, skip] of modes) {
  const { owp, oowp } = calc(mode, skip)
  let miss = 0
  console.log('\n' + label)
  for (const [pop, [eo, ee]] of Object.entries(tom)) {
    const o = (owp.get(pop) ?? 0) * 100
    const oo = (oowp.get(pop) ?? 0) * 100
    const ok = Math.abs(o - eo) < 0.02 && Math.abs(oo - ee) < 0.02
    if (!ok) miss++
    console.log(
      `  ${pop} OWP ${o.toFixed(2)}% (TOM ${eo}%) OOWP ${oo.toFixed(2)}% (TOM ${ee}%) ${ok ? 'OK' : 'MISS'}`
    )
  }
  console.log(`  => ${4 - miss}/4 match`)
}
