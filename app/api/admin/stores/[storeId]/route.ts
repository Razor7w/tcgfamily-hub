import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import {
  assertCanManageStoreMutation,
  canManageStoresGlobally
} from '@/lib/store-admin-access'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { storeId } = await params
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ error: 'storeId inválido' }, { status: 400 })
    }
    const oid = new mongoose.Types.ObjectId(storeId)

    const body = await request.json()
    const uid = gate.session.user!.id
    const globalMgmt = await canManageStoresGlobally(uid)

    if (body?.isActive !== undefined) {
      if (!globalMgmt) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      const v = Boolean(body.isActive)
      await connectDB()
      const s = await Store.findOneAndUpdate(
        { _id: oid },
        { $set: { isActive: v } },
        { new: true }
      ).lean()
      if (!s) {
        return NextResponse.json(
          { error: 'Tienda no encontrada' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        id: s._id.toString(),
        name: s.name,
        slug: s.slug,
        logoUrl: s.logoUrl ?? '',
        isActive: s.isActive
      })
    }

    const can = await assertCanManageStoreMutation(uid, oid)
    if (!can)
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const patch: Partial<{
      name: string
      logoUrl: string
      logoKey: string
    }> = {}
    if (typeof body?.name === 'string') {
      const n = body.name.trim().slice(0, 200)
      if (n) patch.name = n
    }
    if (typeof body?.logoUrl === 'string') {
      patch.logoUrl = body.logoUrl.trim().slice(0, 2048)
    }
    if (typeof body?.logoKey === 'string') {
      patch.logoKey = body.logoKey.trim().slice(0, 512)
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'Sin campos válidos para actualizar' },
        { status: 400 }
      )
    }

    await connectDB()
    const s = await Store.findOneAndUpdate(
      { _id: oid },
      { $set: patch },
      { new: true }
    ).lean()
    if (!s) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      logoUrl: s.logoUrl ?? '',
      isActive: s.isActive
    })
  } catch (e) {
    console.error('PATCH /api/admin/stores/[storeId]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar la tienda' },
      { status: 500 }
    )
  }
}
