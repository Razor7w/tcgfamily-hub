import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  playPokemonLeaderboardEnabled,
  playPokemonLeaderboardSeasonLabel
} from '@/lib/play-pokemon-leaderboard/constants'
import { loadApprovedTeamRosterIndex } from '@/lib/teams/league-ranking'
import type {
  TeamTournamentPointsRankingRow,
  TeamTournamentPointsTopMember
} from '@/lib/teams/tournament-points-ranking'
import User from '@/models/User'

const TOP_MEMBERS_PER_TEAM = 3

export type TeamChampionshipPointsRankingResult = {
  enabled: boolean
  periodLabel: string
  rows: TeamTournamentPointsRankingRow[]
}

type LeanLinkedUser = {
  _id: mongoose.Types.ObjectId
  name?: string
  playPokemonLinkedDisplayName?: string | null
  playPokemonChampionshipPoints?: number | null
  playPokemonChampionshipRank?: number | null
}

function displayNameForLinkedUser(user: LeanLinkedUser): string {
  const name = typeof user.name === 'string' ? user.name.trim() : ''
  if (name) return name
  const linked =
    typeof user.playPokemonLinkedDisplayName === 'string'
      ? user.playPokemonLinkedDisplayName.trim()
      : ''
  return linked || 'Jugador'
}

/**
 * Ranking de equipos por el mejor miembro con Championship Points vinculados.
 * No es un ranking de jugadores independientes: el CP del top 1 posiciona al equipo.
 */
export async function buildTeamChampionshipPointsRanking(): Promise<TeamChampionshipPointsRankingResult> {
  const seasonLabel = playPokemonLeaderboardSeasonLabel()
  const enabled = playPokemonLeaderboardEnabled()

  if (!enabled) {
    return { enabled: false, periodLabel: seasonLabel, rows: [] }
  }

  await connectDB()

  const roster = await loadApprovedTeamRosterIndex()
  const userIds = [...roster.byUserId.keys()]

  if (userIds.length === 0) {
    return { enabled: true, periodLabel: seasonLabel, rows: [] }
  }

  const linkedUsers = await User.find({
    _id: {
      $in: userIds.map(id => new mongoose.Types.ObjectId(id))
    },
    playPokemonChampionshipRank: { $gte: 1 },
    playPokemonChampionshipPoints: { $gte: 0 }
  })
    .select(
      'name playPokemonLinkedDisplayName playPokemonChampionshipPoints playPokemonChampionshipRank'
    )
    .lean<LeanLinkedUser[]>()

  const cpByUserId = new Map<
    string,
    { displayName: string; points: number; championshipRank: number }
  >()

  for (const user of linkedUsers) {
    const points = user.playPokemonChampionshipPoints
    const championshipRank = user.playPokemonChampionshipRank
    if (typeof points !== 'number' || typeof championshipRank !== 'number') {
      continue
    }
    cpByUserId.set(String(user._id), {
      displayName: displayNameForLinkedUser(user),
      points,
      championshipRank
    })
  }

  const membersByTeam = new Map<string, string[]>()
  for (const member of roster.byUserId.values()) {
    const list = membersByTeam.get(member.teamId) ?? []
    list.push(member.userId)
    membersByTeam.set(member.teamId, list)
  }

  const teamRows: Omit<TeamTournamentPointsRankingRow, 'rank'>[] = []

  for (const [teamId, meta] of roster.teamMeta) {
    const memberIds = membersByTeam.get(teamId) ?? []
    const scored: TeamTournamentPointsTopMember[] = []

    for (const userId of memberIds) {
      const linked = cpByUserId.get(userId)
      if (!linked) continue
      const rosterMember = roster.byUserId.get(userId)
      scored.push({
        userId,
        displayName: rosterMember?.displayName ?? linked.displayName,
        points: linked.points
      })
    }

    if (scored.length === 0) continue

    scored.sort(
      (a, b) =>
        b.points - a.points || a.displayName.localeCompare(b.displayName, 'es')
    )

    const topMembers = scored.slice(0, TOP_MEMBERS_PER_TEAM)
    const best = topMembers[0]

    teamRows.push({
      teamId,
      name: meta.name,
      slug: meta.slug,
      logoUrl: meta.logoUrl,
      memberCount: roster.rosterSizeByTeam.get(teamId) ?? memberIds.length,
      totalPoints: best.points,
      topMembers
    })
  }

  teamRows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  )

  const rows: TeamTournamentPointsRankingRow[] = teamRows.map((row, index) => ({
    ...row,
    rank: index + 1
  }))

  return { enabled: true, periodLabel: seasonLabel, rows }
}
