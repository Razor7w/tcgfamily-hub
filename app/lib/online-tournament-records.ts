import mongoose from 'mongoose'
import { popidForStorage } from '@/lib/rut-chile'
import OnlineTableMatchReport from '@/models/OnlineTableMatchReport'
import type { IRoundSnapshot } from '@/models/WeeklyEvent'

type ParticipantLike = {
  popId?: string
  wins?: number
  losses?: number
  ties?: number
}

function bump(map: Map<string, number>, pop: string, delta = 1) {
  map.set(pop, (map.get(pop) ?? 0) + delta)
}

type OnlineRecordsDoc = {
  participants: ParticipantLike[]
  roundSnapshots?: IRoundSnapshot[]
  markModified: (path: string) => void
}

/**
 * Recalcula W/L de participantes online desde reportes verificados + byes en snapshots.
 * Los bye suman 1 victoria (máx. 1 por jugador); no hay derrota asociada.
 */
export async function recomputeOnlineParticipantRecords(args: {
  eventId: mongoose.Types.ObjectId
  participants: ParticipantLike[]
  roundSnapshots?: IRoundSnapshot[]
}): Promise<void> {
  const reports = await OnlineTableMatchReport.find({
    eventId: args.eventId,
    status: 'verified'
  })
    .select('player1PopId player2PopId winnerPopId')
    .lean()

  const wins = new Map<string, number>()
  const losses = new Map<string, number>()

  for (const rep of reports) {
    const p1 = popidForStorage(rep.player1PopId)
    const p2 = popidForStorage(rep.player2PopId)
    const winner = popidForStorage(rep.winnerPopId ?? '')
    if (!p1 || !p2 || !winner) continue
    if (winner === p1) {
      bump(wins, p1)
      bump(losses, p2)
    } else if (winner === p2) {
      bump(wins, p2)
      bump(losses, p1)
    }
  }

  const byeCredits = new Map<string, number>()
  for (const snap of args.roundSnapshots ?? []) {
    for (const row of snap.pairings ?? []) {
      const isBye = Boolean(row.isBye) || !row.player2PopId?.trim()
      if (!isBye) continue
      const p1 = popidForStorage(row.player1PopId ?? '')
      if (!p1) continue
      if ((byeCredits.get(p1) ?? 0) >= 1) continue
      bump(wins, p1)
      byeCredits.set(p1, 1)
    }
  }

  for (const p of args.participants) {
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!pop) continue
    p.wins = wins.get(pop) ?? 0
    p.losses = losses.get(pop) ?? 0
    p.ties = 0
  }
}

/** Recalcula récords y marca `participants` para que Mongoose persista W/L. */
export async function syncOnlineParticipantRecords(args: {
  eventId: mongoose.Types.ObjectId
  doc: OnlineRecordsDoc
}): Promise<void> {
  await recomputeOnlineParticipantRecords({
    eventId: args.eventId,
    participants: args.doc.participants,
    roundSnapshots: args.doc.roundSnapshots ?? []
  })
  args.doc.markModified('participants')
}
