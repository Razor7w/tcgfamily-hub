import {
  friendlyDuelCount,
  type TeamFriendlyLineupSize
} from '@/lib/teams/friendly-match/constants'

export type FriendlyLineupSlot = {
  userId: string
  slot: number
}

export type FriendlyDuelSeed = {
  duelIndex: number
  roundNumber: number
  challengerUserId: string
  opponentUserId: string
  challengerSlot: number
  opponentSlot: number
}

/** Cada jugador del retador enfrenta a cada jugador del rival (lineup × lineup duelos). */
export function buildFriendlyMatchDuels(
  challengerLineup: FriendlyLineupSlot[],
  opponentLineup: FriendlyLineupSlot[],
  lineupSize: TeamFriendlyLineupSize
): FriendlyDuelSeed[] {
  if (
    challengerLineup.length !== lineupSize ||
    opponentLineup.length !== lineupSize
  ) {
    throw new Error(
      `Ambos equipos deben alinear exactamente ${lineupSize} jugadores`
    )
  }

  const bySlot = (lineup: FriendlyLineupSlot[]) => {
    const map = new Map<number, string>()
    for (const row of lineup) {
      if (row.userId?.trim()) map.set(row.slot, row.userId)
    }
    return map
  }

  const challengerBySlot = bySlot(challengerLineup)
  const opponentBySlot = bySlot(opponentLineup)

  const duels: FriendlyDuelSeed[] = []
  let duelIndex = 0

  for (let cSlot = 0; cSlot < lineupSize; cSlot += 1) {
    const challengerUserId = challengerBySlot.get(cSlot)
    if (!challengerUserId) {
      throw new Error('Lineup del retador incompleto')
    }

    for (let oSlot = 0; oSlot < lineupSize; oSlot += 1) {
      const opponentUserId = opponentBySlot.get(oSlot)
      if (!opponentUserId) {
        throw new Error('Lineup del rival incompleto')
      }
      if (challengerUserId === opponentUserId) {
        throw new Error(
          'Un jugador no puede enfrentarse a sí mismo en un duelo'
        )
      }

      duels.push({
        duelIndex,
        roundNumber: duelIndex + 1,
        challengerUserId,
        opponentUserId,
        challengerSlot: cSlot,
        opponentSlot: oSlot
      })
      duelIndex += 1
    }
  }

  if (duels.length !== friendlyDuelCount(lineupSize)) {
    throw new Error('No se pudieron generar los duelos del match')
  }

  return duels
}

function lineupUserIdAt(
  lineup: FriendlyLineupSlot[],
  slot: number
): string | null {
  const row = lineup.find(l => l.slot === slot)
  return row?.userId?.trim() ? row.userId : null
}

/** Duelos cruzados de un solo slot (tras reemplazo o alta parcial). */
export function buildFriendlyMatchDuelsForSlot(
  side: 'challenger' | 'opponent',
  slot: number,
  userId: string,
  challengerLineup: FriendlyLineupSlot[],
  opponentLineup: FriendlyLineupSlot[],
  startingDuelIndex: number,
  lineupSize: TeamFriendlyLineupSize
): FriendlyDuelSeed[] {
  const duels: FriendlyDuelSeed[] = []
  let duelIndex = startingDuelIndex

  if (side === 'challenger') {
    for (let oSlot = 0; oSlot < lineupSize; oSlot += 1) {
      const opponentUserId = lineupUserIdAt(opponentLineup, oSlot)
      if (!opponentUserId) continue
      duels.push({
        duelIndex,
        roundNumber: duelIndex + 1,
        challengerUserId: userId,
        opponentUserId,
        challengerSlot: slot,
        opponentSlot: oSlot
      })
      duelIndex += 1
    }
    return duels
  }

  for (let cSlot = 0; cSlot < lineupSize; cSlot += 1) {
    const challengerUserId = lineupUserIdAt(challengerLineup, cSlot)
    if (!challengerUserId) continue
    duels.push({
      duelIndex,
      roundNumber: duelIndex + 1,
      challengerUserId,
      opponentUserId: userId,
      challengerSlot: cSlot,
      opponentSlot: slot
    })
    duelIndex += 1
  }

  return duels
}
