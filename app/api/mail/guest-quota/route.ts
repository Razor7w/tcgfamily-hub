import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { validate as validateRut } from 'rut.js'
import { countGuestMailsRegisteredTodayByFromRutForStore } from '@/lib/mail-register-daily'
import { GUEST_MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'
import { guestMailSessionSnapshot } from '@/lib/guest-mail-session'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import { formatMailRut } from '@/lib/mail-create'

export const runtime = 'nodejs'

/**
 * GET /api/mail/guest-quota
 * - Sin params: solo cupo de sesión del navegador.
 * - Con fromRut + storeId: cupo diario por RUT + cupo de sesión.
 */
export async function GET(request: NextRequest) {
  try {
    const session = guestMailSessionSnapshot(request)
    const fromRutRaw = request.nextUrl.searchParams.get('fromRut')?.trim() ?? ''
    const storeId = request.nextUrl.searchParams.get('storeId')?.trim() ?? ''

    if (!fromRutRaw && !storeId) {
      return NextResponse.json(session)
    }

    if (!fromRutRaw || !validateRut(fromRutRaw)) {
      return NextResponse.json(
        { error: 'RUT inválido', ...session },
        { status: 400 }
      )
    }
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json(
        { error: 'storeId inválido', ...session },
        { status: 400 }
      )
    }

    await connectDB()
    const oid = new mongoose.Types.ObjectId(storeId)
    const exists = await Store.exists({ _id: oid, isActive: true })
    if (!exists) {
      return NextResponse.json(
        { error: 'Tienda no encontrada o inactiva', ...session },
        { status: 404 }
      )
    }

    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const fromRut = formatMailRut(fromRutRaw)
    const usedToday = await countGuestMailsRegisteredTodayByFromRutForStore(
      fromRut,
      oid,
      primary
    )
    const remaining = Math.max(0, GUEST_MAIL_REGISTER_DAILY_LIMIT - usedToday)

    return NextResponse.json({
      limit: GUEST_MAIL_REGISTER_DAILY_LIMIT,
      usedToday,
      remaining,
      ...session
    })
  } catch (e) {
    console.error('GET /api/mail/guest-quota:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar el cupo de invitado' },
      { status: 500 }
    )
  }
}
