import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireStoreStaffSession } from '@/lib/api-auth'
import Mail from '@/models/Mails'
import StoreBranch from '@/models/StoreBranch'
import {
  normalizeBranchAddress,
  normalizeBranchName,
  serializeStoreBranch,
  type StoreBranchRow
} from '@/lib/store-branch'
import type { StoreBranchLean } from '@/models/StoreBranch'

export const runtime = 'nodejs'

async function loadOwnedBranch(
  branchId: string,
  storeOid: mongoose.Types.ObjectId
): Promise<StoreBranchLean | null> {
  if (!mongoose.Types.ObjectId.isValid(branchId)) return null
  const row = await StoreBranch.findOne({
    _id: new mongoose.Types.ObjectId(branchId),
    storeId: storeOid
  }).lean<StoreBranchLean | null>()
  return row
}

/** PATCH — actualizar / activar-desactivar sucursal de la tienda activa. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { branchId } = await params
    await connectDB()
    const existing = await loadOwnedBranch(branchId, gate.activeStoreOid)
    if (!existing) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const patch: Partial<{
      name: string
      address: string
      isActive: boolean
      sortOrder: number
    }> = {}

    if (body && typeof body === 'object' && 'name' in body) {
      const name = normalizeBranchName(body.name)
      if (!name) {
        return NextResponse.json(
          { error: 'Nombre de sucursal obligatorio' },
          { status: 400 }
        )
      }
      const dup = await StoreBranch.findOne({
        storeId: gate.activeStoreOid,
        _id: { $ne: existing._id },
        name: {
          $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i'
        }
      })
        .select('_id')
        .lean()
      if (dup) {
        return NextResponse.json(
          { error: 'Ya existe una sucursal con ese nombre' },
          { status: 409 }
        )
      }
      patch.name = name
    }
    if (body && typeof body === 'object' && 'address' in body) {
      patch.address = normalizeBranchAddress(body.address)
    }
    if (body?.isActive !== undefined) {
      patch.isActive = Boolean(body.isActive)
    }
    if (
      typeof body?.sortOrder === 'number' &&
      Number.isFinite(body.sortOrder)
    ) {
      patch.sortOrder = Math.max(0, Math.min(9999, Math.round(body.sortOrder)))
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'Sin campos válidos para actualizar' },
        { status: 400 }
      )
    }

    const updated = await StoreBranch.findOneAndUpdate(
      { _id: existing._id, storeId: gate.activeStoreOid },
      { $set: patch },
      { new: true }
    ).lean<StoreBranchLean | null>()

    if (!updated) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      serializeStoreBranch(updated) satisfies StoreBranchRow
    )
  } catch (e) {
    console.error('PATCH /api/admin/mail-branches/[branchId]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar la sucursal' },
      { status: 500 }
    )
  }
}

/** DELETE — elimina si no hay correos; si hay, desactiva. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { branchId } = await params
    await connectDB()
    const existing = await loadOwnedBranch(branchId, gate.activeStoreOid)
    if (!existing) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      )
    }

    const inUse = await Mail.exists({ branchId: existing._id })
    if (inUse) {
      await StoreBranch.updateOne(
        { _id: existing._id },
        { $set: { isActive: false } }
      )
      return NextResponse.json({
        ok: true,
        deactivated: true,
        message:
          'Hay correos con esta sucursal: se desactivó (ya no aparece al registrar).'
      })
    }

    await StoreBranch.deleteOne({ _id: existing._id })
    return NextResponse.json({ ok: true, deleted: true })
  } catch (e) {
    console.error('DELETE /api/admin/mail-branches/[branchId]:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar la sucursal' },
      { status: 500 }
    )
  }
}
