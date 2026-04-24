import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'
import User from '@/models/User'

const PUBLIC_DECKLIST_LIMIT = 300

/**
 * Decklists marcados como públicos (toda la comunidad), más recientes primero.
 * Query opcional: `limit` (1–300), por defecto 300.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const limitRaw = searchParams.get('limit')
    let limit = PUBLIC_DECKLIST_LIMIT
    if (limitRaw !== null && limitRaw !== '') {
      const n = Number.parseInt(limitRaw, 10)
      if (Number.isFinite(n) && n >= 1) {
        limit = Math.min(n, PUBLIC_DECKLIST_LIMIT)
      }
    }

    const rows = await SavedDecklist.find({ isPublic: true })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('name pokemonSlugs updatedAt userId')
      .lean()

    const ownerIds = [
      ...new Set(rows.map(r => String(r.userId)).filter(Boolean))
    ].map(id => new mongoose.Types.ObjectId(id))

    const owners =
      ownerIds.length > 0
        ? await User.find({ _id: { $in: ownerIds } })
            .select('name email image')
            .lean()
        : []

    const ownerById = new Map<
      string,
      { displayName: string; imageUrl: string | null }
    >()
    for (const u of owners) {
      const { displayName, imageUrl } = ownerPublicDisplay(
        u as {
          name?: string | null
          email?: string | null
          image?: string | null
        }
      )
      ownerById.set(String(u._id), { displayName, imageUrl })
    }

    const decklists = rows.map(r => {
      const oid = String(r.userId)
      const o = ownerById.get(oid) ?? {
        displayName: 'Usuario',
        imageUrl: null as string | null
      }
      return {
        id: String(r._id),
        name: r.name,
        pokemonSlugs: Array.isArray(r.pokemonSlugs) ? r.pokemonSlugs : [],
        ownerId: oid,
        ownerName: o.displayName,
        ownerImage: o.imageUrl,
        updatedAt: (r.updatedAt as Date).toISOString()
      }
    })

    return NextResponse.json({ decklists })
  } catch (e) {
    console.error('GET /api/decklists/public:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los decklists públicos' },
      { status: 500 }
    )
  }
}
