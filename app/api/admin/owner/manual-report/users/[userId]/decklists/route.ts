import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'

/** Listas guardadas de un jugador (solo owner HQ, para reporte manual). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { userId } = await context.params
    if (!userId?.trim() || !mongoose.Types.ObjectId.isValid(userId.trim())) {
      return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(userId.trim())

    const rows = await SavedDecklist.find({ userId: uid })
      .sort({ updatedAt: -1 })
      .select(
        'name pokemonSlugs updatedAt createdAt variants principalVariantId isPublic'
      )
      .lean()

    const decklists = rows.map(r => ({
      id: String(r._id),
      name: r.name,
      pokemonSlugs: Array.isArray(r.pokemonSlugs) ? r.pokemonSlugs : [],
      variants: Array.isArray(r.variants)
        ? r.variants.map(v => ({
            id: String(v._id),
            label: typeof v.label === 'string' ? v.label : ''
          }))
        : [],
      principalVariantId: r.principalVariantId
        ? String(r.principalVariantId)
        : null,
      isPublic: Boolean((r as { isPublic?: boolean }).isPublic),
      updatedAt: (r.updatedAt as Date).toISOString(),
      createdAt: (r.createdAt as Date).toISOString()
    }))

    return NextResponse.json({ decklists })
  } catch (error) {
    console.error(
      'GET /api/admin/owner/manual-report/users/[userId]/decklists:',
      error
    )
    return NextResponse.json(
      { error: 'Error al cargar listas del jugador' },
      { status: 500 }
    )
  }
}
