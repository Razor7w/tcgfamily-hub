import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import '@/models/League'
import WeeklyEvent from '@/models/WeeklyEvent'
import type { WeeklyEventState } from '@/models/WeeklyEvent'
import {
  canPreRegisterNow,
  canUnregisterNow,
  pairingExtrasForUser
} from '@/lib/weekly-events'
import { santiagoDayKey } from '@/lib/santiago-day-key'
import {
  buildTournamentStandingsPublic,
  type TournamentStandingLean
} from '@/lib/weekly-event-public'
import { effectivePublicRoundNum } from '@/lib/dashboard-round-cap'

function publicLeagueFromLeanDoc(d: Record<string, unknown>): {
  name: string
  slug: string
} | null {
  const lr = d.leagueId
  if (!lr || typeof lr !== 'object' || lr === null) return null
  const o = lr as { name?: string; slug?: string; isActive?: boolean }
  if (o.isActive === false) return null
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const slug = typeof o.slug === 'string' ? o.slug.trim().toLowerCase() : ''
  if (!name || !slug) return null
  return { name, slug }
}

function toPublicEvent(
  doc: {
    _id: unknown
    startsAt: Date
    title: string
    kind: string
    game: string
    pokemonSubtype?: string
    state?: WeeklyEventState
    priceClp: number
    maxParticipants: number
    formatNotes: string
    prizesNotes: string
    location: string
    roundNum?: number
    dashboardRoundCap?: number
    tournamentStandings?: TournamentStandingLean[] | undefined
    participants: {
      _id: unknown
      displayName: string
      userId?: unknown
      confirmed?: boolean
      popId?: string
      table?: string
      opponentId?: string
      wins?: unknown
      losses?: unknown
      ties?: unknown
    }[]
  },
  now: Date,
  currentUserId?: string,
  currentUserPopId?: string,
  league: { name: string; slug: string } | null = null
) {
  const startsAt = doc.startsAt
  const roundNum = effectivePublicRoundNum(doc.roundNum, doc.dashboardRoundCap)
  const mine = currentUserId
    ? doc.participants.find(p => p.userId && String(p.userId) === currentUserId)
    : undefined
  const myRegistration = mine?.displayName ?? null
  const myAttendanceConfirmed = Boolean(mine?.confirmed)
  const { myTable, myOpponentName } = pairingExtrasForUser(
    doc.participants,
    currentUserId
  )
  const myMatchRecord = mine
    ? {
        wins: Math.max(0, Math.min(999, Math.round(Number(mine.wins) || 0))),
        losses: Math.max(
          0,
          Math.min(999, Math.round(Number(mine.losses) || 0))
        ),
        ties: Math.max(0, Math.min(999, Math.round(Number(mine.ties) || 0)))
      }
    : null
  const canUnregister =
    Boolean(myRegistration) &&
    canUnregisterNow(startsAt, now) &&
    !myAttendanceConfirmed &&
    doc.state !== 'running' &&
    doc.state !== 'close'

  const tournamentClosed = doc.kind === 'tournament' && doc.state === 'close'
  const myParticipantPopId =
    mine && typeof mine.popId === 'string' ? mine.popId : undefined
  const standingsPublic = tournamentClosed
    ? buildTournamentStandingsPublic(
        doc.tournamentStandings,
        doc.participants ?? [],
        currentUserPopId,
        myParticipantPopId
      )
    : null

  return {
    _id: String(doc._id),
    startsAt: startsAt.toISOString(),
    title: doc.title,
    kind: doc.kind,
    game: doc.game,
    pokemonSubtype: doc.pokemonSubtype ?? null,
    priceClp: doc.priceClp,
    maxParticipants: doc.maxParticipants,
    formatNotes: doc.formatNotes,
    prizesNotes: doc.prizesNotes,
    location: doc.location,
    state:
      doc.state === 'schedule' ||
      doc.state === 'running' ||
      doc.state === 'close'
        ? doc.state
        : 'schedule',
    roundNum,
    participantNames: doc.participants.map(p => p.displayName),
    participantCount: doc.participants.length,
    canPreRegister: canPreRegisterNow(startsAt, now),
    myRegistration,
    myAttendanceConfirmed,
    myTable,
    myOpponentName,
    myMatchRecord,
    canUnregister,
    ...(tournamentClosed
      ? {
          standingsTopByCategory: standingsPublic?.standingsTopByCategory ?? [],
          myTournamentPlacement: standingsPublic?.myTournamentPlacement ?? null
        }
      : {}),
    league
  }
}

/** Lista eventos en un rango de fechas (para la vista semanal). Requiere sesión. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userPopId =
      session.user &&
      typeof (session.user as { popid?: string }).popid === 'string'
        ? (session.user as { popid: string }).popid
        : ''

    const { searchParams } = new URL(request.url)
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')
    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: 'Parámetros from y to requeridos (ISO 8601)' },
        { status: 400 }
      )
    }

    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
    }

    const weekYmdsRaw = searchParams.get('weekYmds')
    const weekYmdSet =
      weekYmdsRaw && weekYmdsRaw.length > 0
        ? new Set(
            weekYmdsRaw
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          )
        : null

    await connectDB()
    const now = new Date()

    const PAD_MS = 72 * 60 * 60 * 1000
    const queryRange =
      weekYmdSet && weekYmdSet.size > 0
        ? {
            startsAt: {
              $gte: new Date(from.getTime() - PAD_MS),
              $lte: new Date(to.getTime() + PAD_MS)
            },
            tournamentOrigin: { $ne: 'custom' }
          }
        : {
            startsAt: { $gte: from, $lte: to },
            tournamentOrigin: { $ne: 'custom' }
          }

    let docs = await WeeklyEvent.find(queryRange)
      .populate({ path: 'leagueId', select: 'name slug isActive' })
      .sort({ startsAt: 1 })
      .lean()

    if (weekYmdSet && weekYmdSet.size > 0) {
      docs = docs.filter(d => {
        const at = d.startsAt
        if (!at) return false
        const key = santiagoDayKey(at as Date)
        return weekYmdSet.has(key)
      })
    }

    const events = docs.map(d => {
      const lean = d as Record<string, unknown>
      const league = publicLeagueFromLeanDoc(lean)
      return toPublicEvent(
        {
          _id: d._id,
          startsAt: d.startsAt,
          title: d.title,
          kind: d.kind,
          game: d.game,
          pokemonSubtype: d.pokemonSubtype,
          priceClp: d.priceClp,
          maxParticipants: d.maxParticipants,
          formatNotes: d.formatNotes ?? '',
          prizesNotes: d.prizesNotes ?? '',
          location: d.location ?? '',
          state: d.state,
          roundNum: d.roundNum,
          dashboardRoundCap: (d as { dashboardRoundCap?: number })
            .dashboardRoundCap,
          tournamentStandings: (
            d as { tournamentStandings?: TournamentStandingLean[] }
          ).tournamentStandings,
          participants: (d.participants ?? []) as unknown as {
            _id: unknown
            displayName: string
            userId?: unknown
            confirmed?: boolean
            popId?: string
            table?: string
            opponentId?: string
            wins?: unknown
            losses?: unknown
            ties?: unknown
          }[]
        },
        now,
        userId,
        userPopId,
        league
      )
    })

    return NextResponse.json({ events }, { status: 200 })
  } catch (error) {
    console.error('GET /api/events:', error)
    return NextResponse.json(
      { error: 'Error al obtener eventos' },
      { status: 500 }
    )
  }
}
