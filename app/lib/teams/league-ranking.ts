import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { popidForStorage } from '@/lib/rut-chile'
import {
  aggregateLeagueStandings,
  leagueMergeSource,
  pointsFromWLRecord,
  type LeanEventForLeague,
  type LeagueStandingRow
} from '@/lib/league-aggregate'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import {
  TEAM_LEAGUE_ROLE_WEIGHTS,
  TEAM_ROLE_LABELS,
  type TeamRole
} from '@/lib/teams/constants'
import { getApprovedTeamFilter } from '@/lib/teams/access'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { weeklyEventLeagueAggregateProjection } from '@/lib/weekly-event-query-projections'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'
import User from '@/models/User'
import League from '@/models/League'
import Store from '@/models/Store'
import WeeklyEvent from '@/models/WeeklyEvent'

export type TeamLeagueMemberContribution = {
  userId: string
  displayName: string
  role: TeamRole
  roleLabel: string
  weight: number
  totalPoints: number
  weightedPoints: number
  eventsPlayed: number
}

export type TeamLeagueEventDetail = {
  eventId: string
  title: string
  startsAt: string
  points: number
  memberCount: number
}

export type TeamLeagueStandingRow = {
  teamId: string
  name: string
  slug: string
  logoUrl: string
  totalPoints: number
  membersContributing: number
  rosterSize: number
  members: TeamLeagueMemberContribution[]
  events: TeamLeagueEventDetail[]
}

export type TeamLeagueResultDTO = {
  leagueId: string
  leagueName: string
  leagueSlug: string
  storeName: string
  storeSlug: string
  rank: number
  teamsInLeague: number
  totalPoints: number
  membersContributing: number
  rosterSize: number
  members: TeamLeagueMemberContribution[]
  events: TeamLeagueEventDetail[]
}

type TeamMeta = {
  teamId: string
  name: string
  slug: string
  logoUrl: string
}

type RosterMember = TeamMeta & {
  userId: string
  displayName: string
  role: TeamRole
  popId: string
}

export type TeamRosterIndex = {
  byUserId: Map<string, RosterMember>
  byPopId: Map<string, RosterMember>
  teamMeta: Map<string, TeamMeta>
  rosterSizeByTeam: Map<string, number>
}

export async function loadApprovedTeamRosterIndex(): Promise<TeamRosterIndex> {
  await connectDB()

  const teams = await Team.find(getApprovedTeamFilter())
    .select('name slug logoUrl')
    .lean<
      {
        _id: mongoose.Types.ObjectId
        name: string
        slug: string
        logoUrl?: string
      }[]
    >()

  const teamMeta = new Map<string, TeamMeta>()
  for (const t of teams) {
    const teamId = String(t._id)
    teamMeta.set(teamId, {
      teamId,
      name: t.name,
      slug: t.slug,
      logoUrl: typeof t.logoUrl === 'string' ? t.logoUrl.trim() : ''
    })
  }

  const teamIds = teams.map(t => t._id)
  if (teamIds.length === 0) {
    return {
      byUserId: new Map(),
      byPopId: new Map(),
      teamMeta,
      rosterSizeByTeam: new Map()
    }
  }

  const memberships = await TeamMembership.find({
    teamId: { $in: teamIds },
    status: 'active'
  })
    .select('teamId userId role')
    .lean<
      {
        teamId: mongoose.Types.ObjectId
        userId: mongoose.Types.ObjectId
        role: TeamRole
      }[]
    >()

  const rosterSizeByTeam = new Map<string, number>()
  for (const m of memberships) {
    const tid = String(m.teamId)
    rosterSizeByTeam.set(tid, (rosterSizeByTeam.get(tid) ?? 0) + 1)
  }

  const userIds = memberships.map(m => m.userId)
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('name email image popid')
          .lean<
            {
              _id: mongoose.Types.ObjectId
              name?: string
              email?: string
              image?: string
              popid?: string
            }[]
          >()
      : []

  const userById = new Map(users.map(u => [String(u._id), u]))
  const byUserId = new Map<string, RosterMember>()
  const byPopId = new Map<string, RosterMember>()

  for (const m of memberships) {
    const teamId = String(m.teamId)
    const meta = teamMeta.get(teamId)
    if (!meta) continue

    const userId = String(m.userId)
    const u = userById.get(userId)
    const { displayName } = ownerPublicDisplay(u ?? null)
    const popId = popidForStorage(typeof u?.popid === 'string' ? u.popid : '')

    const entry: RosterMember = {
      ...meta,
      userId,
      displayName,
      role: m.role,
      popId
    }
    byUserId.set(userId, entry)
    if (popId) byPopId.set(popId, entry)
  }

  return { byUserId, byPopId, teamMeta, rosterSizeByTeam }
}

async function loadSingleTeamRosterIndex(
  teamId: mongoose.Types.ObjectId
): Promise<TeamRosterIndex | null> {
  await connectDB()

  const team = await Team.findOne({ _id: teamId, ...getApprovedTeamFilter() })
    .select('name slug logoUrl')
    .lean<{
      _id: mongoose.Types.ObjectId
      name: string
      slug: string
      logoUrl?: string
    } | null>()
  if (!team) return null

  const teamIdStr = String(team._id)
  const teamMeta = new Map<string, TeamMeta>([
    [
      teamIdStr,
      {
        teamId: teamIdStr,
        name: team.name,
        slug: team.slug,
        logoUrl: typeof team.logoUrl === 'string' ? team.logoUrl.trim() : ''
      }
    ]
  ])

  const memberships = await TeamMembership.find({
    teamId: team._id,
    status: 'active'
  })
    .select('teamId userId role')
    .lean<
      {
        teamId: mongoose.Types.ObjectId
        userId: mongoose.Types.ObjectId
        role: TeamRole
      }[]
    >()

  const rosterSizeByTeam = new Map<string, number>([
    [teamIdStr, memberships.length]
  ])
  const userIds = memberships.map(m => m.userId)
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('name email image popid')
          .lean<
            {
              _id: mongoose.Types.ObjectId
              name?: string
              email?: string
              image?: string
              popid?: string
            }[]
          >()
      : []

  const userById = new Map(users.map(u => [String(u._id), u]))
  const byUserId = new Map<string, RosterMember>()
  const byPopId = new Map<string, RosterMember>()
  const meta = teamMeta.get(teamIdStr)!

  for (const m of memberships) {
    const userId = String(m.userId)
    const u = userById.get(userId)
    const { displayName } = ownerPublicDisplay(u ?? null)
    const popId = popidForStorage(typeof u?.popid === 'string' ? u.popid : '')
    const entry: RosterMember = {
      ...meta,
      userId,
      displayName,
      role: m.role,
      popId
    }
    byUserId.set(userId, entry)
    if (popId) byPopId.set(popId, entry)
  }

  return { byUserId, byPopId, teamMeta, rosterSizeByTeam }
}

function normalizeCountBestEvents(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  return null
}

async function loadClosedLeagueEvents(
  leagueId: mongoose.Types.ObjectId,
  effectiveStoreOid: mongoose.Types.ObjectId,
  primStoreOid: mongoose.Types.ObjectId | null
) {
  const evScope = mongoFilterByStore(effectiveStoreOid, primStoreOid) as Record<
    string,
    unknown
  >
  return WeeklyEvent.find({
    leagueId,
    tournamentOrigin: 'official',
    kind: 'tournament',
    state: 'close',
    ...evScope
  })
    .select(weeklyEventLeagueAggregateProjection)
    .sort({ startsAt: 1 })
    .lean()
}

function memberWeight(role: TeamRole): number {
  return TEAM_LEAGUE_ROLE_WEIGHTS[role] ?? 1
}

function buildTeamEventBreakdown(
  events: LeanEventForLeague[],
  roster: TeamRosterIndex
): Map<string, TeamLeagueEventDetail[]> {
  const byTeam = new Map<string, TeamLeagueEventDetail[]>()

  for (const ev of events) {
    const eventId = String(ev._id)
    const startsAtIso =
      ev.startsAt instanceof Date
        ? ev.startsAt.toISOString()
        : new Date(ev.startsAt as unknown as string).toISOString()
    const title = typeof ev.title === 'string' ? ev.title.trim() : 'Torneo'

    const teamPoints = new Map<string, number>()
    const teamMembers = new Map<string, Set<string>>()

    const { byPop } = leagueMergeSource(ev)
    for (const [popId, rec] of byPop) {
      if (rec.w + rec.l + rec.t === 0) continue
      const member = roster.byPopId.get(popId)
      if (!member) continue

      const pts =
        pointsFromWLRecord(rec.w, rec.l, rec.t) * memberWeight(member.role)
      const tid = member.teamId
      teamPoints.set(tid, (teamPoints.get(tid) ?? 0) + pts)
      const set = teamMembers.get(tid) ?? new Set<string>()
      set.add(member.userId)
      teamMembers.set(tid, set)
    }

    for (const [teamId, points] of teamPoints) {
      if (points <= 0) continue
      const list = byTeam.get(teamId) ?? []
      list.push({
        eventId,
        title,
        startsAt: startsAtIso,
        points,
        memberCount: teamMembers.get(teamId)?.size ?? 0
      })
      byTeam.set(teamId, list)
    }
  }

  for (const [teamId, list] of byTeam) {
    list.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
    byTeam.set(teamId, list)
  }

  return byTeam
}

/**
 * Puntos de equipo = suma ponderada por rol de los puntos de liga de cada miembro
 * (cada miembro ya respeta `countBestEvents` de la liga).
 */
export function aggregateTeamLeagueStandings(
  playerStandings: LeagueStandingRow[],
  roster: TeamRosterIndex,
  events: LeanEventForLeague[]
): TeamLeagueStandingRow[] {
  const memberByTeam = new Map<
    string,
    Map<string, TeamLeagueMemberContribution>
  >()
  const teamEventBreakdown = buildTeamEventBreakdown(events, roster)

  for (const row of playerStandings) {
    const member = roster.byPopId.get(row.popId)
    if (!member) continue

    const weight = memberWeight(member.role)
    const weightedPoints = row.totalPoints * weight
    const teamMembers = memberByTeam.get(member.teamId) ?? new Map()
    teamMembers.set(member.userId, {
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      roleLabel: TEAM_ROLE_LABELS[member.role],
      weight,
      totalPoints: row.totalPoints,
      weightedPoints,
      eventsPlayed: row.eventsPlayed
    })
    memberByTeam.set(member.teamId, teamMembers)
  }

  const rows: TeamLeagueStandingRow[] = []

  for (const [teamId, meta] of roster.teamMeta) {
    const membersMap = memberByTeam.get(teamId)
    const members = membersMap
      ? [...membersMap.values()].sort(
          (a, b) =>
            b.weightedPoints - a.weightedPoints ||
            a.displayName.localeCompare(b.displayName, 'es')
        )
      : []

    const totalPoints = members.reduce((s, m) => s + m.weightedPoints, 0)
    if (totalPoints <= 0 && members.length === 0) continue

    rows.push({
      teamId,
      name: meta.name,
      slug: meta.slug,
      logoUrl: meta.logoUrl,
      totalPoints,
      membersContributing: members.length,
      rosterSize: roster.rosterSizeByTeam.get(teamId) ?? members.length,
      members,
      events: teamEventBreakdown.get(teamId) ?? []
    })
  }

  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints || a.name.localeCompare(b.name, 'es')
  )

  return rows
}

export async function buildTeamLeagueResultsForTeam(
  teamId: mongoose.Types.ObjectId
): Promise<TeamLeagueResultDTO[]> {
  const teamRoster = await loadSingleTeamRosterIndex(teamId)
  if (!teamRoster) return []

  const teamIdStr = String(teamId)
  const memberOids = [...teamRoster.byUserId.keys()].map(
    id => new mongoose.Types.ObjectId(id)
  )
  const memberPopIds = [...teamRoster.byPopId.keys()]

  const participantFilters: Record<string, unknown>[] = []
  if (memberOids.length > 0) {
    participantFilters.push({ 'participants.userId': { $in: memberOids } })
  }
  if (memberPopIds.length > 0) {
    participantFilters.push({ 'participants.popId': { $in: memberPopIds } })
  }
  if (participantFilters.length === 0) return []

  await connectDB()
  const leagueIdRaws = await WeeklyEvent.distinct('leagueId', {
    kind: 'tournament',
    state: 'close',
    tournamentOrigin: 'official',
    leagueId: { $ne: null },
    $or: participantFilters
  })

  const leagueIds = leagueIdRaws
    .map(id => String(id).trim())
    .filter(id => mongoose.Types.ObjectId.isValid(id))
  if (leagueIds.length === 0) return []

  const leagues = await League.find({
    _id: { $in: leagueIds.map(id => new mongoose.Types.ObjectId(id)) },
    isActive: true
  })
    .select('name slug storeId countBestEvents')
    .lean<
      {
        _id: mongoose.Types.ObjectId
        name: string
        slug: string
        storeId?: mongoose.Types.ObjectId
        countBestEvents?: number | null
      }[]
    >()

  if (leagues.length === 0) return []

  const prim = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
    .select('_id name slug')
    .lean<{ _id: mongoose.Types.ObjectId; name: string; slug: string } | null>()

  const storeIds = new Set<string>()
  for (const league of leagues) {
    const sid =
      league.storeId != null
        ? String(league.storeId)
        : prim
          ? String(prim._id)
          : ''
    if (sid) storeIds.add(sid)
  }

  const stores =
    storeIds.size > 0
      ? await Store.find({
          _id: {
            $in: [...storeIds].map(id => new mongoose.Types.ObjectId(id))
          }
        })
          .select('name slug')
          .lean<
            { _id: mongoose.Types.ObjectId; name: string; slug: string }[]
          >()
      : []
  const storeById = new Map(stores.map(s => [String(s._id), s]))

  const fullRoster = await loadApprovedTeamRosterIndex()
  const results: TeamLeagueResultDTO[] = []

  for (const league of leagues) {
    const leagueOid = league._id as mongoose.Types.ObjectId
    const countBestEvents = normalizeCountBestEvents(league.countBestEvents)
    const effectiveStoreOid =
      league.storeId != null
        ? new mongoose.Types.ObjectId(league.storeId)
        : (prim?._id ?? leagueOid)

    const events = await loadClosedLeagueEvents(
      leagueOid,
      effectiveStoreOid,
      prim?._id ?? null
    )
    const leanEvents = events as LeanEventForLeague[]
    const playerStandings = aggregateLeagueStandings(
      leanEvents,
      countBestEvents
    )
    const teamStandings = aggregateTeamLeagueStandings(
      playerStandings,
      fullRoster,
      leanEvents
    )

    const teamRow = teamStandings.find(t => t.teamId === teamIdStr)
    if (!teamRow || teamRow.totalPoints <= 0) continue

    const rank = teamStandings.findIndex(t => t.teamId === teamIdStr) + 1
    const store =
      storeById.get(String(effectiveStoreOid)) ??
      (prim && String(prim._id) === String(effectiveStoreOid) ? prim : null)

    results.push({
      leagueId: String(league._id),
      leagueName: league.name,
      leagueSlug: league.slug,
      storeName: store?.name ?? '',
      storeSlug: store?.slug ?? '',
      rank,
      teamsInLeague: teamStandings.length,
      totalPoints: teamRow.totalPoints,
      membersContributing: teamRow.membersContributing,
      rosterSize: teamRow.rosterSize,
      members: teamRow.members,
      events: teamRow.events
    })
  }

  results.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.leagueName.localeCompare(b.leagueName, 'es')
  )

  return results
}
