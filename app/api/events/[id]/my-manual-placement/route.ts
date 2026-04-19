import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { parseManualPlacementBody } from '@/lib/manual-placement'
import WeeklyEvent from '@/models/WeeklyEvent'

/**
 * Actualiza o quita la posición final declarada por el jugador en un torneo custom
 * (misma semántica que al crear el torneo con «Incluir mi posición final»).
 */
export async function PATCH(
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const b = body as Record<string, unknown>
    const clear = b.clear === true

    let placementPayload: ReturnType<typeof parseManualPlacementBody> = null
    if (!clear) {
      placementPayload = parseManualPlacementBody(b.placement)
      if (!placementPayload) {
        return NextResponse.json(
          {
            error:
              'Datos de posición inválidos (categoría 0–2, puesto 1–999 o DNF)'
          },
          { status: 400 }
        )
      }
    }

    await connectDB()

    const doc = await WeeklyEvent.findById(id.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (doc.tournamentOrigin !== 'custom') {
      return NextResponse.json(
        { error: 'Solo aplica a torneos personalizados' },
        { status: 400 }
      )
    }

    if (doc.kind !== 'tournament' || doc.game !== 'pokemon') {
      return NextResponse.json(
        { error: 'No aplica a este evento' },
        { status: 400 }
      )
    }

    const idx = doc.participants.findIndex(
      p => p.userId && String(p.userId) === session.user.id
    )
    if (idx < 0) {
      return NextResponse.json(
        { error: 'No participas en este torneo' },
        { status: 403 }
      )
    }

    const part = doc.participants[idx]
    if (!part) {
      return NextResponse.json(
        { error: 'Participante no encontrado' },
        { status: 400 }
      )
    }

    if (clear) {
      part.manualPlacement = undefined
    } else if (placementPayload) {
      part.manualPlacement = {
        categoryIndex: placementPayload.categoryIndex,
        place: placementPayload.place,
        isDnf: placementPayload.isDnf
      }
    }

    doc.markModified('participants')
    await doc.save()

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('PATCH /api/events/[id]/my-manual-placement:', error)
    return NextResponse.json(
      { error: 'No se pudo guardar la posición' },
      { status: 500 }
    )
  }
}
