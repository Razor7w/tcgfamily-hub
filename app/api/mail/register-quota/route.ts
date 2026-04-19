import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import {
  countMailsRegisteredTodayBySender,
  getMailRegisterDailyLimit
} from '@/lib/mail-register-daily'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const usedToday = await countMailsRegisteredTodayBySender(session.user.id)
    const limit = await getMailRegisterDailyLimit()
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
