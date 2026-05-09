import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import { canManageStoresGlobally } from '@/lib/store-admin-access'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

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

    const list = mems
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
          role: m.role === 'owner' ? 'owner' : 'store_admin'
        }
      })

    /** Usuarios `admin` globales pueden operar sobre la tienda TCGFamily incluso antes de tener fila Membership. */
    const u = await User.findById(uid).select('role').lean<{ role?: string }>()
    if (u?.role === 'admin') {
      const primary = await Store.findOne({
        slug: DEFAULT_PRIMARY_STORE_SLUG
      }).lean<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>()
      if (primary && !list.some(x => x.id === String(primary._id))) {
        list.unshift({
          id: String(primary._id),
          name: primary.name,
          slug: primary.slug,
          logoUrl: '',
          role: 'owner'
        })
      }
    }

    /**
     * HQ (admin legacy o dueño de la tienda TCGFamily): puede usar como contexto
     * cualquier tienda activa — unir al listado de membresías.
     */
    if (list.length > 0 && (await canManageStoresGlobally(uid))) {
      const allActive = await Store.find({ isActive: true })
        .sort({ name: 1 })
        .select('name slug logoUrl')
        .lean<
          Array<{ _id: mongoose.Types.ObjectId } & Record<string, unknown>>
        >()
      const have = new Set(list.map(x => x.id))
      for (const row of allActive) {
        const id = String(row._id)
        if (have.has(id)) continue
        const r = row as { name?: unknown; slug?: unknown; logoUrl?: unknown }
        list.push({
          id,
          name: typeof r.name === 'string' ? r.name : '',
          slug: typeof r.slug === 'string' ? r.slug : '',
          logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : '',
          role: 'owner'
        })
        have.add(id)
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }

    /** Si no hay memberships (usuario normal), permite listar todas las tiendas activas para elegir contexto público. */
    if (list.length === 0) {
      const all = await Store.find({ isActive: true })
        .sort({ name: 1 })
        .select('name slug logoUrl')
        .lean<
          Array<{ _id: mongoose.Types.ObjectId } & Record<string, unknown>>
        >()

      const open = all.map(s => {
        const row = s as {
          name?: unknown
          slug?: unknown
          logoUrl?: unknown
        }
        return {
          id: String(s._id),
          name: typeof row.name === 'string' ? row.name : '',
          slug: typeof row.slug === 'string' ? row.slug : '',
          logoUrl: typeof row.logoUrl === 'string' ? row.logoUrl : ''
        }
      })

      return NextResponse.json({ stores: open, mode: 'open' as const })
    }

    return NextResponse.json({
      stores: list,
      mode: 'restricted' as const
    })
  } catch (e) {
    console.error('GET /api/me/stores:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar tiendas.' },
      { status: 500 }
    )
  }
}
