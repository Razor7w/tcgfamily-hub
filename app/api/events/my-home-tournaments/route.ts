import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildMyTournamentWeekItemFromLean } from '@/lib/build-my-tournament-week-item'
import type { MyHomeTournamentItem } from '@/lib/my-tournament-week-types'
import WeeklyEvent from '@/models/WeeklyEvent'

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
  maxPerStore: number
): MyHomeTournamentItem[] {
  const byStore = new Map<string, MyHomeTournamentItem[]>()
  for (const t of items) {
    const key = storeKeyFor(t)
    const list = byStore.get(key) ?? []
    list.push(t)
    byStore.set(key, list)
  }

  const out: MyHomeTournamentItem[] = []
  for (const list of byStore.values()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
    out.push(...sorted.slice(0, maxPerStore))
  }
  return out.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )
}

/**
 * Torneos del inicio: solo preinscripciones activas (programado / en curso, sin finalizar).
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

    const docs = await WeeklyEvent.find({
      kind: 'tournament',
      tournamentOrigin: { $ne: 'custom' },
      state: { $in: ['schedule', 'running'] },
      participants: { $elemMatch: { userId: uid } }
    })
      .populate({ path: 'storeId', select: 'name slug' })
      .sort({ startsAt: 1 })
      .limit(80)
      .lean()

    const allItems = docs
      .map(d => {
        const base = buildMyTournamentWeekItemFromLean(d, userId, userPopId)
        if (!base) return null
        if (base.state === 'close') return null
        const storeName = storeNameFromLean(d.storeId)
        return {
          ...base,
          storeName,
          registrationKind: 'pre_registered'
        } satisfies MyHomeTournamentItem
      })
      .filter((x): x is MyHomeTournamentItem => x !== null)

    const preRegisteredCount = allItems.length
    const tournaments = limitPerStore(allItems, PER_STORE_LIMIT)
    const hiddenCount = allItems.length - tournaments.length

    return NextResponse.json(
      { tournaments, preRegisteredCount, hiddenCount },
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
