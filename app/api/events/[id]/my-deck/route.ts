import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { normalizeParticipantDeckPokemonSlugs } from '@/lib/participant-deck-pokemon'
import { parseTournamentDecklistRefBody } from '@/lib/tournament-decklist-ref'
import { validateTournamentDecklistRefForUser } from '@/lib/validate-tournament-decklist-ref'
import { applyDeckContributionAwards } from '@/lib/contribution-points/deck-contribution-awards'
import { resolveWeeklyEventStoreIdForContribution } from '@/lib/contribution-points/resolve-event-store-id'
import { resolveTournamentContributionOrigin } from '@/lib/contribution-points/tournament-origin'
import { invalidateMatchupStatsCacheForUser } from '@/lib/matchup-stats-cache'
import { syncTournamentMetaCacheAfterEventMutation } from '@/lib/tournament-meta-cache'
import { canEditParticipantDeck } from '@/lib/can-edit-participant-deck'
import {
  buildPlayedPopIdSet,
  officialUserPlayedClosedTournament,
  participantPlayedTournament
} from '@/lib/tournament-participant-played'
import type { TournamentStandingLean } from '@/lib/weekly-event-public'
import type { RoundSnapshotLean } from '@/lib/match-rounds-with-snapshots'
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
    if (slugs.length === 0) {
      return NextResponse.json(
        { error: 'Debes elegir al menos un Pokémon (sprite del mazo)' },
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

    const tournamentOrigin: 'official' | 'custom' =
      (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'
        ? 'custom'
        : 'official'
    const eventState =
      doc.state === 'schedule' ||
      doc.state === 'running' ||
      doc.state === 'close'
        ? doc.state
        : 'schedule'
    const leanDoc = doc as {
      tournamentStandings?: TournamentStandingLean[]
      roundSnapshots?: RoundSnapshotLean[]
    }
    const userPopId =
      typeof (session.user as { popid?: string }).popid === 'string'
        ? (session.user as { popid: string }).popid
        : ''
    const myPlayedTournament =
      eventState === 'close' && tournamentOrigin === 'official'
        ? officialUserPlayedClosedTournament(part, userPopId, leanDoc)
        : participantPlayedTournament(
            part,
            buildPlayedPopIdSet(leanDoc),
            tournamentOrigin
          )
    if (
      !canEditParticipantDeck({
        myRegistration: part.displayName,
        kind: doc.kind,
        game: doc.game,
        state: eventState,
        myPlayedTournament
      })
    ) {
      return NextResponse.json(
        {
          error:
            'No puedes registrar deck: el torneo terminó y tu POP ID no figura entre los jugadores que participaron.'
        },
        { status: 403 }
      )
    }

    const previousSlugs = Array.isArray(part.deckPokemonSlugs)
      ? [...part.deckPokemonSlugs]
      : []
    const previousDecklistRef = part.tournamentDecklistRef
      ? {
          decklistId: part.tournamentDecklistRef.decklistId,
          listKind: part.tournamentDecklistRef.listKind,
          variantId: part.tournamentDecklistRef.variantId
        }
      : null

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

    const activeStoreId = (
      session.user as { activeStoreId?: string } | undefined
    )?.activeStoreId
    const storeIdForContribution =
      await resolveWeeklyEventStoreIdForContribution(doc, activeStoreId)
    if (!doc.storeId && storeIdForContribution) {
      doc.storeId = storeIdForContribution
    }

    doc.markModified('participants')
    await doc.save()

    let contributionPointsAwarded: Awaited<
      ReturnType<typeof applyDeckContributionAwards>
    > = []

    if (storeIdForContribution) {
      contributionPointsAwarded = await applyDeckContributionAwards({
        storeId: storeIdForContribution,
        userId: uid,
        eventId: doc._id,
        eventTitle: String(doc.title ?? 'Torneo'),
        tournamentOrigin: resolveTournamentContributionOrigin(
          (doc as { tournamentOrigin?: string }).tournamentOrigin
        ),
        previousSlugs,
        nextSlugs: slugs,
        previousDecklistRef,
        nextDecklistRef: part.tournamentDecklistRef
          ? {
              decklistId: part.tournamentDecklistRef.decklistId,
              listKind: part.tournamentDecklistRef.listKind,
              variantId: part.tournamentDecklistRef.variantId
            }
          : null,
        userInitiatedSave: true
      })
    }

    await Promise.all([
      syncTournamentMetaCacheAfterEventMutation(String(doc._id), doc),
      invalidateMatchupStatsCacheForUser(session.user.id)
    ])

    return NextResponse.json(
      { ok: true, deckPokemonSlugs: slugs, contributionPointsAwarded },
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
