import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireStoreStaffSession } from '@/lib/api-auth'
import StoreProduct from '@/models/StoreProduct'
import {
  isValidStoreProductBarcode,
  isValidStoreProductPriceClp,
  normalizeStoreProductBarcode,
  normalizeStoreProductName,
  parseStoreProductPriceClp,
  STORE_PRODUCT_PAGE_SIZE,
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

/** GET — consultar por código o listar recientes de la tienda activa. */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const barcode = normalizeStoreProductBarcode(
      request.nextUrl.searchParams.get('barcode') ?? ''
    )
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const pageRaw = Number(request.nextUrl.searchParams.get('page') ?? 1)
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.round(pageRaw)) : 1
    const limitRaw = Number(
      request.nextUrl.searchParams.get('limit') ?? STORE_PRODUCT_PAGE_SIZE
    )
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(80, Math.round(limitRaw)))
      : STORE_PRODUCT_PAGE_SIZE

    await connectDB()

    if (barcode) {
      if (!isValidStoreProductBarcode(barcode)) {
        return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
      }
      const doc = await StoreProduct.findOne({
        storeId: gate.activeStoreOid,
        barcode
      })
        .select('barcode name priceClp updatedAt')
        .lean<ProductLean | null>()
      return NextResponse.json({
        found: Boolean(doc),
        product: doc ? toDto(doc) : null
      })
    }

    const filter: Record<string, unknown> = { storeId: gate.activeStoreOid }
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { barcode: { $regex: escaped, $options: 'i' } }
      ]
    }

    const [total, rows] = await Promise.all([
      StoreProduct.countDocuments(filter),
      StoreProduct.find(filter)
        .select('barcode name priceClp updatedAt')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<ProductLean[]>()
    ])

    return NextResponse.json({
      products: rows.map(toDto),
      total,
      page,
      pageSize: limit
    })
  } catch (e) {
    console.error('GET /api/admin/products:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los productos' },
      { status: 500 }
    )
  }
}

/** POST — registrar producto vinculado a un código de barras. */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const body = (await request.json().catch(() => null)) as {
      barcode?: unknown
      name?: unknown
      priceClp?: unknown
    } | null

    const barcode = normalizeStoreProductBarcode(body?.barcode)
    const name = normalizeStoreProductName(body?.name)
    const priceClp = parseStoreProductPriceClp(body?.priceClp)

    if (!isValidStoreProductBarcode(barcode)) {
      return NextResponse.json(
        { error: 'Código de barras inválido' },
        { status: 400 }
      )
    }
    if (!name) {
      return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 })
    }
    if (priceClp == null || !isValidStoreProductPriceClp(priceClp)) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }

    await connectDB()
    const existing = await StoreProduct.findOne({
      storeId: gate.activeStoreOid,
      barcode
    })
      .select('barcode name priceClp updatedAt')
      .lean<ProductLean | null>()
    if (existing) {
      return NextResponse.json(
        {
          error: 'Este código ya está registrado',
          product: toDto(existing)
        },
        { status: 409 }
      )
    }

    const userId = gate.session.user.id
    try {
      const created = await StoreProduct.create({
        storeId: gate.activeStoreOid,
        barcode,
        name,
        priceClp,
        createdBy: mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : null,
        updatedBy: mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : null
      })

      return NextResponse.json(
        {
          product: toDto({
            _id: created._id as mongoose.Types.ObjectId,
            barcode: created.barcode,
            name: created.name,
            priceClp: created.priceClp,
            updatedAt: created.updatedAt
          })
        },
        { status: 201 }
      )
    } catch (e) {
      const code = (e as { code?: number } | null)?.code
      if (code === 11000) {
        const dup = await StoreProduct.findOne({
          storeId: gate.activeStoreOid,
          barcode
        })
          .select('barcode name priceClp updatedAt')
          .lean<ProductLean | null>()
        return NextResponse.json(
          {
            error: 'Este código ya está registrado',
            product: dup ? toDto(dup) : undefined
          },
          { status: 409 }
        )
      }
      throw e
    }
  } catch (e) {
    console.error('POST /api/admin/products:', e)
    return NextResponse.json(
      { error: 'No se pudo registrar el producto' },
      { status: 500 }
    )
  }
}
