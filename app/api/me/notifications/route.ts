import { NextResponse } from 'next/server'
import { requireSessionUser } from '@/lib/api-auth'
import { buildUserNotifications } from '@/lib/teams/notifications'

export async function GET() {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const payload = await buildUserNotifications(gate.session.user!.id!)

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (e) {
    console.error('GET /api/me/notifications:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las notificaciones' },
      { status: 500 }
    )
  }
}
