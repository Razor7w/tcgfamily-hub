import { NextResponse } from 'next/server'
import type { Types } from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { loadDashboardAccessContext } from '@/lib/multitenancy/session-store-hydrate'
import { serializeStorePublicFields } from '@/lib/store-api-serialize'

type StoreRow = {
  id: string
  name: string
  slug: string
  logoUrl: string
  address: string
  websiteUrl: string
  instagramUrl: string
  role?: 'owner' | 'store_admin'
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const uid = session.user.id

    const [dash, allActive] = await Promise.all([
      loadDashboardAccessContext(uid),
      (async () => {
        await connectDB()
        return Store.find({ isActive: true })
          .sort({ name: 1 })
          .select('name slug logoUrl address websiteUrl instagramUrl')
          .lean<Array<{ _id: Types.ObjectId } & Record<string, unknown>>>()
      })()
    ])

    const roleById = new Map<string, 'owner' | 'store_admin'>()
    for (const m of dash.memberships) {
      roleById.set(
        m.storeId.toString(),
        m.role === 'owner' ? 'owner' : 'store_admin'
      )
    }

    if (dash.legacyRole === 'admin' && dash.primaryOid) {
      const pid = dash.primaryOid.toString()
      if (!roleById.has(pid)) {
        roleById.set(pid, 'owner')
      }
    }

    const stores: StoreRow[] = allActive.map(s => {
      const id = String(s._id)
      const r = s as {
        name?: unknown
        slug?: unknown
        logoUrl?: unknown
        address?: unknown
        websiteUrl?: unknown
        instagramUrl?: unknown
      }
      const base: StoreRow = {
        id,
        name: typeof r.name === 'string' ? r.name : '',
        slug: typeof r.slug === 'string' ? r.slug : '',
        logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : '',
        ...serializeStorePublicFields({
          address: typeof r.address === 'string' ? r.address : '',
          websiteUrl: typeof r.websiteUrl === 'string' ? r.websiteUrl : '',
          instagramUrl: typeof r.instagramUrl === 'string' ? r.instagramUrl : ''
        })
      }
      const role = roleById.get(id)
      return role ? { ...base, role } : base
    })

    return NextResponse.json({
      stores,
      mode:
        dash.memberships.length === 0
          ? ('open' as const)
          : ('all_active' as const)
    })
  } catch (e) {
    console.error('GET /api/me/stores:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar tiendas.' },
      { status: 500 }
    )
  }
}
