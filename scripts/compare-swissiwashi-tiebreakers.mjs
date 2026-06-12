/**
 * Compara OWP/OOWP de tcgfamily-hub vs fórmulas de jlgrimes/swissiwashi.
 * Uso: npx tsx scripts/compare-swissiwashi-tiebreakers.mjs <path.tdf>
 */
import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const tdfPath = process.argv[2]
if (!tdfPath) {
  console.error('Usage: npx tsx scripts/compare-swissiwashi-tiebreakers.mjs <path.tdf>')
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
  filterMatchesForTiebreakers,
  buildMatchRecordsExcludingByes,
  formatTiebreakerPercent
} = await import('../app/lib/tournament-tiebreakers.ts')

const parsed = parseTournamentXml(xml)
const n = parsed.players.length
const allMatches = parsed.matches
const swissMatches = filterMatchesForTiebreakers(allMatches, n)
const fullRecords = buildMatchRecordsFromMatches(allMatches)
// Swissiwashi no aplica cap 75 % a drops; TOM export tampoco en la práctica.
// Comparación sin droppedPopIds (igual que verify-tdf-tiebreakers.mjs).

// --- Swissiwashi-style (src.jsx) ---
function swissiwashiWinPct(player) {
  const resistanceWins = player.wins - player.byes
  const denom = resistanceWins + player.ties + player.losses
  if (denom <= 0) return 0.25
  return Math.max(
    0.25,
    (resistanceWins + player.ties / 2) / denom
  )
}

function swissiwashiResistance(player, byPop) {
  let total = 0
  let length = player.played.length
  for (const opp of player.played) {
    if (opp.name === 'bye') {
      length--
      continue
    }
    const o = byPop.get(opp.name)
    if (!o) continue
    total += swissiwashiWinPct(o)
  }
  if (length <= 0) return 25
  return Math.round((total / length) * 10000) / 100
}

function swissiwashiOppResistance(player, byPop, owpByPop) {
  let total = 0
  let length = player.played.length
  for (const opp of player.played) {
    if (opp.name === 'bye') {
      length--
      continue
    }
    total += owpByPop.get(opp.name) ?? 25
  }
  if (length <= 0) return 25
  return Math.round((total / length) * 100) / 100
}

function buildSwissiwashiPlayers(matches, players) {
  const byPop = new Map()

  for (const p of players) {
    byPop.set(p.popId.trim(), {
      name: p.popId.trim(),
      wins: 0,
      ties: 0,
      losses: 0,
      played: [],
      byes: 0
    })
  }

  for (const m of matches) {
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    const o = m.outcome.trim()

    if (u1 && !u2) {
      const pl = byPop.get(u1)
      if (pl) {
        pl.wins++
        pl.byes++
        pl.played.push({ name: 'bye', result: 'win' })
      }
      continue
    }
    if (!u1 || !u2) continue
    if (o !== '1' && o !== '2' && o !== '3') continue

    const p1 = byPop.get(u1)
    const p2 = byPop.get(u2)
    if (!p1 || !p2) continue

    if (o === '1') {
      p1.wins++
      p2.losses++
      p1.played.push({ name: u2, result: 'win' })
      p2.played.push({ name: u1, result: 'loss' })
    } else if (o === '2') {
      p2.wins++
      p1.losses++
      p1.played.push({ name: u2, result: 'loss' })
      p2.played.push({ name: u1, result: 'win' })
    } else {
      p1.ties++
      p2.ties++
      p1.played.push({ name: u2, result: 'tie' })
      p2.played.push({ name: u1, result: 'tie' })
    }
  }

  return byPop
}

const swissPlayers = buildSwissiwashiPlayers(swissMatches, parsed.players)
const swissOwp = new Map()
for (const [pop, pl] of swissPlayers) {
  swissOwp.set(pop, swissiwashiResistance(pl, swissPlayers))
}
const swissOowp = new Map()
for (const [pop, pl] of swissPlayers) {
  swissOowp.set(pop, swissiwashiOppResistance(pl, swissPlayers, swissOwp))
}

// --- tcgfamily-hub ---
const ours = buildPlayerTiebreakersFromMatches(
  allMatches,
  fullRecords,
  undefined,
  n,
  parsed.players,
  { sameCategoryOnly: false }
)

console.log(`TDF: ${tdfPath}`)
console.log(
  `players ${n} | all matches ${allMatches.length} | swiss matches ${swissMatches.length} | swiss rounds ${new Set(swissMatches.map(m => m.roundNumber)).size}`
)
console.log('')
console.log(
  'POP ID'.padEnd(10),
  'Nombre'.padEnd(22),
  'W-L-T'.padEnd(8),
  'Hub OWP'.padEnd(10),
  'Swiss OWP'.padEnd(10),
  'Δ OWP'.padEnd(8),
  'Hub OOWP'.padEnd(10),
  'Swiss OOWP'.padEnd(10),
  'Δ OOWP'
)
console.log('-'.repeat(110))

const nameByPop = new Map(
  parsed.players.map(p => [
    p.popId.trim(),
    `${p.firstName} ${p.lastName}`.trim()
  ])
)

let owpMatch = 0
let oowpMatch = 0
let compared = 0

const pops = [...swissPlayers.keys()].sort((a, b) => {
  const ta = ours.get(a)
  const tb = ours.get(b)
  return (tb?.matchPoints ?? 0) - (ta?.matchPoints ?? 0)
})

for (const pop of pops) {
  const rec = fullRecords.get(pop)
  const wlt = rec
    ? `${rec.wins}-${rec.losses}-${rec.ties}`
    : '?'
  const hub = ours.get(pop)
  const hubOwp = hub ? formatTiebreakerPercent(hub.owp) : '—'
  const hubOowp = hub ? formatTiebreakerPercent(hub.oowp) : '—'
  const swOwp = `${swissOwp.get(pop)?.toFixed(2) ?? '?'}%`
  const swOowp = `${swissOowp.get(pop)?.toFixed(2) ?? '?'}%`

  const hubOwpNum = (hub?.owp ?? 0) * 100
  const hubOowpNum = (hub?.oowp ?? 0) * 100
  const dOwp = Math.abs(hubOwpNum - (swissOwp.get(pop) ?? 0))
  const dOowp = Math.abs(hubOowpNum - (swissOowp.get(pop) ?? 0))

  if (rec && (rec.wins + rec.losses + rec.ties) > 0) {
    compared++
    if (dOwp < 0.02) owpMatch++
    if (dOowp < 0.02) oowpMatch++
  }

  const flag = dOwp >= 0.02 || dOowp >= 0.02 ? '≠' : ' '
  console.log(
    flag,
    pop.padEnd(10),
    (nameByPop.get(pop) ?? '').slice(0, 22).padEnd(22),
    wlt.padEnd(8),
    hubOwp.padEnd(10),
    swOwp.padEnd(10),
    dOwp.toFixed(2).padStart(6),
    hubOowp.padEnd(10),
    swOowp.padEnd(10),
    dOowp.toFixed(2).padStart(6)
  )
}

console.log('-'.repeat(110))
console.log(
  `Match (<0.02pp): OWP ${owpMatch}/${compared} | OOWP ${oowpMatch}/${compared}`
)
