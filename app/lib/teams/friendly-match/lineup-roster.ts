import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { canManageTeam, getMembershipForUserOnTeam } from '@/lib/teams/access'
import {
  resolveFriendlyLineupSize,
  isFriendlyMatchIntramural
} from '@/lib/teams/friendly-match/constants'
import { buildFriendlyMatchDuelsForSlot } from '@/lib/teams/friendly-match/generate-duels'
import type { FriendlyLineupSlot } from '@/lib/teams/friendly-match/generate-duels'
import { refreshFriendlyMatchScore } from '@/lib/teams/friendly-match/lifecycle'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'
import TeamFriendlyMatchDuel from '@/models/TeamFriendlyMatchDuel'
import TeamMembership from '@/models/TeamMembership'

const ACTIVE_MATCH_STATUSES = ['pending', 'in_progress', 'disputed'] as const

type LineupSide = 'challenger' | 'opponent'

function leanLineupToSlots(
  rows: { userId?: mongoose.Types.ObjectId; slot: number }[]
): FriendlyLineupSlot[] {
  return rows.map(row => ({
    userId: row.userId ? String(row.userId) : '',
    slot: row.slot
  }))
}

function isSlotVacant(
  lineup: {
    userId?: mongoose.Types.ObjectId
    vacantSince?: Date
    slot: number
  }[],
  slot: number
): boolean {
  const row = lineup.find(r => r.slot === slot)
  if (!row) return false
  return row.userId == null || row.vacantSince != null
}

function findPlayerSlot(
  lineup: { userId?: mongoose.Types.ObjectId; slot: number }[],
  userId: string
): number | null {
  const row = lineup.find(r => r.userId != null && String(r.userId) === userId)
  return row != null ? row.slot : null
}

export async function vacatePlayerFromTeamFriendlyMatches(
  teamId: mongoose.Types.ObjectId,
  userId: string
): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0

  await connectDB()
  const userOid = new mongoose.Types.ObjectId(userId)

  const matches = await TeamFriendlyMatch.find({
    status: { $in: [...ACTIVE_MATCH_STATUSES] },
    $or: [
      { challengerTeamId: teamId, 'challengerLineup.userId': userOid },
      { opponentTeamId: teamId, 'opponentLineup.userId': userOid }
    ]
  })

  let vacated = 0

  for (const match of matches) {
    const teamStr = String(teamId)
    let side: LineupSide | null = null
    let slot: number | null = null

    if (String(match.challengerTeamId) === teamStr) {
      slot = findPlayerSlot(match.challengerLineup ?? [], userId)
      if (slot != null) side = 'challenger'
    }
    if (side == null && String(match.opponentTeamId) === teamStr) {
      slot = findPlayerSlot(match.opponentLineup ?? [], userId)
      if (slot != null) side = 'opponent'
    }

    if (side == null || slot == null) continue

    const lineupKey =
      side === 'challenger' ? 'challengerLineup' : 'opponentLineup'
    const lineup = [...(match[lineupKey] ?? [])]
    const idx = lineup.findIndex(r => r.slot === slot)
    if (idx < 0) continue

    lineup[idx] = {
      slot,
      userId: undefined,
      vacantSince: new Date()
    }
    match[lineupKey] = lineup as typeof match.challengerLineup
    await match.save()

    if (match.status !== 'pending') {
      await TeamFriendlyMatchDuel.deleteMany({
        matchId: match._id,
        $or: [{ challengerUserId: userOid }, { opponentUserId: userOid }]
      })
      await refreshFriendlyMatchScore(match._id as mongoose.Types.ObjectId)
    }

    vacated += 1
  }

  return vacated
}

export async function replaceFriendlyMatchLineupSlot(input: {
  matchId: mongoose.Types.ObjectId
  managerUserId: string
  side: LineupSide
  slot: number
  newUserId: string
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (
    !mongoose.Types.ObjectId.isValid(input.newUserId) ||
    input.slot < 0 ||
    !Number.isInteger(input.slot)
  ) {
    return { ok: false, error: 'Datos inválidos', status: 400 }
  }

  await connectDB()

  const match = await TeamFriendlyMatch.findById(input.matchId)
  if (!match) {
    return { ok: false, error: 'Match no encontrado', status: 404 }
  }

  const lineupSize = resolveFriendlyLineupSize(match)
  if (input.slot > lineupSize - 1) {
    return { ok: false, error: 'Datos inválidos', status: 400 }
  }

  if (
    !ACTIVE_MATCH_STATUSES.includes(
      match.status as (typeof ACTIVE_MATCH_STATUSES)[number]
    )
  ) {
    return { ok: false, error: 'El versus ya no está activo', status: 400 }
  }

  const sideTeamId =
    input.side === 'challenger'
      ? (match.challengerTeamId as mongoose.Types.ObjectId)
      : (match.opponentTeamId as mongoose.Types.ObjectId)

  const managerMembership = await getMembershipForUserOnTeam(
    input.managerUserId,
    sideTeamId
  )
  if (!managerMembership || !canManageTeam(managerMembership.role)) {
    return { ok: false, error: 'No autorizado', status: 403 }
  }

  const lineupKey =
    input.side === 'challenger' ? 'challengerLineup' : 'opponentLineup'
  const otherKey =
    input.side === 'challenger' ? 'opponentLineup' : 'challengerLineup'
  const lineup = [...(match[lineupKey] ?? [])]
  const otherLineup = match[otherKey] ?? []
  const idx = lineup.findIndex(r => r.slot === input.slot)

  if (idx < 0 || !isSlotVacant(lineup, input.slot)) {
    return { ok: false, error: 'Ese slot no está vacante', status: 400 }
  }

  const newUserOid = new mongoose.Types.ObjectId(input.newUserId)
  const isMember = await TeamMembership.exists({
    teamId: sideTeamId,
    userId: newUserOid,
    status: 'active'
  })
  if (!isMember) {
    return {
      ok: false,
      error: 'El jugador debe ser miembro activo del equipo',
      status: 400
    }
  }

  const allAssigned = [...lineup, ...otherLineup]
    .filter(r => r.userId != null && !isSlotVacant([r], r.slot))
    .map(r => String(r.userId))

  if (allAssigned.includes(input.newUserId)) {
    return {
      ok: false,
      error: isFriendlyMatchIntramural(match)
        ? 'Ese jugador ya está en otra escuadra de este versus'
        : 'Ese jugador ya está en la alineación',
      status: 400
    }
  }

  lineup[idx] = {
    slot: input.slot,
    userId: newUserOid,
    vacantSince: undefined
  }
  match[lineupKey] = lineup as typeof match.challengerLineup

  if (match.status !== 'pending') {
    const challengerSlots = leanLineupToSlots(match.challengerLineup ?? [])
    const opponentSlots = leanLineupToSlots(match.opponentLineup ?? [])
    const maxDuel = await TeamFriendlyMatchDuel.findOne({ matchId: match._id })
      .sort({ duelIndex: -1 })
      .select('duelIndex')
      .lean<{ duelIndex: number } | null>()
    const startIndex = (maxDuel?.duelIndex ?? -1) + 1

    const seeds = buildFriendlyMatchDuelsForSlot(
      input.side,
      input.slot,
      input.newUserId,
      challengerSlots,
      opponentSlots,
      startIndex,
      lineupSize
    )

    if (seeds.length > 0) {
      await TeamFriendlyMatchDuel.insertMany(
        seeds.map(seed => ({
          matchId: match._id,
          duelIndex: seed.duelIndex,
          roundNumber: seed.roundNumber,
          challengerUserId: new mongoose.Types.ObjectId(seed.challengerUserId),
          opponentUserId: new mongoose.Types.ObjectId(seed.opponentUserId),
          challengerSlot: seed.challengerSlot,
          opponentSlot: seed.opponentSlot,
          status: 'pending_reports'
        }))
      )
    }

    if (match.status === 'disputed') {
      match.status = 'in_progress'
      match.completedAt = undefined
      match.winnerTeamId = undefined
    }
  }

  await match.save()

  if (match.status !== 'pending') {
    await refreshFriendlyMatchScore(match._id as mongoose.Types.ObjectId)
  }

  return { ok: true }
}
