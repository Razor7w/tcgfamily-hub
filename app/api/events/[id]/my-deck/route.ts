import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { isValidPokedexSlug } from '@/lib/limitless-pokemon-sprite'
import WeeklyEvent from '@/models/WeeklyEvent'

const MAX_DECK_POKEMON = 2

function normalizeSlugs(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') return null
    const s = x.trim().toLowerCase()
    if (!s) continue
    if (!isValidPokedexSlug(s)) return null
    if (!out.includes(s)) out.push(s)
    if (out.length > MAX_DECK_POKEMON) return null
  }
  return out
}

/** Guarda o actualiza los hasta 2 Pokémon del deck reportado por el usuario en este torneo. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const pokemonRaw =
      body && typeof body === 'object' && body !== null && 'pokemon' in body
        ? (body as { pokemon?: unknown }).pokemon
        : undefined
    const slugs = normalizeSlugs(pokemonRaw)
    if (slugs === null) {
      return NextResponse.json(
        {
          error:
            'Lista inválida: máximo 2 Pokémon, slugs en minúsculas (ej. dragapult)'
        },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await WeeklyEvent.findById(id.trim())
    if (!doc) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    if (doc.kind !== 'tournament' || doc.game !== 'pokemon') {
      return NextResponse.json(
        { error: 'Solo aplica a torneos Pokémon' },
        { status: 400 }
      )
    }

    const part = doc.participants.find(
      p => p.userId && String(p.userId) === String(uid)
    )
    if (!part) {
      return NextResponse.json(
        { error: 'Debes estar preinscrito en este torneo' },
        { status: 403 }
      )
    }

    part.deckPokemonSlugs = slugs
    doc.markModified('participants')
    await doc.save()

    return NextResponse.json(
      { ok: true, deckPokemonSlugs: slugs },
      { status: 200 }
    )
  } catch (error) {
    console.error('PUT /api/events/[id]/my-deck:', error)
    return NextResponse.json(
      { error: 'Error al guardar el deck' },
      { status: 500 }
    )
  }
}
