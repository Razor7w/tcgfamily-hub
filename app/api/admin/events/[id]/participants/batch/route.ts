import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireAdminSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import { canPreRegisterNow, normalizeDisplayName } from '@/lib/weekly-events'
import { popidForStorage, validatePopidOptional } from '@/lib/rut-chile'

type Part = { userId?: mongoose.Types.ObjectId; popId?: string }

/**
 * POST — Preinscribir en lote (TDF): ignora duplicados en archivo y ya inscritos; respeta cupo.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const { id: eventId } = await context.params
    if (!eventId?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}
    const rawPlayers = rec.players
    if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array players no vacío' },
        { status: 400 }
      )
    }

    await connectDB()
    const now = new Date()

    const existing = await WeeklyEvent.findById(eventId.trim())
    if (!existing) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(existing)
    if (forbidden) return forbidden

    if (!canPreRegisterNow(existing.startsAt, now)) {
      return NextResponse.json(
        { error: 'La preinscripción ya cerró para este evento' },
        { status: 400 }
      )
    }

    const parts = existing.participants as Part[]
    const eventPopSet = new Set<string>()
    const eventUserSet = new Set<string>()
    for (const p of parts) {
      const ep = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
      if (ep) eventPopSet.add(ep)
      if (p.userId) eventUserSet.add(String(p.userId))
    }

    const seenInBatch = new Set<string>()
    type Prelim = { displayName: string; popNorm: string }
    const prelim: Prelim[] = []

    let skippedDuplicateInFile = 0
    let skippedInvalidPop = 0
    let skippedAlreadyRegistered = 0

    for (const row of rawPlayers) {
      if (typeof row !== 'object' || row === null) {
        skippedInvalidPop++
        continue
      }
      const r = row as Record<string, unknown>
      const displayName = normalizeDisplayName(r.displayName)
      const popIdRaw = typeof r.popId === 'string' ? r.popId : ''
      const popNorm = popidForStorage(popIdRaw)

      if (!displayName) {
        skippedInvalidPop++
        continue
      }
      if (!popNorm) {
        skippedInvalidPop++
        continue
      }

      const popErr = validatePopidOptional(popNorm)
      if (popErr) {
        skippedInvalidPop++
        continue
      }

      if (seenInBatch.has(popNorm)) {
        skippedDuplicateInFile++
        continue
      }
      seenInBatch.add(popNorm)

      if (eventPopSet.has(popNorm)) {
        skippedAlreadyRegistered++
        continue
      }

      prelim.push({ displayName, popNorm })
    }

    const uniquePops = [...new Set(prelim.map(p => p.popNorm))]
    const userDocs =
      uniquePops.length > 0
        ? await User.find({ popid: { $in: uniquePops } })
            .select('_id popid')
            .lean()
        : []
    const popToUserId = new Map<string, mongoose.Types.ObjectId>()
    for (const u of userDocs) {
      const pid = popidForStorage(typeof u.popid === 'string' ? u.popid : '')
      if (pid && u._id) {
        popToUserId.set(pid, u._id as mongoose.Types.ObjectId)
      }
    }

    type Row = {
      displayName: string
      popNorm: string
      userId?: mongoose.Types.ObjectId
    }
    const candidates: Row[] = []

    for (const row of prelim) {
      const uid = popToUserId.get(row.popNorm)
      if (uid && eventUserSet.has(String(uid))) {
        skippedAlreadyRegistered++
        continue
      }
      candidates.push({
        displayName: row.displayName,
        popNorm: row.popNorm,
        userId: uid
      })
    }

    const capacityLeft = existing.maxParticipants - parts.length
    if (capacityLeft <= 0 && candidates.length > 0) {
      return NextResponse.json(
        { error: 'Se alcanzó el cupo máximo del evento' },
        { status: 400 }
      )
    }

    let skippedCapacity = 0
    let rowsToAdd = candidates
    if (candidates.length > capacityLeft) {
      skippedCapacity = candidates.length - capacityLeft
      rowsToAdd = candidates.slice(0, capacityLeft)
    }

    for (const row of rowsToAdd) {
      existing.participants.push({
        displayName: row.displayName,
        userId: row.userId,
        createdAt: now,
        popId: row.popNorm,
        table: '',
        opponentId: ''
      })
    }

    if (rowsToAdd.length > 0) {
      await existing.save()
    }

    return NextResponse.json(
      {
        ok: true,
        added: rowsToAdd.length,
        skippedDuplicateInFile,
        skippedInvalidPop,
        skippedAlreadyRegistered,
        skippedCapacity,
        participantCount: existing.participants.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/admin/events/[id]/participants/batch:', error)
    return NextResponse.json(
      { error: 'Error al preinscribir en lote' },
      { status: 500 }
    )
  }
}
