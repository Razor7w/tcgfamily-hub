import { NextResponse } from 'next/server'
import { requireSessionUserWithActiveStore } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import Store from '@/models/Store'
import mongoose from 'mongoose'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import {
  clean as cleanRut,
  format as formatRut,
  validate as validateRut
} from 'rut.js'

// GET - mails donde el usuario actual es emisor (from) o receptor (to)
// Query: ?limit=3 para traer solo los 3 más recientes
export async function GET(request: Request) {
  try {
    const sg = await requireSessionUserWithActiveStore()
    if (!sg.ok) return sg.response
    const session = sg.session

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100)
      : undefined
    const pendingOnly =
      searchParams.get('pending') === '1' ||
      searchParams.get('pending') === 'true'
    const inStoreOnly =
      searchParams.get('inStore') === '1' ||
      searchParams.get('inStore') === 'true'
    const allStores =
      searchParams.get('allStores') === '1' ||
      searchParams.get('allStores') === 'true'

    await connectDB()
    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const mailScope = allStores
      ? null
      : (mongoFilterByStore(sg.activeStoreOid, primary) as Record<
          string,
          unknown
        >)

    const userId = session.user.id as string
    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(userId)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const sessionRut =
      typeof session.user.rut === 'string' ? session.user.rut.trim() : ''
    const rutVariants: string[] = []
    if (sessionRut && validateRut(sessionRut)) {
      const cleaned = cleanRut(sessionRut)
      rutVariants.push(formatRut(cleaned))
      rutVariants.push(formatRut(cleaned, { dots: false }))
      rutVariants.push(cleaned)
    }

    const userFilter = {
      $or: [
        { toUserId: uid },
        { fromUserId: uid },
        ...(rutVariants.length ? [{ toRut: { $in: rutVariants } }] : [])
      ],
      ...(pendingOnly ? { isRecived: false } : {}),
      ...(inStoreOnly ? { isRecivedInStore: true } : {})
    }

    const query = Mail.find(
      mailScope ? { $and: [mailScope, userFilter] } : userFilter
    )
      .sort({ createdAt: -1 })
      .populate('fromUserId', 'name rut')
      .populate('toUserId', 'name rut')
      .populate('storeId', 'name slug')
      .lean()

    if (limit !== undefined) {
      query.limit(limit)
    }

    const mails = await query

    let primaryStoreLabel: { name: string; slug: string } | null = null
    if (allStores && primary) {
      const ps = await Store.findById(primary)
        .select('name slug')
        .lean<{ name: string; slug: string } | null>()
      if (ps?.name && ps?.slug) {
        primaryStoreLabel = {
          name: String(ps.name).trim(),
          slug: String(ps.slug).trim().toLowerCase()
        }
      }
    }

    const enriched = mails.map(row => {
      const storeRef = row.storeId as
        | { _id: unknown; name?: string; slug?: string }
        | null
        | undefined
      const hasPopulatedStore =
        storeRef &&
        typeof storeRef === 'object' &&
        storeRef !== null &&
        'name' in storeRef &&
        typeof storeRef.name === 'string'
      const store =
        hasPopulatedStore && storeRef
          ? {
              id: String(storeRef._id),
              name: storeRef.name!.trim(),
              slug:
                typeof storeRef.slug === 'string'
                  ? storeRef.slug.trim().toLowerCase()
                  : ''
            }
          : primaryStoreLabel
            ? {
                id: String(primary),
                name: primaryStoreLabel.name,
                slug: primaryStoreLabel.slug
              }
            : null
      return { ...row, store }
    })

    return NextResponse.json({ mails: enriched }, { status: 200 })
  } catch (error) {
    console.error('Error al obtener mails:', error)
    return NextResponse.json(
      { error: 'Error al obtener mails' },
      { status: 500 }
    )
  }
}
