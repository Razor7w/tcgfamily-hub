import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import {
  addTournamentPointsForPlayer,
  staffDisplayName
} from '@/lib/tournament-points-admin'

export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
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

    const add = normalizeStorePointsAmount(rec.add)
    const reason = typeof rec.reason === 'string' ? rec.reason : ''
    const displayName =
      typeof rec.displayName === 'string' ? rec.displayName : ''
    const userId =
      typeof rec.userId === 'string' && rec.userId.trim()
        ? rec.userId.trim()
        : null
    const primaryPopId =
      typeof rec.primaryPopId === 'string' ? rec.primaryPopId.trim() : ''

    if (!userId && !primaryPopId) {
      return NextResponse.json(
        { error: 'Se requiere userId o primaryPopId' },
        { status: 400 }
      )
    }
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'userId inválido' }, { status: 400 })
    }
    if (add <= 0) {
      return NextResponse.json(
        { error: 'add debe ser mayor que 0' },
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

    const result = await addTournamentPointsForPlayer({
      storeOid: gate.activeStoreOid,
      primaryStoreOid: gate.primaryStoreOid ?? null,
      userId,
      primaryPopId,
      displayName,
      add,
      reason,
      changedByUserId: staffOid,
      changedByName
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al sumar puntos'
    const status =
      message.includes('motivo') || message.includes('POP') ? 400 : 500
    if (status === 500) {
      console.error('POST /api/admin/tournament-points/add:', error)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
