import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

type StoreRow = {
  id: string
  name: string
  slug: string
  logoUrl: string
  role?: 'owner' | 'store_admin'
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const uid = session.user.id
    const mems = await StoreMembership.find({
      userId: new mongoose.Types.ObjectId(uid)
    })
      .populate('storeId', 'name slug logoUrl isActive')
      .lean<
        Array<{
          role: string
          storeId: {
            _id: mongoose.Types.ObjectId
            name: string
            slug: string
            logoUrl?: string
            isActive?: boolean
          } | null
        }>
      >()

    const fromMembership: StoreRow[] = mems
      .filter(m => m.storeId && typeof m.storeId === 'object')
      .map(m => {
        const s = m.storeId as unknown as {
          _id: mongoose.Types.ObjectId
          name: string
          slug: string
          logoUrl?: string
          isActive?: boolean
        }
        return {
          id: String(s._id),
          name: s.name,
          slug: s.slug,
          logoUrl: s.logoUrl ?? '',
          role: (m.role === 'owner' ? 'owner' : 'store_admin') as
            | 'owner'
            | 'store_admin'
        }
      })

    const u = await User.findById(uid).select('role').lean<{ role?: string }>()
    if (u?.role === 'admin') {
      const primary = await Store.findOne({
        slug: DEFAULT_PRIMARY_STORE_SLUG
      }).lean<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>()
      if (primary && !fromMembership.some(x => x.id === String(primary._id))) {
        fromMembership.unshift({
          id: String(primary._id),
          name: primary.name,
          slug: primary.slug,
          logoUrl: '',
          role: 'owner'
        })
      }
    }

    const roleById = new Map<string, 'owner' | 'store_admin'>()
    for (const row of fromMembership) {
      if (row.role) roleById.set(row.id, row.role)
    }

    const allActive = await Store.find({ isActive: true })
      .sort({ name: 1 })
      .select('name slug logoUrl')
      .lean<Array<{ _id: mongoose.Types.ObjectId } & Record<string, unknown>>>()

    const stores: StoreRow[] = allActive.map(s => {
      const id = String(s._id)
      const r = s as { name?: unknown; slug?: unknown; logoUrl?: unknown }
      const base: StoreRow = {
        id,
        name: typeof r.name === 'string' ? r.name : '',
        slug: typeof r.slug === 'string' ? r.slug : '',
        logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : ''
      }
      const role = roleById.get(id)
      return role ? { ...base, role } : base
    })

    return NextResponse.json({
      stores,
      mode:
        fromMembership.length === 0 ? ('open' as const) : ('all_active' as const)
    })
  } catch (e) {
    console.error('GET /api/me/stores:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar tiendas.' },
      { status: 500 }
    )
  }
}
