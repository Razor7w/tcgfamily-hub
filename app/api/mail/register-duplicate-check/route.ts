import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveMailRegisterStoreOid } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { findSenderMailsToRutTodayForStore } from '@/lib/mail-register-daily'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import {
  clean as cleanRut,
  validate as validateRut
} from 'rut.js'

export const runtime = 'nodejs'

/**
 * GET /api/mail/register-duplicate-check?storeId=&toRut=
 * ¿El emisor ya registró hoy (Chile) un correo a ese RUT en la tienda?
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const toRutRaw = request.nextUrl.searchParams.get('toRut')?.trim() ?? ''
    if (!toRutRaw || !validateRut(toRutRaw)) {
      return NextResponse.json({ error: 'RUT inválido' }, { status: 400 })
    }

    const storeIdParam = request.nextUrl.searchParams.get('storeId')
    const storeGate = await resolveMailRegisterStoreOid(session, storeIdParam)
    if (!storeGate.ok) return storeGate.response

    await connectDB()
    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const result = await findSenderMailsToRutTodayForStore({
      fromUserId: session.user.id as string,
      toRut: cleanRut(toRutRaw),
      activeStoreOid: storeGate.activeStoreOid,
      primaryStoreOid: primary
    })

    return NextResponse.json({
      duplicate: result.count > 0,
      count: result.count,
      latestCode: result.latestCode ?? null,
      latestCreatedAt: result.latestCreatedAt ?? null
    })
  } catch (e) {
    console.error('GET /api/mail/register-duplicate-check:', e)
    return NextResponse.json(
      { error: 'No se pudo verificar posibles duplicados' },
      { status: 500 }
    )
  }
}
