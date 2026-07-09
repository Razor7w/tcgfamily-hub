import 'server-only'

import mongoose from 'mongoose'
import {
  friendlyLineupSlots,
  type TeamFriendlyDuelReport,
  type TeamFriendlyLineupSize
} from '@/lib/teams/friendly-match/constants'
import type { FriendlyLineupSlot } from '@/lib/teams/friendly-match/generate-duels'
import TeamMembership from '@/models/TeamMembership'

export function parseFriendlyLineupInput(
  raw: unknown,
  lineupSize: TeamFriendlyLineupSize
): { ok: true; lineup: FriendlyLineupSlot[] } | { ok: false; error: string } {
  const slots = friendlyLineupSlots(lineupSize)

  if (!Array.isArray(raw) || raw.length !== lineupSize) {
    return {
      ok: false,
      error: `Debes elegir exactamente ${lineupSize} jugadores`
    }
  }

  const lineup: FriendlyLineupSlot[] = []
  const seenUsers = new Set<string>()
  const seenSlots = new Set<number>()

  for (const item of raw) {
    const userId =
      typeof (item as { userId?: unknown })?.userId === 'string'
        ? (item as { userId: string }).userId.trim()
        : ''
    const slot = (item as { slot?: unknown })?.slot

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { ok: false, error: 'Jugador inválido en la alineación' }
    }
    if (
      typeof slot !== 'number' ||
      slot < 0 ||
      slot > lineupSize - 1 ||
      !Number.isInteger(slot)
    ) {
      return {
        ok: false,
        error: `Slot inválido (usa ${slots.join(', ')})`
      }
    }
    if (seenUsers.has(userId)) {
      return { ok: false, error: 'No repitas jugadores en la alineación' }
    }
    if (seenSlots.has(slot)) {
      return {
        ok: false,
        error: `Cada slot debe ser único (${slots.join(', ')})`
      }
    }

    seenUsers.add(userId)
    seenSlots.add(slot)
    lineup.push({ userId, slot })
  }

  if (seenSlots.size !== lineupSize) {
    return {
      ok: false,
      error: `Debes asignar los slots ${slots.join(', ')}`
    }
  }

  lineup.sort((a, b) => a.slot - b.slot)
  return { ok: true, lineup }
}

export async function assertLineupBelongsToTeam(
  teamId: mongoose.Types.ObjectId,
  lineup: FriendlyLineupSlot[],
  lineupSize: TeamFriendlyLineupSize
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userIds = lineup.map(l => new mongoose.Types.ObjectId(l.userId))
  const count = await TeamMembership.countDocuments({
    teamId,
    userId: { $in: userIds },
    status: 'active'
  })

  if (count !== lineupSize) {
    return {
      ok: false,
      error: 'La alineación debe incluir solo miembros activos del equipo'
    }
  }

  return { ok: true }
}

export function assertDisjointLineups(
  lineupA: FriendlyLineupSlot[],
  lineupB: FriendlyLineupSlot[]
): { ok: true } | { ok: false; error: string } {
  const idsA = new Set(lineupA.map(slot => slot.userId))
  for (const slot of lineupB) {
    if (idsA.has(slot.userId)) {
      return {
        ok: false,
        error: 'Cada jugador solo puede estar en una escuadra'
      }
    }
  }
  return { ok: true }
}

export async function assertIntramuralLineups(
  teamId: mongoose.Types.ObjectId,
  challengerLineup: FriendlyLineupSlot[],
  opponentLineup: FriendlyLineupSlot[],
  lineupSize: TeamFriendlyLineupSize
): Promise<{ ok: true } | { ok: false; error: string }> {
  const challengerCheck = await assertLineupBelongsToTeam(
    teamId,
    challengerLineup,
    lineupSize
  )
  if (!challengerCheck.ok) return challengerCheck

  const opponentCheck = await assertLineupBelongsToTeam(
    teamId,
    opponentLineup,
    lineupSize
  )
  if (!opponentCheck.ok) return opponentCheck

  return assertDisjointLineups(challengerLineup, opponentLineup)
}

export function parseDuelReport(
  raw: unknown
): { ok: true; report: TeamFriendlyDuelReport } | { ok: false; error: string } {
  if (raw !== 'win' && raw !== 'loss' && raw !== 'tie') {
    return { ok: false, error: 'Reporte inválido (win, loss o tie)' }
  }
  return { ok: true, report: raw }
}
