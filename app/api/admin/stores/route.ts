import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import {
  canManageStoresGlobally,
  ownedStoreIdsForUser
} from '@/lib/store-admin-access'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'

export const runtime = 'nodejs'

function slugGuard(slug: string): string | null {
  const s = slug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return null
  return s.slice(0, 80)
}

export async function GET() {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const uid = gate.session.user!.id
    const globalMgmt = await canManageStoresGlobally(uid)

    const filter = globalMgmt
      ? { isActive: true }
      : { _id: { $in: await ownedStoreIdsForUser(uid) }, isActive: true }

    const rows = await Store.find(filter).sort({ name: 1 }).lean()

    return NextResponse.json({
      canCreateStores: globalMgmt,
      stores: rows.map(s => ({
        id: s._id.toString(),
        name: s.name,
        slug: s.slug,
        logoUrl: s.logoUrl ?? '',
        isActive: s.isActive
      }))
    })
  } catch (e) {
    console.error('GET /api/admin/stores:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las tiendas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const uid = gate.session.user!.id
    if (!(await canManageStoresGlobally(uid))) {
      return NextResponse.json(
        { error: 'Solo la plaza principal puede crear tiendas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const name =
      typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : ''
    const slugOk = slugGuard(typeof body?.slug === 'string' ? body.slug : '')
    if (!name || !slugOk) {
      return NextResponse.json(
        {
          error:
            'Nombre y slug obligatorios. Slug minúsculas, números y guiones.'
        },
        { status: 400 }
      )
    }

    await connectDB()
    try {
      const created = await Store.create({
        name,
        slug: slugOk,
        isActive: true
      })
      return NextResponse.json({
        id: (created._id as mongoose.Types.ObjectId).toString(),
        name: created.name,
        slug: created.slug,
        logoUrl: created.logoUrl ?? '',
        isActive: created.isActive
      })
    } catch {
      return NextResponse.json(
        { error: 'Slug duplicado o datos inválidos' },
        { status: 409 }
      )
    }
  } catch (e) {
    console.error('POST /api/admin/stores:', e)
    return NextResponse.json(
      { error: 'No se pudo crear la tienda' },
      { status: 500 }
    )
  }
}
