import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'

export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const enabled = await isTournamentPointsEnabledForStore(
      gate.activeStoreOid.toString()
    )

    return NextResponse.json({ enabled }, { status: 200 })
  } catch (error) {
    console.error('GET /api/admin/tournament-points/enabled:', error)
    return NextResponse.json(
      { error: 'Error al leer configuración' },
      { status: 500 }
    )
  }
}
