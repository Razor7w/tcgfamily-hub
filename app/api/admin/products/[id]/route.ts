import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireStoreStaffSession } from '@/lib/api-auth'
import StoreProduct from '@/models/StoreProduct'
import {
  isValidStoreProductPriceClp,
  normalizeStoreProductName,
  parseStoreProductPriceClp,
  type StoreProductDto
} from '@/lib/store-product'

export const runtime = 'nodejs'

type ProductLean = {
  _id: mongoose.Types.ObjectId
  barcode: string
  name: string
  priceClp: number
  updatedAt?: Date
}

function toDto(doc: ProductLean): StoreProductDto {
  return {
    id: doc._id.toString(),
    barcode: doc.barcode,
    name: doc.name,
    priceClp: doc.priceClp,
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date().toISOString()
  }
}

/** PATCH — actualizar nombre o precio del producto de la tienda activa. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Producto inválido' }, { status: 400 })
    }

    const body = (await request.json().catch(() => null)) as {
      name?: unknown
      priceClp?: unknown
    } | null

    const patch: Record<string, unknown> = {}
    if (body?.name !== undefined) {
      const name = normalizeStoreProductName(body.name)
      if (!name) {
        return NextResponse.json(
          { error: 'Nombre obligatorio' },
          { status: 400 }
        )
      }
      patch.name = name
    }
    if (body?.priceClp !== undefined) {
      const priceClp = parseStoreProductPriceClp(body.priceClp)
      if (priceClp == null || !isValidStoreProductPriceClp(priceClp)) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
      }
      patch.priceClp = priceClp
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'Nada que actualizar' },
        { status: 400 }
      )
    }

    const userId = gate.session.user.id
    if (mongoose.Types.ObjectId.isValid(userId)) {
      patch.updatedBy = new mongoose.Types.ObjectId(userId)
    }

    await connectDB()
    const updated = await StoreProduct.findOneAndUpdate(
      { _id: id, storeId: gate.activeStoreOid },
      { $set: patch },
      { new: true }
    )
      .select('barcode name priceClp updatedAt')
      .lean<ProductLean | null>()

    if (!updated) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product: toDto(updated) })
  } catch (e) {
    console.error('PATCH /api/admin/products/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el producto' },
      { status: 500 }
    )
  }
}
