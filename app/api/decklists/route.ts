import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import {
  normalizeOneOrTwoPokemonSlugs,
  SAVED_DECKLIST_NAME_MAX,
  SAVED_DECKLIST_TEXT_MAX
} from '@/lib/saved-decklist-validation'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'

/** Lista los decklists guardados del usuario (más recientes primero). */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

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
  } catch (e) {
    console.error('GET /api/decklists:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los decklists' },
      { status: 500 }
    )
  }
}

/** Crea un decklist: nombre, 1–2 Pokémon (sprites) y texto del mazo. */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const o =
      body && typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}
    const nameRaw = typeof o.name === 'string' ? o.name.trim() : ''
    const deckTextRaw = typeof o.deckText === 'string' ? o.deckText.trim() : ''
    const pokemonSlugs = normalizeOneOrTwoPokemonSlugs(o.pokemon)

    if (!nameRaw || nameRaw.length > SAVED_DECKLIST_NAME_MAX) {
      return NextResponse.json(
        {
          error: `Nombre obligatorio (máx. ${SAVED_DECKLIST_NAME_MAX} caracteres)`
        },
        { status: 400 }
      )
    }

    if (!deckTextRaw || deckTextRaw.length > SAVED_DECKLIST_TEXT_MAX) {
      return NextResponse.json(
        {
          error: `Texto del deck obligatorio (máx. ${SAVED_DECKLIST_TEXT_MAX} caracteres)`
        },
        { status: 400 }
      )
    }

    if (!pokemonSlugs) {
      return NextResponse.json(
        {
          error:
            'Debes elegir al menos 1 Pokémon y como máximo 2 distintos (slugs válidos en minúsculas)'
        },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.create({
      userId: uid,
      name: nameRaw,
      deckText: deckTextRaw,
      pokemonSlugs
    })

    return NextResponse.json(
      {
        id: doc._id.toString(),
        name: doc.name,
        pokemonSlugs: doc.pokemonSlugs,
        updatedAt: doc.updatedAt.toISOString()
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/decklists:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar el decklist' },
      { status: 500 }
    )
  }
}
