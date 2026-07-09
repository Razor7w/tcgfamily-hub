import type { TeamFriendlyDuelReport } from '@/lib/teams/friendly-match/constants'

import type { TeamFriendlyMatchStatus } from '@/lib/teams/friendly-match/constants'

export type FriendlyLineupPlayerDTO = {
  userId: string | null
  displayName: string
  imageUrl: string | null
  slot: number
  vacant: boolean
}

export type FriendlyDuelDTO = {
  id: string
  duelIndex: number
  roundNumber: number
  challengerPlayer: FriendlyLineupPlayerDTO
  opponentPlayer: FriendlyLineupPlayerDTO
  status: 'pending_reports' | 'confirmed' | 'disputed'
  winnerUserId: string | null
  isDraw: boolean
  challengerReport: TeamFriendlyDuelReport | null
  opponentReport: TeamFriendlyDuelReport | null
  viewerCanReport: boolean
  viewerReport: TeamFriendlyDuelReport | null
}

export type FriendlyMatchTeamSummaryDTO = {
  teamId: string
  name: string
  slug: string
  logoUrl: string
  points: number
  lineup: FriendlyLineupPlayerDTO[]
}

export type TeamFriendlyMatchListItemDTO = {
  id: string
  status: TeamFriendlyMatchStatus
  statusLabel: string
  createdAt: string
  expiresAt: string | null
  challenger: FriendlyMatchTeamSummaryDTO
  opponent: FriendlyMatchTeamSummaryDTO
  winnerTeamId: string | null
  viewerSide: 'challenger' | 'opponent' | null
  viewerCanManage: boolean
  tier: 'social'
  isIntramural: boolean
  confirmedDuels: number
  totalDuels: number
  /** Capitán: reiniciar/eliminar solo versus amistoso aceptado (con rondas). */
  captainCanModerate: boolean
}

export type TeamFriendlyMatchDetailDTO = TeamFriendlyMatchListItemDTO & {
  pointsPerWin: number
  acceptedAt: string | null
  completedAt: string | null
  duels: FriendlyDuelDTO[]
}
