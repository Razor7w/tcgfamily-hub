import { NextResponse } from 'next/server'
import { requireStoreStaffSession, type StoreStaffGate } from '@/lib/api-auth'

/** Staff de la tienda activa, y solo si esa tienda es TCG Family. */
export async function requireTcgfamilyStaffSession(): Promise<StoreStaffGate> {
  const gate = await requireStoreStaffSession()
  if (!gate.ok) return gate
  if (
    !gate.primaryStoreOid ||
    !gate.activeStoreOid.equals(gate.primaryStoreOid)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Las notas solo están disponibles en TCG Family.' },
        { status: 403 }
      )
    }
  }
  return gate
}
