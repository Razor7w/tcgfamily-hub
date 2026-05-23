import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { popidForStorage } from '@/lib/rut-chile'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import { LEGACY_IMPORT_EVENT_TITLE_PREFIX } from '@/lib/tournament-points-legacy-label'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'
import type { MyTournamentPointsEntry } from '@/lib/tournament-points-public'
import mongoose from 'mongoose'

export async function GET() {
  try {
    const session = await auth()
    const uid = session?.user?.id
    const activeStoreId = (
      session?.user as { activeStoreId?: string } | undefined
    )?.activeStoreId

    if (!uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (
      !activeStoreId ||
      !mongoose.Types.ObjectId.isValid(activeStoreId.trim())
    ) {
      return NextResponse.json(
        { error: 'Selecciona una tienda activa' },
        { status: 400 }
      )
    }

    const storeOid = new mongoose.Types.ObjectId(activeStoreId.trim())

    await connectDB()
    const enabled = await isTournamentPointsEnabledForStore(
      activeStoreId.trim()
    )
    if (!enabled) {
      return NextResponse.json(
        {
          enabled: false,
          totalPoints: 0,
          entries: [] as MyTournamentPointsEntry[]
        },
        { status: 200 }
      )
    }

    const user = await User.findById(uid).select('popid').lean<{
      popid?: string
    } | null>()
    const userPop = popidForStorage(user?.popid ?? '')
    const userOid = new mongoose.Types.ObjectId(uid)

    const awards = (await TournamentPointsAward.find({ storeId: storeOid })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean()) as unknown as (ITournamentPointsAward & {
      createdAt?: Date
      _id: mongoose.Types.ObjectId
    })[]

    const eventIds = awards.map(a => a.eventId).filter(Boolean)
    const eventDates = new Map<
      string,
      { startsAt: Date | null; title: string }
    >()
    if (eventIds.length > 0) {
      const events = await WeeklyEvent.find({ _id: { $in: eventIds } })
        .select('startsAt title')
        .lean()
      for (const ev of events) {
        eventDates.set(String(ev._id), {
          startsAt:
            ev.startsAt instanceof Date
              ? ev.startsAt
              : new Date(ev.startsAt as unknown as string),
          title: String(ev.title ?? '')
        })
      }
    }

    const entries: MyTournamentPointsEntry[] = []
    let totalPoints = 0

    for (const award of awards) {
      const eid = String(award.eventId)
      const meta = eventDates.get(eid)
      const awardedAt =
        award.createdAt instanceof Date ? award.createdAt.toISOString() : null

      for (const row of award.rows ?? []) {
        const rowPop = popidForStorage(row.popId)
        const rowUser =
          row.userId instanceof mongoose.Types.ObjectId
            ? row.userId.equals(userOid)
            : row.userId != null && String(row.userId) === uid

        if (!rowUser && (!userPop || rowPop !== userPop)) continue

        const pts = Math.max(0, Math.round(Number(row.points) || 0))
        totalPoints += pts
        const eventTitle = award.eventTitle || meta?.title || 'Torneo'
        const legacyImport =
          meta?.title?.startsWith(LEGACY_IMPORT_EVENT_TITLE_PREFIX) ?? false
        const displayStartsAt =
          legacyImport && awardedAt
            ? awardedAt
            : meta?.startsAt
              ? meta.startsAt.toISOString()
              : awardedAt

        entries.push({
          eventId: eid,
          eventTitle,
          startsAt: displayStartsAt,
          place: Math.round(Number(row.place) || 0),
          points: pts,
          awardedAt
        })
      }
    }

    entries.sort((a, b) => {
      const ta = a.startsAt ? new Date(a.startsAt).getTime() : 0
      const tb = b.startsAt ? new Date(b.startsAt).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(
      { enabled: true, totalPoints, entries },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/me/tournament-points:', error)
    return NextResponse.json(
      { error: 'Error al cargar puntos por torneo' },
      { status: 500 }
    )
  }
}
