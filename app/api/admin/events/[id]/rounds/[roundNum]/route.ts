import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'
import type { IRoundSnapshot } from '@/models/WeeklyEvent'

function parseRoundNum(raw: string): number | null {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0 || n > 9999) return null
  return n
}

/**
 * DELETE — Quita un snapshot de ronda del evento y recalcula `roundNum` al máximo restante.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; roundNum: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id: eventId, roundNum: roundNumRaw } = await context.params
    if (!eventId?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const roundNum = parseRoundNum(roundNumRaw ?? '')
    if (roundNum === null) {
      return NextResponse.json(
        { error: 'Número de ronda inválido' },
        { status: 400 }
      )
    }

    await connectDB()

    const doc = await weeklyOfficialByIdForStaffGate(gate, eventId.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden

    const prev = [...(doc.roundSnapshots ?? [])] as IRoundSnapshot[]
    const maxSavedRound = prev.reduce(
      (max, s) => Math.max(max, Math.round(Number(s.roundNum) || 0)),
      0
    )
    if (maxSavedRound > 0 && roundNum !== maxSavedRound) {
      return NextResponse.json(
        {
          error: `Solo se puede borrar la última ronda guardada (ronda ${maxSavedRound})`
        },
        { status: 400 }
      )
    }

    const next = prev.filter(s => s.roundNum !== roundNum)
    if (next.length === prev.length) {
      return NextResponse.json(
        { error: 'Esa ronda no está guardada en el evento' },
        { status: 404 }
      )
    }

    doc.roundSnapshots = next as typeof doc.roundSnapshots
    doc.roundNum = next.reduce(
      (max, s) => Math.max(max, Math.round(Number(s.roundNum) || 0)),
      0
    )
    doc.markModified('roundSnapshots')
    await doc.save()

    return NextResponse.json(
      {
        ok: true,
        roundNum: doc.roundNum,
        roundSnapshotsCount: next.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('DELETE /api/admin/events/[id]/rounds/[roundNum]:', error)
    return NextResponse.json(
      { error: 'Error al borrar la ronda' },
      { status: 500 }
    )
  }
}
