import { NextResponse } from 'next/server'
import { requireSessionUserWithActiveStore } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  countMailsRegisteredTodayBySenderForStore,
  getMailRegisterDailyLimitForStore
} from '@/lib/mail-register-daily'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'

export async function GET() {
  try {
    const gate = await requireSessionUserWithActiveStore()
    if (!gate.ok) return gate.response

    await connectDB()
    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const [usedToday, limit] = await Promise.all([
      countMailsRegisteredTodayBySenderForStore(
        gate.session.user.id as string,
        gate.activeStoreOid,
        primary
      ),
      getMailRegisterDailyLimitForStore(gate.activeStoreOid.toString())
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
