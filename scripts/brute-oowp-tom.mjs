/**
 * Busca fórmula OOWP que reproduzca export TOM final.
 */
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

// OOWP TOM export final (captura usuario)
const TOM_OOWP = {
  5572829: 54.69,
  5549103: 54.69,
  5040944: 58.33,
  4766204: 54.69,
  5048227: 64.58,
  5404457: 57.29,
  5216758: 55.21,
  5147394: 54.69,
  5249454: 55.21,
  3946136: 63.02,
  4969557: 60.42,
  4278367: 57.29,
  5736449: 54.17,
  5949695: 52.08,
  5589196: 52.08,
  5670164: 45.83,
  4969547: 53.13
}

const parsed = parseTournamentXml(xml)
const pops = parsed.players.map(p => p.popId.trim())
const playersByPop = new Map(parsed.players.map(p => [p.popId.trim(), p]))
const swiss = filterMatchesForTiebreakers(parsed.matches, parsed.players.length)
const rec = buildMatchRecordsExcludingByes(swiss)
const R = swissRoundCountForTiebreakers(
  parsed.matches,
  parsed.players.length,
  rec
)
const F = 0.25

const dropped = new Set()
for (const p of parsed.players) {
  const block =
    xml.match(
      new RegExp(`<player userid="${p.popId}"[\\s\\S]*?</player>`, 'i')
    )?.[0] ?? ''
  if (block.includes('<dropped>')) dropped.add(p.popId.trim())
}

const byes = new Map()
for (const m of parsed.matches) {
  const u1 = m.player1UserId.trim()
  const u2 = m.player2UserId.trim()
  if (u1 && !u2) byes.set(u1, (byes.get(u1) ?? 0) + 1)
}

function winPct(pop, mode) {
  const r = rec.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
  const played = r.wins + r.losses + r.ties
  if (played <= 0) return F
  const num = r.wins + 0.5 * r.ties
  let raw
  if (mode === 'played') raw = num / played
  else if (mode === 'completed_r')
    raw = dropped.has(pop) ? num / played : num / R
  else if (mode === 'drop_cap') {
    raw = num / played
    return Math.min(0.75, Math.max(F, raw))
  } else raw = num / R
  return Math.min(1, Math.max(F, raw))
}

function buildOwp(winMode, sameCatOwp, owpRound) {
  const owp = new Map()
  for (const pop of pops) {
    const os = [
      ...(buildOpponentSetsFromMatches(swiss, {
        playersByPopId: playersByPop,
        options: { sameCategoryOnly: sameCatOwp }
      }).get(pop) ?? [])
    ]
    if (!os.length) {
      owp.set(pop, F)
      continue
    }
    let sum = 0
    for (const o of os) {
      sum += winPct(o, winMode)
    }
    let v = sum / os.length
    if (owpRound) v = Math.round(v * 10000) / 10000
    owp.set(pop, v)
  }
  return owp
}

function scoreOowp(oowp) {
  let hit = 0
  let miss = []
  for (const [pop, tom] of Object.entries(TOM_OOWP)) {
    const v = Math.round((oowp.get(pop) ?? 0) * 10000) / 100
    if (Math.abs(v - tom) < 0.02) hit++
    else miss.push(`${pop} ${v}≠${tom}`)
  }
  return { hit, miss }
}

const configs = []
for (const winMode of ['played', 'completed_r', 'drop_cap', 'r']) {
  for (const sameOwp of [false, true]) {
    for (const owpRound of [false, true]) {
      for (const oowpMode of ['std', 'h2h', 'bye_slot_avg', 'plus_floor_8n']) {
        configs.push({ winMode, sameOwp, owpRound, oowpMode })
      }
    }
  }
}

let best = { hit: 0, cfg: null, miss: [] }

for (const cfg of configs) {
  const owp = buildOwp(cfg.winMode, cfg.sameOwp, cfg.owpRound)
  const opps = buildOpponentSetsFromMatches(swiss, {
    playersByPopId: playersByPop,
    options: { sameCategoryOnly: false }
  })
  const oowp = new Map()

  for (const pop of pops) {
    const os = [...(opps.get(pop) ?? [])]
    if (!os.length) {
      oowp.set(pop, F)
      continue
    }
    if (cfg.oowpMode === 'std') {
      oowp.set(pop, os.reduce((s, o) => s + owp.get(o), 0) / os.length)
    } else if (cfg.oowpMode === 'h2h') {
      let sum = 0
      for (const o of os) {
        const others = [...(opps.get(o) ?? [])].filter(x => x !== pop)
        sum +=
          others.reduce((s, x) => s + winPct(x, cfg.winMode), 0) /
          (others.length || 1)
      }
      oowp.set(pop, sum / os.length)
    } else if (cfg.oowpMode === 'bye_slot_avg') {
      const by = byes.get(pop) ?? 0
      let sum = os.reduce((s, o) => s + owp.get(o), 0)
      if (by > 0) {
        let field = 0
        for (const v of owp.values()) field += v
        field /= owp.size
        sum += by * field
      }
      oowp.set(pop, sum / (os.length + by))
    } else if (cfg.oowpMode === 'plus_floor_8n') {
      oowp.set(
        pop,
        os.reduce((s, o) => s + owp.get(o), 0) / os.length + F / 2 / os.length
      )
    }
  }

  const { hit, miss } = scoreOowp(oowp)
  if (hit > best.hit) best = { hit, cfg, miss: miss.slice(0, 8), oowp }
}

console.log('R=', R, 'best', best.hit, '/', Object.keys(TOM_OOWP).length)
console.log('cfg', best.cfg)
console.log('miss', best.miss)

// Report mismatches with current std formula
const owpStd = buildOwp('played', false, false)
const opps = buildOpponentSetsFromMatches(swiss, {
  playersByPopId: playersByPop,
  options: { sameCategoryOnly: false }
})
console.log('\nCurrent std vs TOM:')
for (const [pop, tom] of Object.entries(TOM_OOWP)) {
  const os = [...(opps.get(pop) ?? [])]
  const ours =
    os.length === 0 ? F : os.reduce((s, o) => s + owpStd.get(o), 0) / os.length
  const v = Math.round(ours * 10000) / 100
  const ok = Math.abs(v - tom) < 0.02
  if (!ok)
    console.log(
      `  MISS ${pop} web ${v}% tom ${tom}% n=${os.length} byes=${byes.get(pop) ?? 0}`
    )
}
