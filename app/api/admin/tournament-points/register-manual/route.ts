import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import {
  registerTournamentPointsPlayerManually,
  staffDisplayName
} from '@/lib/tournament-points-admin'

export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

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

    const popId = typeof rec.popId === 'string' ? rec.popId : ''
    const displayName =
      typeof rec.displayName === 'string' ? rec.displayName : ''
    const pointsRaw = rec.points
    const points =
      typeof pointsRaw === 'number'
        ? pointsRaw
        : typeof pointsRaw === 'string'
          ? Number.parseFloat(pointsRaw.trim())
          : NaN
    const applyBalance = rec.applyBalance === true || rec.applyBalance === '1'

    if (!popId.trim()) {
      return NextResponse.json({ error: 'POP ID requerido' }, { status: 400 })
    }
    if (!displayName.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }
    if (!Number.isFinite(points) || points <= 0) {
      return NextResponse.json(
        { error: 'Puntos deben ser mayor que 0' },
        { status: 400 }
      )
    }

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const staffOid =
      gate.session.user?.id &&
      mongoose.Types.ObjectId.isValid(gate.session.user.id)
        ? new mongoose.Types.ObjectId(gate.session.user.id)
        : undefined
    const changedByName = await staffDisplayName(staffOid)

    const result = await registerTournamentPointsPlayerManually({
      storeOid: gate.activeStoreOid,
      primaryStoreOid: gate.primaryStoreOid ?? null,
      popId,
      displayName,
      points,
      applyBalance,
      changedByUserId: staffOid,
      changedByName
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al registrar jugador'
    const status =
      message.includes('ya tiene') ||
      message.includes('POP') ||
      message.includes('puntos')
        ? 400
        : 500
    if (status === 500) {
      console.error('POST /api/admin/tournament-points/register-manual:', error)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
