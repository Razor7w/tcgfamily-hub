import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const xml = readFileSync(process.argv[2], 'utf8')
const dom = new JSDOM(xml, { contentType: 'text/xml' })
globalThis.window = dom.window
globalThis.DOMParser = dom.window.DOMParser

const { parseTournamentXml, buildMatchRecordsFromMatches } =
  await import('../app/lib/tournament-xml.ts')
const {
  filterMatchesForTiebreakers,
  buildMatchRecordsExcludingByes,
  swissRoundCountForTiebreakers
} = await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const fullRec = buildMatchRecordsFromMatches(parsed.matches)
const n = parsed.players.length
const swiss = filterMatchesForTiebreakers(parsed.matches, n)
const swissNoBye = buildMatchRecordsExcludingByes(swiss)
const R = swissRoundCountForTiebreakers(parsed.matches, n, swissNoBye)
const pops = parsed.players.map(p => p.popId.trim())

const expected = {
  2381556: { owp: 55.56, oowp: 56.94 },
  3946136: { owp: 33.33, oowp: 64.82 },
  5589196: { owp: 62.5, oowp: 51.39 },
  5480377: { owp: 50.0, oowp: 59.26 },
  4616199: { owp: 66.67, oowp: 45.83 },
  5196410: { owp: 58.33, oowp: 58.34 },
  4736214: { owp: 75.0, oowp: 41.66 },
  4504572: { owp: 52.78, oowp: 46.29 },
  5216758: { owp: 47.22, oowp: 55.09 }
}

function isScored(m) {
  const u1 = m.player1UserId.trim()
  const u2 = m.player2UserId.trim()
  const o = m.outcome.trim()
  if (!u1 || !u2) return false
  return o === '1' || o === '2' || o === '3'
}

function buildOppSets(matchList) {
  const opps = new Map(pops.map(p => [p, new Set()]))
  for (const m of matchList) {
    if (!isScored(m)) continue
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    opps.get(u1)?.add(u2)
    opps.get(u2)?.add(u1)
  }
  return opps
}

const oppAll = buildOppSets(parsed.matches)
const oppSwiss = buildOppSets(swiss)

function clamp(v, fl) {
  return Math.min(1, Math.max(fl, v))
}

function recVal(pop, recSrc) {
  return (
    recSrc.get(pop) ?? {
      wins: 0,
      losses: 0,
      ties: 0
    }
  )
}

function playerPct(pop, cfg) {
  const r = recVal(pop, cfg.rec)
  const scored = r.wins + r.losses + r.ties
  let raw = 0
  if (cfg.metric === 'wins_r') raw = r.wins / cfg.divisor
  else if (cfg.metric === 'mp_r')
    raw = (r.wins * 3 + r.ties) / (3 * cfg.divisor)
  else if (cfg.metric === 'wlt_r') raw = (r.wins + 0.5 * r.ties) / cfg.divisor
  else if (cfg.metric === 'wins_rp') raw = r.wins / (scored || cfg.divisor)
  else if (cfg.metric === 'mp_rp')
    raw = (r.wins * 3 + r.ties) / (3 * (scored || cfg.divisor))
  else if (cfg.metric === 'wlt_rp')
    raw = (r.wins + 0.5 * r.ties) / (scored || cfg.divisor)
  return clamp(raw, cfg.floor)
}

function tiebreak(cfg) {
  const wp = new Map(pops.map(p => [p, playerPct(p, cfg)]))
  const owp = new Map()
  for (const pop of pops) {
    const os = [...(cfg.opps.get(pop) ?? [])]
    if (os.length === 0) {
      owp.set(pop, cfg.floor)
      continue
    }
    let sum = 0
    for (const o of os) {
      let v = wp.get(o) ?? cfg.floor
      if (cfg.excludeH2h) {
        const os2 = cfg.opps.get(o) ?? new Set()
        const others = [...os2].filter(x => x !== pop)
        if (others.length > 0) {
          v =
            others.reduce((s, x) => s + (wp.get(x) ?? cfg.floor), 0) /
            others.length
        }
      }
      sum += v
    }
    owp.set(pop, sum / os.length)
  }
  const oowp = new Map()
  for (const pop of pops) {
    const os = [...(cfg.opps.get(pop) ?? [])]
    if (os.length === 0) {
      oowp.set(pop, cfg.floor)
      continue
    }
    oowp.set(
      pop,
      os.reduce((s, o) => s + (owp.get(o) ?? cfg.floor), 0) / os.length
    )
  }
  return { wp, owp, oowp }
}

function score(cfg) {
  const { owp, oowp } = tiebreak(cfg)
  let o = 0
  let oo = 0
  const miss = []
  for (const pop of pops) {
    const e = expected[pop]
    const ov = Math.round(owp.get(pop) * 10000) / 100
    const oov = Math.round(oowp.get(pop) * 10000) / 100
    if (Math.abs(ov - e.owp) < 0.02) o++
    else miss.push(`OWP ${pop} ${ov}≠${e.owp}`)
    if (Math.abs(oov - e.oowp) < 0.02) oo++
    else miss.push(`OOWP ${pop} ${oov}≠${e.oowp}`)
  }
  return { o, oo, miss, owp, oowp }
}

const metrics = ['wins_r', 'mp_r', 'wlt_r', 'wins_rp', 'mp_rp', 'wlt_rp']
const floors = [0.25, 1 / 3]
const recs = [
  ['full', fullRec],
  ['swissNoBye', swissNoBye]
]
const oppSets = [
  ['all', oppAll],
  ['swiss', oppSwiss]
]

let best = { total: 0, cfg: null, miss: [] }

for (const [recName, recMap] of recs) {
  for (const [oppName, oppMap] of oppSets) {
    for (const metric of metrics) {
      for (const floor of floors) {
        for (const excludeH2h of [false, true]) {
          const cfg = {
            rec: recMap,
            opps: oppMap,
            metric,
            divisor: R,
            floor,
            excludeH2h
          }
          const r = score(cfg)
          const total = r.o + r.oo
          if (total > best.total) {
            best = {
              total,
              cfg: { recName, oppName, metric, floor, excludeH2h, R },
              miss: r.miss,
              o: r.o,
              oo: r.oo
            }
          }
          if (r.o === 9 && r.oo === 9) {
            console.log('PERFECT', cfg)
            for (const pop of pops) {
              const e = expected[pop]
              console.log(
                pop,
                (r.owp.get(pop) * 100).toFixed(2),
                e.owp,
                (r.oowp.get(pop) * 100).toFixed(2),
                e.oowp
              )
            }
            process.exit(0)
          }
        }
      }
    }
  }
}

// TOM-style: round each player's win% to 2 decimal places before OWP/OOWP
{
  const cfg = {
    rec: swissNoBye,
    opps: oppSwiss,
    metric: 'wlt_rp',
    divisor: R,
    floor: 0.25,
    excludeH2h: false
  }
  const wp = new Map(
    pops.map(p => {
      const v = playerPct(p, cfg)
      return [p, Math.round(v * 10000) / 10000]
    })
  )
  console.log('--- round wp to 4dp before avg ---')
  for (const pop of pops) {
    const os = [...cfg.opps.get(pop)]
    const ov =
      Math.round(
        (os.reduce((s, o) => s + wp.get(o), 0) / (os.length || 1)) * 10000
      ) / 100
    const oov =
      Math.round(
        (os.reduce((s, o) => {
          const os2 = [...cfg.opps.get(o)]
          const ox = os2.reduce((a, y) => a + wp.get(y), 0) / (os2.length || 1)
          return s + ox
        }, 0) /
          (os.length || 1)) *
          10000
      ) / 100
    const e = expected[pop]
    console.log(
      pop,
      (ov * 100).toFixed(2),
      e.owp,
      (oov * 100).toFixed(2),
      e.oowp
    )
  }
}

console.log('best', best.total, '/ 18', best.cfg)
console.log('OWP', best.o, 'OOWP', best.oo)
console.log(best.miss.slice(0, 12).join('\n'))

// display rounding variants on best metric
if (best.cfg) {
  const cfg = {
    rec: best.cfg.recName === 'full' ? fullRec : swissNoBye,
    opps: best.cfg.oppName === 'all' ? oppAll : oppSwiss,
    metric: best.cfg.metric,
    divisor: R,
    floor: best.cfg.floor,
    excludeH2h: best.cfg.excludeH2h
  }
  const wp = new Map(
    pops.map(p => {
      const v = playerPct(p, cfg)
      return [p, Math.round(v * 10000) / 10000]
    })
  )
  console.log('--- rounded wp ---')
  for (const pop of pops) {
    const os = [...cfg.opps.get(pop)]
    const ov =
      Math.round(
        (os.reduce((s, o) => s + wp.get(o), 0) / (os.length || 1)) * 100
      ) / 100
    const oov =
      Math.round(
        (os.reduce((s, o) => {
          const os2 = [...cfg.opps.get(o)]
          const ox = os2.reduce((a, y) => a + wp.get(y), 0) / (os2.length || 1)
          return s + Math.round(ox * 100) / 100
        }, 0) /
          (os.length || 1)) *
          100
      ) / 100
    const e = expected[pop]
    console.log(
      pop,
      'owp',
      (ov * 100).toFixed(2),
      e.owp,
      'oowp',
      (oov * 100).toFixed(2),
      e.oowp
    )
  }
}
