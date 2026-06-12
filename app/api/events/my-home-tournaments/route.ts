import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildMyTournamentWeekItemFromLean } from '@/lib/build-my-tournament-week-item'
import type { MyHomeTournamentItem } from '@/lib/my-tournament-week-types'
import { aggregateWeeklyEventsForUserReport } from '@/lib/weekly-event-user-report-query'

const PER_STORE_LIMIT = 2

function storeNameFromLean(storeId: unknown): string {
  if (storeId && typeof storeId === 'object' && 'name' in storeId) {
    const name = (storeId as { name?: unknown }).name
    if (typeof name === 'string' && name.trim()) return name.trim()
  }
  return 'Tienda'
}

function storeKeyFor(t: MyHomeTournamentItem): string {
  return t.storeName.trim().toLowerCase() || 'unknown'
}

function limitPerStore(
  items: MyHomeTournamentItem[],
  maxPerStore: number,
  /** Próximos: más cercano primero; finalizados: más reciente primero. */
  sortDir: 'asc' | 'desc' = 'asc'
): MyHomeTournamentItem[] {
  const byStore = new Map<string, MyHomeTournamentItem[]>()
  for (const t of items) {
    const key = storeKeyFor(t)
    const list = byStore.get(key) ?? []
    list.push(t)
    byStore.set(key, list)
  }

  const cmp = (a: MyHomeTournamentItem, b: MyHomeTournamentItem) => {
    const ta = new Date(a.startsAt).getTime()
    const tb = new Date(b.startsAt).getTime()
    return sortDir === 'asc' ? ta - tb : tb - ta
  }

  const out: MyHomeTournamentItem[] = []
  for (const list of byStore.values()) {
    const sorted = [...list].sort(cmp)
    out.push(...sorted.slice(0, maxPerStore))
  }
  return out.sort(cmp)
}

/** Un torneo finalizado por tienda (el más reciente en cada una). */
function lastFinishedPerStore(
  items: MyHomeTournamentItem[]
): MyHomeTournamentItem[] {
  return limitPerStore(items, 1, 'desc')
}

function mapToHomeItem(
  d: {
    state?: string
    storeId?: unknown
    tournamentOrigin?: string
  },
  base: NonNullable<ReturnType<typeof buildMyTournamentWeekItemFromLean>>,
  registrationKind: MyHomeTournamentItem['registrationKind']
): MyHomeTournamentItem {
  const storeName = storeNameFromLean(d.storeId)
  return {
    ...base,
    storeName,
    registrationKind
  }
}

/**
 * Torneos del inicio: preinscripciones activas + último finalizado por tienda.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id as string
    const userPopId =
      typeof (session.user as { popid?: string }).popid === 'string'
        ? (session.user as { popid: string }).popid
        : ''

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(userId)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    await connectDB()

    const participantFilter = {
      kind: 'tournament' as const,
      tournamentOrigin: { $ne: 'custom' as const },
      participants: { $elemMatch: { userId: uid } }
    }

    const [upcomingDocs, finishedDocs] = await Promise.all([
      aggregateWeeklyEventsForUserReport(
        {
          ...participantFilter,
          state: { $in: ['schedule', 'running'] }
        },
        uid,
        { sort: { startsAt: 1 }, limit: 80, lookupStore: true }
      ),
      aggregateWeeklyEventsForUserReport(
        {
          ...participantFilter,
          state: 'close'
        },
        uid,
        { sort: { startsAt: -1 }, limit: 80, lookupStore: true }
      )
    ])

    const allUpcoming = upcomingDocs
      .map(d => {
        const base = buildMyTournamentWeekItemFromLean(d, userId, userPopId)
        if (!base || base.state === 'close') return null
        return mapToHomeItem(d, base, 'pre_registered')
      })
      .filter((x): x is MyHomeTournamentItem => x !== null)

    const preRegisteredCount = allUpcoming.length
    const tournaments = limitPerStore(allUpcoming, PER_STORE_LIMIT)
    const hiddenCount = allUpcoming.length - tournaments.length

    const allFinished = finishedDocs
      .map(d => {
        const base = buildMyTournamentWeekItemFromLean(d, userId, userPopId)
        if (!base) return null
        return mapToHomeItem(d, base, 'finished')
      })
      .filter((x): x is MyHomeTournamentItem => x !== null)

    const finishedCount = allFinished.length
    const finishedTournaments = lastFinishedPerStore(allFinished)

    return NextResponse.json(
      {
        tournaments,
        preRegisteredCount,
        hiddenCount,
        finishedTournaments,
        finishedCount
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/events/my-home-tournaments:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneos' },
      { status: 500 }
    )
  }
}
