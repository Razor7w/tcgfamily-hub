import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import { canPreRegisterNow, normalizeDisplayName } from '@/lib/weekly-events'
import { popidForStorage, validatePopidOptional } from '@/lib/rut-chile'

/**
 * POST — Preinscribir desde admin por nombre + POP ID (p. ej. import TDF). Evita duplicar POP ID o usuario.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    const displayName = normalizeDisplayName(rec.displayName)
    if (!displayName) {
      return NextResponse.json(
        { error: 'Ingresa un nombre válido' },
        { status: 400 }
      )
    }

    const popIdRaw = typeof rec.popId === 'string' ? rec.popId : ''
    const popNorm = popidForStorage(popIdRaw)
    if (!popNorm) {
      return NextResponse.json({ error: 'POP ID inválido' }, { status: 400 })
    }

    const popErr = validatePopidOptional(popNorm)
    if (popErr) {
      return NextResponse.json({ error: popErr }, { status: 400 })
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

    if (existing.participants.length >= existing.maxParticipants) {
      return NextResponse.json(
        { error: 'Se alcanzó el cupo máximo' },
        { status: 400 }
      )
    }

    type Part = { userId?: mongoose.Types.ObjectId; popId?: string }
    const parts = existing.participants as Part[]

    for (const p of parts) {
      const existingPop = popidForStorage(
        typeof p.popId === 'string' ? p.popId : ''
      )
      if (existingPop === popNorm) {
        return NextResponse.json(
          { error: 'Este POP ID ya está en el listado del evento' },
          { status: 400 }
        )
      }
    }

    const userDoc = await User.findOne({ popid: popNorm }).select('_id')
    const linkedId = userDoc?._id
    if (linkedId) {
      const uid = String(linkedId)
      const dupUser = parts.some(
        p => p.userId != null && String(p.userId) === uid
      )
      if (dupUser) {
        return NextResponse.json(
          { error: 'Este usuario ya está preinscrito en el evento' },
          { status: 400 }
        )
      }
    }

    existing.participants.push({
      displayName,
      userId: linkedId ? new mongoose.Types.ObjectId(linkedId) : undefined,
      createdAt: now,
      popId: popNorm,
      table: '',
      opponentId: ''
    })
    await existing.save()

    return NextResponse.json(
      {
        ok: true,
        participantCount: existing.participants.length,
        participantNames: existing.participants.map(
          (p: { displayName: string }) => p.displayName
        )
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/admin/events/[id]/participants:', error)
    return NextResponse.json(
      { error: 'Error al preinscribir' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Confirmar o anular confirmación de participación (por userId del preinscrito).
 * Localiza el índice del participante comparando userId como string (ObjectId o string en BSON)
 * y hace $set en `participants.{idx}.confirmed` para evitar fallos del operador `$` posicional.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
    const userIdRaw = rec.userId
    const confirmedRaw = rec.confirmed

    if (typeof userIdRaw !== 'string' || !userIdRaw.trim()) {
      return NextResponse.json(
        { error: 'userId del participante es requerido' },
        { status: 400 }
      )
    }
    if (typeof confirmedRaw !== 'boolean') {
      return NextResponse.json(
        { error: 'confirmed debe ser booleano' },
        { status: 400 }
      )
    }

    const userIdNormalized = userIdRaw.trim()

    try {
      new mongoose.Types.ObjectId(userIdNormalized)
    } catch {
      return NextResponse.json({ error: 'userId inválido' }, { status: 400 })
    }

    await connectDB()

    let eventObjectId: mongoose.Types.ObjectId
    try {
      eventObjectId = new mongoose.Types.ObjectId(eventId.trim())
    } catch {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      )
    }

    const raw = await WeeklyEvent.collection.findOne(
      { _id: eventObjectId },
      { projection: { participants: 1 } }
    )

    if (!raw) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    const participants = (raw.participants ?? []) as {
      userId?: unknown
    }[]

    const idx = participants.findIndex(
      p => p.userId != null && String(p.userId) === userIdNormalized
    )

    if (idx < 0) {
      return NextResponse.json(
        { error: 'No hay participante con ese usuario vinculado' },
        { status: 400 }
      )
    }

    const setPath = `participants.${idx}.confirmed`

    const result = await WeeklyEvent.collection.updateOne(
      { _id: eventObjectId },
      { $set: { [setPath]: confirmedRaw } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('PATCH /api/admin/events/[id]/participants:', error)
    return NextResponse.json(
      { error: 'Error al actualizar participación' },
      { status: 500 }
    )
  }
}
