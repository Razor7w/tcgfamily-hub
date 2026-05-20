import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import { ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { normalizeParticipantDeckPokemonSlugs } from '@/lib/participant-deck-pokemon'
import { parseTournamentDecklistRefBody } from '@/lib/tournament-decklist-ref'
import { validateTournamentDecklistRefForUser } from '@/lib/validate-tournament-decklist-ref'
import WeeklyEvent from '@/models/WeeklyEvent'

/**
 * Owner HQ: asigna sprites y referencia de decklist a un participante con cuenta.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { id: eventId } = await context.params
    if (!eventId?.trim() || !mongoose.Types.ObjectId.isValid(eventId.trim())) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      body && typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}

    const targetUserId = typeof rec.userId === 'string' ? rec.userId.trim() : ''
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: 'userId inválido' }, { status: 400 })
    }

    const pokemonRaw = 'pokemon' in rec ? rec.pokemon : undefined
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
    if (slugs.length === 0) {
      return NextResponse.json(
        { error: 'Debes indicar al menos un sprite del mazo' },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(targetUserId)

    const doc = await WeeklyEvent.findOne({
      _id: new mongoose.Types.ObjectId(eventId.trim()),
      ...ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER
    })

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
        { error: 'El jugador no está inscrito en este evento' },
        { status: 404 }
      )
    }

    part.deckPokemonSlugs = slugs

    if ('tournamentDecklistRef' in rec) {
      const refParsed = parseTournamentDecklistRefBody(rec)
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
              ? 'Decklist no encontrado para este jugador'
              : checked.reason === 'slug_mismatch'
                ? 'Los Pokémon deben coincidir con el mazo elegido'
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

    return NextResponse.json({
      ok: true,
      deckPokemonSlugs: slugs,
      displayName: part.displayName
    })
  } catch (error) {
    console.error(
      'PUT /api/admin/owner/manual-report/events/[id]/participant-deck:',
      error
    )
    return NextResponse.json(
      { error: 'Error al guardar el deck del participante' },
      { status: 500 }
    )
  }
}
