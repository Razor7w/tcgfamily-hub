import 'server-only'

import mongoose from 'mongoose'
import {
  aggregateTournamentPointsByPlayer,
  filterExcludedTournamentPointsPlayers,
  loadExcludedTournamentPointsIdentityKeys,
  type FlatPlayerPointsRow
} from '@/lib/tournament-points-admin'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'

export type PublicTournamentPointsRow = {
  rank: number
  displayName: string
  points: number
}

/**
 * Ranking público de saldo de puntos por torneo en una tienda
 * (excluye eliminados de la lista y jugadores con 0 puntos).
 */
export async function buildPublicStoreTournamentPointsLeaderboard(
  storeOid: mongoose.Types.ObjectId
): Promise<PublicTournamentPointsRow[]> {
  const awards = (await TournamentPointsAward.find({ storeId: storeOid })
    .select('eventTitle awardedAt createdAt rows')
    .lean()) as unknown as (ITournamentPointsAward & {
    _id: mongoose.Types.ObjectId
    createdAt?: Date
    awardedAt?: Date
  })[]

  const flatRows: FlatPlayerPointsRow[] = []
  for (const award of awards) {
    const awardedAtFromDoc = award.awardedAt
    const createdAt = award.createdAt
    const awardedAtIso =
      awardedAtFromDoc instanceof Date
        ? awardedAtFromDoc.toISOString()
        : createdAt instanceof Date
          ? createdAt.toISOString()
          : null
    const eventTitle =
      typeof award.eventTitle === 'string' && award.eventTitle.trim()
        ? award.eventTitle.trim()
        : 'Torneo'
    for (const row of award.rows ?? []) {
      const points = Number(row.points) || 0
      if (points <= 0) continue
      flatRows.push({
        awardId: String(award._id),
        eventTitle,
        awardedAt: awardedAtIso,
        popId: String(row.popId ?? ''),
        userId: row.userId ? String(row.userId) : null,
        displayName: String(row.displayName ?? '').trim() || 'Jugador',
        points
      })
    }
  }

  const excluded = await loadExcludedTournamentPointsIdentityKeys(storeOid)
  const players = filterExcludedTournamentPointsPlayers(
    await aggregateTournamentPointsByPlayer(flatRows),
    excluded
  )
    .filter(p => p.pointsTotal > 0)
    .sort((a, b) => {
      if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal
      return a.displayName.localeCompare(b.displayName, 'es', {
        sensitivity: 'base'
      })
    })

  return players.map((p, index) => ({
    rank: index + 1,
    displayName: p.displayName,
    points: p.pointsTotal
  }))
}
