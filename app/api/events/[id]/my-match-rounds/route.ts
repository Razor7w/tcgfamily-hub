import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { normalizeMatchRoundsPayload } from '@/lib/participant-match-round'
import WeeklyEvent from '@/models/WeeklyEvent'
import type { IParticipantMatchRound } from '@/models/WeeklyEvent'

/** Reemplaza la lista de rondas reportadas por el usuario en este torneo. */
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

    const rounds = normalizeMatchRoundsPayload(body)
    if (rounds === null) {
      return NextResponse.json(
        { error: 'Lista de rondas inválida' },
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

    const isCustom =
      (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'

    const w = Math.max(0, Math.min(999, Math.round(Number(part.wins) || 0)))
    const l = Math.max(0, Math.min(999, Math.round(Number(part.losses) || 0)))
    const t = Math.max(0, Math.min(999, Math.round(Number(part.ties) || 0)))
    const recordSum = w + l + t
    const tournamentClosed = doc.state === 'close'
    const maxRoundsAllowed = isCustom
      ? 20
      : recordSum > 0
        ? recordSum
        : tournamentClosed
          ? 0
          : 15
    if (rounds.length > maxRoundsAllowed) {
      return NextResponse.json(
        {
          error:
            maxRoundsAllowed === 0
              ? 'Tu récord oficial es 0-0-0; no puedes registrar rondas en la bitácora.'
              : `Solo puedes registrar hasta ${maxRoundsAllowed} ronda(s) según tu récord del torneo (W+L+T).`
        },
        { status: 400 }
      )
    }

    const toSave: IParticipantMatchRound[] = rounds.map(r => ({
      roundNum: r.roundNum,
      opponentDeckSlugs: r.opponentDeckSlugs,
      gameResults: r.gameResults,
      turnOrders: r.turnOrders,
      ...(r.specialOutcome ? { specialOutcome: r.specialOutcome } : {})
    }))

    part.matchRounds = toSave
    doc.markModified('participants')
    await doc.save()

    return NextResponse.json({ ok: true, rounds: toSave }, { status: 200 })
  } catch (error) {
    console.error('PUT /api/events/[id]/my-match-rounds:', error)
    return NextResponse.json(
      { error: 'Error al guardar las rondas' },
      { status: 500 }
    )
  }
}
