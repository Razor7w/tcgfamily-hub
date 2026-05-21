import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveMailRegisterStoreOid } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  countMailsRegisteredTodayBySenderForStore,
  getMailRegisterDailyLimitForStore
} from '@/lib/mail-register-daily'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const storeIdParam = request.nextUrl.searchParams.get('storeId')
    const storeGate = await resolveMailRegisterStoreOid(session, storeIdParam)
    if (!storeGate.ok) return storeGate.response

    await connectDB()
    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const [usedToday, limit] = await Promise.all([
      countMailsRegisteredTodayBySenderForStore(
        session.user!.id as string,
        storeGate.activeStoreOid,
        primary
      ),
      getMailRegisterDailyLimitForStore(storeGate.activeStoreOid.toString())
    ])
    const remaining = Math.max(0, limit - usedToday)

    return NextResponse.json(
      {
        limit,
        usedToday,
        remaining
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al obtener cuota de registro de mails:', error)
    return NextResponse.json(
      { error: 'Error al obtener cuota' },
      { status: 500 }
    )
  }
}
