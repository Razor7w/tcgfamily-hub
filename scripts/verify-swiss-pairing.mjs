/**
 * Verificación manual del motor Swiss (sin DB).
 * node scripts/verify-swiss-pairing.mjs
 */
import {
  buildSwissPairingPools,
  generateSwissPairings,
  swissMatchPoints
} from '../app/lib/swiss-pairing.ts'

function mk(pop, w, l, t = 0) {
  return {
    popId: pop,
    displayName: pop,
    wins: w,
    losses: l,
    ties: t
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const five = [
  mk('90000001', 0, 2),
  mk('90000002', 3, 1),
  mk('90000003', 2, 2),
  mk('90000004', 0, 3),
  mk('90000005', 4, 0)
]

const pools = buildSwissPairingPools(five)
console.log(
  'Pools por puntos:',
  pools.map(p => p.map(x => `${x.popId}(${swissMatchPoints(x)})`).join(', '))
)

let history = []
for (let round = 1; round <= 5; round++) {
  const rows = generateSwissPairings({
    players: five,
    roundNum: round,
    previousPairings: history
  })
  console.log(`\nRonda ${round}:`)
  const byeByPop = new Map()
  for (const row of rows) {
    if (row.isBye) {
      byeByPop.set(row.player1PopId, (byeByPop.get(row.player1PopId) ?? 0) + 1)
      console.log(`  Mesa ${row.tableNumber}: ${row.player1PopId} BYE`)
    } else {
      console.log(
        `  Mesa ${row.tableNumber}: ${row.player1PopId} vs ${row.player2PopId}`
      )
    }
    history.push({
      player1PopId: row.player1PopId,
      player2PopId: row.player2PopId,
      isBye: row.isBye
    })
  }
  for (const [pop, n] of byeByPop) {
    assert(n <= 1, `${pop} recibió más de 1 bye en ronda ${round}`)
  }
  const keys = new Set()
  for (const row of rows) {
    if (row.isBye || !row.player2PopId) continue
    const k = [row.player1PopId, row.player2PopId].sort().join(':')
    assert(!keys.has(k), `Rematch en misma ronda ${round}: ${k}`)
    keys.add(k)
  }
}

console.log('\nOK: 5 rondas sin bye duplicado en misma ronda.')
