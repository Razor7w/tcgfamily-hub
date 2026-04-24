import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { normalizeParticipantDeckPokemonSlugs } from '@/lib/participant-deck-pokemon'
import { parseTournamentDecklistRefBody } from '@/lib/tournament-decklist-ref'
import { validateTournamentDecklistRefForUser } from '@/lib/validate-tournament-decklist-ref'
import WeeklyEvent from '@/models/WeeklyEvent'

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
    const slugs = normalizeParticipantDeckPokemonSlugs(pokemonRaw)
    if (slugs === null) {
      return NextResponse.json(
        {
          error:
            'Lista inválida: máximo 2 Pokémon, slugs en minúsculas (ej. dragapult)'
        },
        { status: 400 }
      )
    }

    const bodyObj =
      body && typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}

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

    if ('tournamentDecklistRef' in bodyObj) {
      const refParsed = parseTournamentDecklistRefBody(bodyObj)
      if (refParsed === null) {
        part.tournamentDecklistRef = undefined
      } else if (refParsed === undefined) {
        return NextResponse.json(
          { error: 'Referencia de decklist inválida' },
          { status: 400 }
        )
      } else {
        const checked = await validateTournamentDecklistRefForUser(
          uid,
          refParsed,
          slugs
        )
        if (!checked.ok) {
          const msg =
            checked.reason === 'not_found'
              ? 'Decklist no encontrado'
              : checked.reason === 'slug_mismatch'
                ? 'Los Pokémon del deck deben coincidir con el mazo elegido'
                : 'Variante no válida'
          return NextResponse.json({ error: msg }, { status: 400 })
        }
        part.tournamentDecklistRef = {
          decklistId: checked.value.decklistId,
          listKind: checked.value.listKind,
          variantId: checked.value.variantId ?? undefined
        }
      }
    }

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
