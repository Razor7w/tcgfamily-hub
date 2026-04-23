import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { requireAdminSession } from '@/lib/api-auth'
import League from '@/models/League'

function parseBody(body: unknown) {
  if (typeof body !== 'object' || body === null) return null
  return body as Record<string, unknown>
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function serializeLeague(doc: Record<string, unknown>) {
  const id = doc._id
  return {
    _id: String(id),
    name: doc.name,
    slug: doc.slug,
    description: typeof doc.description === 'string' ? doc.description : '',
    game: doc.game ?? 'pokemon',
    isActive: Boolean(doc.isActive),
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

export async function GET() {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const raw = await League.find().sort({ name: 1 }).lean()
    const leagues = raw.map(d => serializeLeague(d as Record<string, unknown>))
    return NextResponse.json({ leagues }, { status: 200 })
  } catch (error) {
    console.error('GET /api/admin/leagues:', error)
    return NextResponse.json(
      { error: 'Error al obtener ligas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const body = parseBody(await request.json().catch(() => null))
    if (!body) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const name =
      typeof body.name === 'string' ? body.name.trim().slice(0, 200) : ''
    if (!name) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const slugRaw =
      typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    if (!slugRaw || !SLUG_RE.test(slugRaw)) {
      return NextResponse.json(
        {
          error:
            'Slug inválido: usa minúsculas, números y guiones (ej. liga-2026-primavera)'
        },
        { status: 400 }
      )
    }

    const description =
      typeof body.description === 'string'
        ? body.description.trim().slice(0, 4000)
        : ''

    let countBestEvents: number | null | undefined = undefined
    if (body.countBestEvents === null || body.countBestEvents === '') {
      countBestEvents = null
    } else if (body.countBestEvents !== undefined) {
      const n =
        typeof body.countBestEvents === 'number'
          ? body.countBestEvents
          : Number(body.countBestEvents)
      if (!Number.isFinite(n) || n < 1 || n > 52) {
        return NextResponse.json(
          { error: 'countBestEvents debe estar entre 1 y 52 u omitirse' },
          { status: 400 }
        )
      }
      countBestEvents = Math.round(n)
    }

    await connectDB()
    const doc = await League.create({
      name,
      slug: slugRaw,
      description,
      game: 'pokemon',
      isActive: body.isActive === false ? false : true,
      countBestEvents: countBestEvents === undefined ? null : countBestEvents
    })

    return NextResponse.json(
      {
        league: serializeLeague(
          doc.toObject() as unknown as Record<string, unknown>
        )
      },
      { status: 201 }
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
    console.error('POST /api/admin/leagues:', error)
    return NextResponse.json({ error: 'Error al crear liga' }, { status: 500 })
  }
}
