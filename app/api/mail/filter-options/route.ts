import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { listMailFilterOptions } from '@/lib/mail-admin-list'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'

/** GET — opciones ligeras para filtros del panel de correos. */
export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response
    await connectDB()

    const scope = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>

    const options = await listMailFilterOptions(scope)
    return NextResponse.json(options, { status: 200 })
  } catch (error) {
    console.error('GET /api/mail/filter-options:', error)
    return NextResponse.json(
      { error: 'Error al obtener opciones de filtro' },
      { status: 500 }
    )
  }
}
