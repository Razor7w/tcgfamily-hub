import { NextResponse } from 'next/server'
import { listActiveStoresForSignup } from '@/lib/signup-default-store.server'

/** Tiendas activas para elegir en registro / login con Google (sin sesión). */
export async function GET() {
  try {
    const stores = await listActiveStoresForSignup()
    return NextResponse.json({ stores })
  } catch (e) {
    console.error('GET /api/public/stores:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar el listado de tiendas.' },
      { status: 500 }
    )
  }
}
