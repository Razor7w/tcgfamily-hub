import {
  TEAM_FRIENDLY_DUEL_COUNT,
  TEAM_FRIENDLY_LINEUP_SIZE
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

/** Cada jugador del retador enfrenta a los 3 del rival (9 duelos). */
export function buildFriendlyMatchDuels(
  challengerLineup: FriendlyLineupSlot[],
  opponentLineup: FriendlyLineupSlot[]
): FriendlyDuelSeed[] {
  if (
    challengerLineup.length !== TEAM_FRIENDLY_LINEUP_SIZE ||
    opponentLineup.length !== TEAM_FRIENDLY_LINEUP_SIZE
  ) {
    throw new Error('Ambos equipos deben alinear exactamente 3 jugadores')
  }

  const bySlot = (lineup: FriendlyLineupSlot[]) => {
    const map = new Map<number, string>()
    for (const row of lineup) map.set(row.slot, row.userId)
    return map
  }

  const challengerBySlot = bySlot(challengerLineup)
  const opponentBySlot = bySlot(opponentLineup)

  const duels: FriendlyDuelSeed[] = []
  let duelIndex = 0

  for (let cSlot = 0; cSlot < TEAM_FRIENDLY_LINEUP_SIZE; cSlot += 1) {
    const challengerUserId = challengerBySlot.get(cSlot)
    if (!challengerUserId) {
      throw new Error('Lineup del retador incompleto')
    }

    for (let oSlot = 0; oSlot < TEAM_FRIENDLY_LINEUP_SIZE; oSlot += 1) {
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

  if (duels.length !== TEAM_FRIENDLY_DUEL_COUNT) {
    throw new Error('No se pudieron generar los duelos del match')
  }

  return duels
}
