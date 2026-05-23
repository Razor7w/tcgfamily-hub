import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/mongodb'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { getDashboardDocForStore } from '@/lib/dashboard-settings-for-store'
import {
  applyStoreCreditAdminToDoc,
  mergeStoreCreditAdmin,
  normalizeTournamentPointsCustomName,
  resolveTournamentPointsDisplayName
} from '@/lib/store-credit-admin-settings'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'

export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const doc = await getDashboardDocForStore(gate.activeStoreOid.toString())
    const storeCredit = mergeStoreCreditAdmin(doc)

    return NextResponse.json(
      {
        tournamentPointsCustomName: storeCredit.tournamentPointsCustomName,
        tournamentPointsLabel: storeCredit.tournamentPointsLabel
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/admin/tournament-points/settings:', error)
    return NextResponse.json(
      { error: 'Error al leer configuración' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    if (typeof rec.tournamentPointsCustomName !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere tournamentPointsCustomName (string)' },
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

    const doc = await getDashboardDocForStore(gate.activeStoreOid.toString())
    const current = mergeStoreCreditAdmin(doc)
    const tournamentPointsCustomName = normalizeTournamentPointsCustomName(
      rec.tournamentPointsCustomName
    )

    applyStoreCreditAdminToDoc(doc, {
      csvEnabled: current.csvEnabled,
      tournamentPointsEnabled: current.tournamentPointsEnabled,
      tournamentPointsCustomName
    })
    await doc.save()

    const tournamentPointsLabel = resolveTournamentPointsDisplayName(
      tournamentPointsCustomName
    )

    revalidatePath('/', 'layout')
    revalidatePath('/admin/puntos')

    return NextResponse.json(
      { tournamentPointsCustomName, tournamentPointsLabel },
      { status: 200 }
    )
  } catch (error) {
    console.error('PATCH /api/admin/tournament-points/settings:', error)
    return NextResponse.json(
      { error: 'Error al guardar el nombre' },
      { status: 500 }
    )
  }
}
