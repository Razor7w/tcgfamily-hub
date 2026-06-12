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
  5736449: { owp: 58.33, oowp: 54.17 },
  5572829: { owp: 62.5, oowp: 54.69 },
  5549103: { owp: 56.25, oowp: 54.69 }
}

const parsed = parseTournamentXml(xml)
const pops = parsed.players.map(p => p.popId.trim())
const dropped = new Set()
for (const p of parsed.players) {
  const re = new RegExp(
    `<player userid="${p.popId}"[\\s\\S]*?</player>`,
    'i'
  )
  if ((xml.match(re)?.[0] ?? '').includes('<dropped>')) {
    dropped.add(p.popId.trim())
  }
}

const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const rec = buildMatchRecordsExcludingByes(swiss)
const R = swissRoundCountForTiebreakers(
  parsed.matches,
  parsed.players.length,
  rec
)
const opps = buildOpponentSetsFromMatches(swiss, {})
const F = 0.25

function winPctHandbook(pop) {
  const r = rec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const played = r.wins + r.losses + r.ties
  if (played <= 0) return F
  const num = r.wins + 0.5 * r.ties
  let raw
  if (dropped.has(pop)) {
    raw = num / played
    return Math.min(0.75, Math.max(F, raw))
  }
  raw = num / R
  return Math.min(1, Math.max(F, raw))
}

function winPctCurrent(pop) {
  const r = rec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const played = r.wins + r.losses + r.ties
  if (played <= 0) return F
  return Math.min(1, Math.max(F, (r.wins + 0.5 * r.ties) / played))
}

function calc(winFn) {
  const wp = new Map(pops.map(p => [p, winFn(p)]))
  const owp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) owp.set(pop, F)
    else owp.set(pop, os.reduce((s, o) => s + wp.get(o), 0) / os.length)
  }
  const oowp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) oowp.set(pop, F)
    else oowp.set(pop, os.reduce((s, o) => s + owp.get(o), 0) / os.length)
  }
  return { owp, oowp, wp }
}

for (const [label, fn] of [
  ['current (w/played)', winPctCurrent],
  ['handbook (w/R + drop cap)', winPctHandbook]
]) {
  const { owp, oowp } = calc(fn)
  let o = 0
  let oo = 0
  console.log('\n' + label, 'R=' + R, 'dropped', [...dropped])
  for (const pop of Object.keys(TOM)) {
    const e = TOM[pop]
    const ov = Math.round(owp.get(pop) * 10000) / 100
    const oov = Math.round(oowp.get(pop) * 10000) / 100
    const okO = Math.abs(ov - e.owp) < 0.02
    const okOO = Math.abs(oov - e.oowp) < 0.02
    if (okO) o++
    if (okOO) oo++
    console.log(
      `  ${pop} OWP ${ov} ${okO ? 'OK' : 'MISS ' + e.owp} OOWP ${oov} ${okOO ? 'OK' : 'MISS ' + e.oowp}`
    )
  }
  console.log(`  => OWP ${o}/6 OOWP ${oo}/6`)
}

function calcSplit() {
  const wp1 = new Map(pops.map(p => [p, winPctCurrent(p)]))
  const wp2 = new Map(pops.map(p => [p, winPctHandbook(p)]))
  const owp1 = new Map()
  const owp2 = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) {
      owp1.set(pop, F)
      owp2.set(pop, F)
      continue
    }
    owp1.set(pop, os.reduce((s, o) => s + wp1.get(o), 0) / os.length)
    owp2.set(pop, os.reduce((s, o) => s + wp2.get(o), 0) / os.length)
  }
  const oowp1 = new Map()
  const oowp2 = new Map()
  const oowpMix = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) {
      oowp1.set(pop, F)
      oowp2.set(pop, F)
      oowpMix.set(pop, F)
      continue
    }
    oowp1.set(pop, os.reduce((s, o) => s + owp1.get(o), 0) / os.length)
    oowp2.set(pop, os.reduce((s, o) => s + owp2.get(o), 0) / os.length)
    oowpMix.set(pop, os.reduce((s, o) => s + owp2.get(o), 0) / os.length)
  }
  return { owp1, oowp1, oowp2, oowpMix }
}

const split = calcSplit()
console.log('\nOWP current / OOWP from current vs handbook OWP chain:')
for (const pop of Object.keys(TOM)) {
  const e = TOM[pop]
  const ov = Math.round(split.owp1.get(pop) * 10000) / 100
  const oo1 = Math.round(split.oowp1.get(pop) * 10000) / 100
  const oo2 = Math.round(split.oowp2.get(pop) * 10000) / 100
  const ooM = Math.round(split.oowpMix.get(pop) * 10000) / 100
  console.log(
    `  ${pop} OWP ${ov} OOWP(cur) ${oo1} OOWP(hb) ${oo2} OOWP(mix) ${ooM} TOM ${e.oowp}`
  )
}

console.log('\nCristobal win%:', winPctCurrent('5589196') * 100, winPctHandbook('5589196') * 100)

function calcRoundOwp2() {
  const wp = new Map(pops.map(p => [p, winPctCurrent(p)]))
  const owp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) owp.set(pop, F)
    else owp.set(pop, os.reduce((s, o) => s + wp.get(o), 0) / os.length)
  }
  const oowp = new Map()
  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) oowp.set(pop, F)
    else {
      let sum = 0
      for (const o of os) {
        const pct = Math.round((owp.get(o) ?? F) * 10000) / 100
        sum += pct / 100
      }
      oowp.set(pop, sum / os.length)
    }
  }
  return { owp, oowp }
}

const rnd = calcRoundOwp2()
console.log('\nOOWP with opponent OWP rounded to 2dp %:')
for (const pop of Object.keys(TOM)) {
  const oov = Math.round(rnd.oowp.get(pop) * 10000) / 100
  console.log(`  ${pop} ${oov} TOM ${TOM[pop].oowp}`)
}

// OOWP incl bye slot = avg field OWP
const cur = calc(winPctCurrent)
let fieldOwp = 0
for (const v of cur.owp.values()) fieldOwp += v
fieldOwp /= cur.owp.size
const byes = new Map()
for (const m of parsed.matches) {
  const u1 = m.player1UserId.trim()
  const u2 = m.player2UserId.trim()
  if (u1 && !u2) byes.set(u1, (byes.get(u1) ?? 0) + 1)
}
console.log('\nOOWP with bye slot = field avg OWP', (fieldOwp * 100).toFixed(2) + '%')

// median OWP
const owpVals = [...cur.owp.values()].sort((a, b) => a - b)
const median = owpVals[Math.floor(owpVals.length / 2)]
console.log('median OWP', (median * 100).toFixed(2))
for (const pop of ['5736449']) {
  const os = [...(opps.get(pop) ?? [])]
  const sum = os.reduce((s, o) => s + cur.owp.get(o), 0) + median
  console.log('Francisco OOWP with median bye slot', ((sum / (os.length + 1)) * 100).toFixed(2))
}

// TOM +12.5/n hypothesis
console.log('\n+12.5/n hypothesis:')
for (const pop of Object.keys(TOM)) {
  const os = [...(opps.get(pop) ?? [])]
  const ours = cur.oowp.get(pop) * 100
  const adj = ours + 12.5 / os.length
  console.log(`  ${pop} ours ${ours.toFixed(2)} + ${(12.5 / os.length).toFixed(2)} = ${adj.toFixed(2)} TOM ${TOM[pop].oowp}`)
}
for (const pop of Object.keys(TOM)) {
  const os = [...(opps.get(pop) ?? [])]
  const by = byes.get(pop) ?? 0
  if (!by) continue
  const sum = os.reduce((s, o) => s + cur.owp.get(o), 0) + by * fieldOwp
  const oov = (sum / (os.length + by)) * 100
  console.log(`  ${pop} ${oov.toFixed(2)} TOM ${TOM[pop].oowp}`)
}

const hb = calc(winPctHandbook)
console.log('\nWin% changes (handbook vs current):')
for (const pop of pops) {
  const a = winPctCurrent(pop) * 100
  const b = hb.wp.get(pop) * 100
  if (Math.abs(a - b) > 0.01) {
    const r = rec.get(pop)
    console.log(
      `  ${pop} ${a.toFixed(2)}% -> ${b.toFixed(2)}% WLT(sw) ${r?.wins}-${r?.losses}-${r?.ties} drop=${dropped.has(pop)}`
    )
  }
}
