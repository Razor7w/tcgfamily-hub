import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireStoreStaffSession } from '@/lib/api-auth'
import StoreBranch from '@/models/StoreBranch'
import {
  listBranchesForStoreAdmin,
  normalizeBranchAddress,
  normalizeBranchName,
  serializeStoreBranch
} from '@/lib/store-branch'

export const runtime = 'nodejs'

/** GET — sucursales de la tienda activa (staff). */
export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const branches = await listBranchesForStoreAdmin(gate.activeStoreOid)
    return NextResponse.json({
      storeId: gate.activeStoreOid.toString(),
      branches
    })
  } catch (e) {
    console.error('GET /api/admin/mail-branches:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las sucursales' },
      { status: 500 }
    )
  }
}

/** POST — crear sucursal en la tienda activa. */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const body = await request.json()
    const name = normalizeBranchName(body?.name)
    if (!name) {
      return NextResponse.json(
        { error: 'Nombre de sucursal obligatorio' },
        { status: 400 }
      )
    }
    const address = normalizeBranchAddress(body?.address)
    const sortOrder =
      typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder)
        ? Math.max(0, Math.min(9999, Math.round(body.sortOrder)))
        : 0

    await connectDB()
    const dup = await StoreBranch.findOne({
      storeId: gate.activeStoreOid,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    })
      .select('_id')
      .lean()
    if (dup) {
      return NextResponse.json(
        { error: 'Ya existe una sucursal con ese nombre' },
        { status: 409 }
      )
    }

    const created = await StoreBranch.create({
      storeId: gate.activeStoreOid,
      name,
      address,
      isActive: true,
      sortOrder
    })

    return NextResponse.json(
      serializeStoreBranch({
        _id: created._id as mongoose.Types.ObjectId,
        storeId: gate.activeStoreOid,
        name: created.name,
        address: created.address ?? '',
        isActive: created.isActive !== false,
        sortOrder: created.sortOrder ?? 0
      }),
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/admin/mail-branches:', e)
    return NextResponse.json(
      { error: 'No se pudo crear la sucursal' },
      { status: 500 }
    )
  }
}
