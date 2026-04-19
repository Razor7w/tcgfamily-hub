import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import WeeklyEvent from '@/models/WeeklyEvent'
import { popidForStorage } from '@/lib/rut-chile'

const MAX_ROWS = 512
const PLACE_MAX = 9999

function trimPop(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, 32)
}

/**
 * POST — Guardar solo la tabla finished o DNF de una categoría (0 Júnior, 1 Sénior, 2 Máster).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const { id: eventId } = await context.params
    if (!eventId?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}

    const rawCi = rec.categoryIndex
    let categoryIndex = -1
    if (typeof rawCi === 'number' && Number.isFinite(rawCi)) {
      categoryIndex = Math.round(rawCi)
    } else if (typeof rawCi === 'string' && rawCi.trim() !== '') {
      const n = Number(rawCi)
      if (Number.isFinite(n)) categoryIndex = Math.round(n)
    }
    if (categoryIndex !== 0 && categoryIndex !== 1 && categoryIndex !== 2) {
      return NextResponse.json(
        { error: 'categoryIndex debe ser 0, 1 o 2' },
        { status: 400 }
      )
    }

    const podType =
      typeof rec.podType === 'string' ? rec.podType.toLowerCase() : ''
    if (podType !== 'finished' && podType !== 'dnf') {
      return NextResponse.json(
        { error: 'podType debe ser finished o dnf' },
        { status: 400 }
      )
    }

    const rawRows = rec.rows
    if (!Array.isArray(rawRows)) {
      return NextResponse.json(
        { error: 'Se requiere rows (array)' },
        { status: 400 }
      )
    }

    await connectDB()
    const doc = await WeeklyEvent.findById(eventId.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden

    const list = doc.tournamentStandings ?? []
    type Entry = (typeof list)[number]
    let entry = list.find(e => e.categoryIndex === categoryIndex) as
      | Entry
      | undefined
    if (!entry) {
      entry = {
        categoryIndex,
        finished: [],
        dnf: []
      }
      list.push(entry)
    }

    if (podType === 'finished') {
      const finished: { popId: string; place: number }[] = []
      for (const row of rawRows.slice(0, MAX_ROWS)) {
        if (typeof row !== 'object' || row === null) continue
        const r = row as Record<string, unknown>
        const popId = trimPop(r.popId)
        if (!popId) continue
        const place = Math.max(
          0,
          Math.min(PLACE_MAX, Math.round(Number(r.place) || 0))
        )
        finished.push({ popId: popidForStorage(popId), place })
      }
      finished.sort((a, b) => a.place - b.place)
      entry.finished = finished
    } else {
      const dnf: { popId: string }[] = []
      for (const row of rawRows.slice(0, MAX_ROWS)) {
        if (typeof row !== 'object' || row === null) continue
        const r = row as Record<string, unknown>
        const popId = trimPop((r as { popId?: unknown }).popId)
        if (!popId) continue
        dnf.push({ popId: popidForStorage(popId) })
      }
      entry.dnf = dnf
    }

    doc.tournamentStandings = list
    doc.markModified('tournamentStandings')
    await doc.save()

    return NextResponse.json(
      {
        ok: true,
        categoryIndex,
        podType,
        rowCount:
          podType === 'finished' ? entry.finished.length : entry.dnf.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/admin/events/[id]/standings-pod:', error)
    return NextResponse.json(
      { error: 'Error al guardar la clasificación' },
      { status: 500 }
    )
  }
}
