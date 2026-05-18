import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import {
  assertCanManageStoreMutation,
  canManageStoresGlobally
} from '@/lib/store-admin-access'
import connectDB from '@/lib/mongodb'
import { isR2StoreBrandingKeyForStore } from '@/lib/r2-store-branding-key'
import { r2BucketName, r2Client } from '@/lib/r2'
import Store from '@/models/Store'
import { serializeStoreAdminRow } from '@/lib/store-api-serialize'
import {
  normalizeStoreAddress,
  normalizeStoreInstagramUrl,
  normalizeStoreWebsiteUrl
} from '@/lib/store-public-profile'

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
      return NextResponse.json(serializeStoreAdminRow(s))
    }

    const can = await assertCanManageStoreMutation(uid, oid)
    if (!can)
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const patch: Partial<{
      name: string
      logoUrl: string
      logoKey: string
      address: string
      websiteUrl: string
      instagramUrl: string
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
    if (body && typeof body === 'object' && 'address' in body) {
      patch.address = normalizeStoreAddress(body.address)
    }
    if (body && typeof body === 'object' && 'websiteUrl' in body) {
      patch.websiteUrl = normalizeStoreWebsiteUrl(body.websiteUrl)
    }
    if (body && typeof body === 'object' && 'instagramUrl' in body) {
      patch.instagramUrl = normalizeStoreInstagramUrl(body.instagramUrl)
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'Sin campos válidos para actualizar' },
        { status: 400 }
      )
    }

    await connectDB()
    const prev = await Store.findById(oid)
      .select('logoKey')
      .lean<{ logoKey?: string } | null>()
    const oldLogoKey =
      typeof prev?.logoKey === 'string' ? prev.logoKey.trim() : ''

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

    const newLogoKey =
      typeof patch.logoKey === 'string' ? patch.logoKey.trim() : ''
    if (
      newLogoKey &&
      oldLogoKey &&
      oldLogoKey !== newLogoKey &&
      isR2StoreBrandingKeyForStore(storeId, oldLogoKey)
    ) {
      try {
        const s3 = r2Client()
        await s3.send(
          new DeleteObjectCommand({
            Bucket: r2BucketName(),
            Key: oldLogoKey
          })
        )
      } catch (e) {
        console.error('R2 delete old store branding failed:', e)
      }
    }

    return NextResponse.json(serializeStoreAdminRow(s))
  } catch (e) {
    console.error('PATCH /api/admin/stores/[storeId]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar la tienda' },
      { status: 500 }
    )
  }
}
