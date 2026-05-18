import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import User from '@/models/User'
import {
  canUserActivateDashboardStore,
  resolveStoreRoleForUser
} from '@/lib/multitenancy/session-store-hydrate'

async function legacyRoleForUser(
  uid: string
): Promise<'user' | 'admin' | undefined> {
  await connectDB()
  const u = await User.findById(uid).select('role').lean<{ role?: string }>()
  return u?.role === 'admin' ? 'admin' : u?.role === 'user' ? 'user' : undefined
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let raw: Record<string, unknown>
    try {
      raw = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const sid =
      typeof raw.storeId === 'string'
        ? raw.storeId.trim()
        : String(raw.storeId ?? '')
    if (!mongoose.Types.ObjectId.isValid(sid)) {
      return NextResponse.json({ error: 'storeId inválido' }, { status: 400 })
    }

    const oid = new mongoose.Types.ObjectId(sid)
    await connectDB()
    const exists = await Store.exists({ _id: oid, isActive: true })
    if (!exists) {
      return NextResponse.json(
        { error: 'Tienda no encontrada o inactiva' },
        { status: 404 }
      )
    }

    const uid = session.user.id as string
    const allowed = await canUserActivateDashboardStore(uid, oid)
    if (!allowed) {
      return NextResponse.json(
        { error: 'No tenés acceso a esa tienda.' },
        { status: 403 }
      )
    }

    const lr = await legacyRoleForUser(uid)
    const legacy: 'user' | 'admin' = lr ?? 'user'

    const storeRole = (await resolveStoreRoleForUser(uid, oid, legacy)) ?? null

    return NextResponse.json(
      {
        activeStoreId: oid.toString(),
        storeRole
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('POST /api/me/active-store:', e)
    return NextResponse.json(
      { error: 'No se pudo seleccionar la tienda.' },
      { status: 500 }
    )
  }
}
