import mongoose from 'mongoose'
import { buildUnifiedInferredStandings } from '@/lib/inferred-tdf-standings'
import { popidForStorage } from '@/lib/rut-chile'
import {
  buildMatchRecordsFromMatches,
  type ParsedMatch,
  type ParsedPlayer
} from '@/lib/tournament-xml'
import OnlineTableMatchReport from '@/models/OnlineTableMatchReport'
import type {
  IRoundSnapshot,
  ITournamentCategoryStandings,
  IWeeklyParticipant
} from '@/models/WeeklyEvent'

function toParsedPlayer(popId: string, displayName?: string): ParsedPlayer {
  const name = typeof displayName === 'string' ? displayName.trim() : ''
  const parts = name ? name.split(/\s+/) : []
  return {
    popId,
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    birthdate: '',
    starter: false,
    creationDate: '',
    lastModifiedDate: ''
  }
}

function byeMatchesFromSnapshots(
  snapshots: IRoundSnapshot[],
  reportKeys: ReadonlySet<string>
): ParsedMatch[] {
  const matches: ParsedMatch[] = []
  const byeCredits = new Set<string>()
  for (const snap of snapshots) {
    const roundNum = Math.max(0, Math.round(Number(snap.roundNum) || 0))
    for (const row of snap.pairings ?? []) {
      const table =
        typeof row.tableNumber === 'string' ? row.tableNumber.trim() : ''
      if (!table) continue
      const key = `${roundNum}:${table}`
      if (reportKeys.has(key)) continue

      const p1 = popidForStorage(row.player1PopId ?? '')
      const p2 = popidForStorage(row.player2PopId ?? '')
      const isBye = Boolean(row.isBye) || !p2
      if (!p1 || !isBye || byeCredits.has(p1)) continue

      byeCredits.add(p1)
      matches.push({
        roundNumber: roundNum,
        roundType: 'swiss',
        roundStage: '',
        outcome: '1',
        player1UserId: p1,
        player2UserId: '',
        timestamp: '',
        tableNumber: table
      })
    }
  }
  return matches
}

function matchesFromVerifiedReports(
  reports: {
    roundNum: number
    tableNumber: string
    player1PopId: string
    player2PopId: string
    winnerPopId?: string | null
  }[]
): ParsedMatch[] {
  const matches: ParsedMatch[] = []
  for (const rep of reports) {
    const p1 = popidForStorage(rep.player1PopId)
    const p2 = popidForStorage(rep.player2PopId)
    if (!p1 || !p2) continue
    const winner = popidForStorage(rep.winnerPopId ?? '')
    matches.push({
      roundNumber: Math.max(0, Math.round(Number(rep.roundNum) || 0)),
      roundType: 'swiss',
      roundStage: '',
      outcome: winner === p2 ? '2' : '1',
      player1UserId: p1,
      player2UserId: p2,
      timestamp: '',
      tableNumber:
        typeof rep.tableNumber === 'string' ? rep.tableNumber.trim() : ''
    })
  }
  return matches
}

/**
 * Clasificación unificada (Sénior) para torneos online cerrados:
 * partidas verificadas + byes, con desempates OWP/OOWP.
 */
export async function buildOnlineTournamentStandings(args: {
  eventId: mongoose.Types.ObjectId
  participants: IWeeklyParticipant[]
  roundSnapshots?: IRoundSnapshot[]
}): Promise<ITournamentCategoryStandings[]> {
  const reports = await OnlineTableMatchReport.find({
    eventId: args.eventId,
    status: 'verified'
  })
    .select('roundNum tableNumber player1PopId player2PopId winnerPopId')
    .lean<
      {
        roundNum: number
        tableNumber: string
        player1PopId: string
        player2PopId: string
        winnerPopId?: string | null
      }[]
    >()

  const reportKeys = new Set(
    reports.map(r => `${r.roundNum}:${r.tableNumber.trim()}`)
  )

  const matches = [
    ...matchesFromVerifiedReports(reports),
    ...byeMatchesFromSnapshots(args.roundSnapshots ?? [], reportKeys)
  ]

  const players: ParsedPlayer[] = []
  const seen = new Set<string>()
  for (const p of args.participants) {
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!pop || seen.has(pop)) continue
    seen.add(pop)
    players.push(
      toParsedPlayer(
        pop,
        typeof p.displayName === 'string' ? p.displayName : undefined
      )
    )
  }

  const matchRecords = buildMatchRecordsFromMatches(matches)
  return buildUnifiedInferredStandings(
    players,
    matchRecords,
    matches
  ) as ITournamentCategoryStandings[]
}
