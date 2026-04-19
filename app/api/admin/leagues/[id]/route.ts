import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import WeeklyEvent from '@/models/WeeklyEvent'
import { DEFAULT_LEAGUE_POINTS_BY_PLACE } from '@/lib/league-constants'
import League from '@/models/League'

function parseBody(body: unknown) {
  if (typeof body !== 'object' || body === null) return null
  return body as Record<string, unknown>
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function readPointsByPlace(raw: unknown): number[] | null {
  if (raw === undefined || raw === null) return null
  if (!Array.isArray(raw)) return null
  const out: number[] = []
  for (const x of raw) {
    const n =
      typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN
    if (!Number.isFinite(n) || n < 0) return null
    out.push(Math.round(n))
  }
  if (out.length < 1 || out.length > 32) return null
  return out
}

function serializeLeague(doc: Record<string, unknown>) {
  const id = doc._id
  return {
    _id: String(id),
    name: doc.name,
    slug: doc.slug,
    description: typeof doc.description === 'string' ? doc.description : '',
    game: doc.game ?? 'pokemon',
    isActive: Boolean(doc.isActive),
    pointsByPlace: Array.isArray(doc.pointsByPlace)
      ? doc.pointsByPlace.map(n => Number(n) || 0)
      : [...DEFAULT_LEAGUE_POINTS_BY_PLACE],
    countBestEvents:
      doc.countBestEvents === null || doc.countBestEvents === undefined
        ? null
        : typeof doc.countBestEvents === 'number' &&
            Number.isFinite(doc.countBestEvents)
          ? Math.round(doc.countBestEvents)
          : null,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string | Date).toISOString()
      : undefined,
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt as string | Date).toISOString()
      : undefined
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const doc = await League.findById(id).lean()
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json(
      { league: serializeLeague(doc as Record<string, unknown>) },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/admin/leagues/[id]:', error)
    return NextResponse.json(
      { error: 'Error al obtener liga' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = parseBody(await request.json().catch(() => null))
    if (!body) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    await connectDB()
    const doc = await League.findById(id)
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (typeof body.name === 'string') {
      const t = body.name.trim().slice(0, 200)
      if (!t) {
        return NextResponse.json({ error: 'Nombre vacío' }, { status: 400 })
      }
      doc.name = t
    }

    if (typeof body.slug === 'string') {
      const s = body.slug.trim().toLowerCase()
      if (!s || !SLUG_RE.test(s)) {
        return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
      }
      doc.slug = s
    }

    if (typeof body.description === 'string') {
      doc.description = body.description.trim().slice(0, 4000)
    }

    if (body.isActive !== undefined) {
      doc.isActive = Boolean(body.isActive)
    }

    if (body.pointsByPlace !== undefined) {
      const pts = readPointsByPlace(body.pointsByPlace)
      if (!pts) {
        return NextResponse.json(
          { error: 'pointsByPlace inválido' },
          { status: 400 }
        )
      }
      doc.pointsByPlace = pts
    }

    if (body.countBestEvents !== undefined) {
      if (body.countBestEvents === null || body.countBestEvents === '') {
        doc.set('countBestEvents', null)
      } else {
        const n =
          typeof body.countBestEvents === 'number'
            ? body.countBestEvents
            : Number(body.countBestEvents)
        if (!Number.isFinite(n) || n < 1 || n > 52) {
          return NextResponse.json(
            { error: 'countBestEvents entre 1 y 52 o vacío' },
            { status: 400 }
          )
        }
        doc.countBestEvents = Math.round(n)
      }
    }

    await doc.save()
    return NextResponse.json(
      {
        league: serializeLeague(
          doc.toObject() as unknown as Record<string, unknown>
        )
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code?: number }).code
        : undefined
    if (code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe una liga con ese slug' },
        { status: 409 }
      )
    }
    console.error('PATCH /api/admin/leagues/[id]:', error)
    return NextResponse.json(
      { error: 'Error al actualizar liga' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const inUse = await WeeklyEvent.exists({ leagueId: id })
    if (inUse) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar: hay torneos asignados a esta liga. Quita la liga de esos eventos primero.'
        },
        { status: 409 }
      )
    }

    const res = await League.findByIdAndDelete(id)
    if (!res) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE /api/admin/leagues/[id]:', error)
    return NextResponse.json(
      { error: 'Error al eliminar liga' },
      { status: 500 }
    )
  }
}
