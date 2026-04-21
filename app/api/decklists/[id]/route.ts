import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'

function serializePrincipalVariantId(
  raw: mongoose.Types.ObjectId | null | undefined
): string | null {
  if (!raw) return null
  return raw.toString()
}

function parseObjectId(id: string): mongoose.Types.ObjectId | null {
  try {
    return new mongoose.Types.ObjectId(id.trim())
  } catch {
    return null
  }
}

/** Un decklist guardado (solo el dueño). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const oid = parseObjectId(id || '')
    if (!oid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.findOne({ _id: oid, userId: uid })
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const variants = Array.isArray(doc.variants)
      ? doc.variants.map(
          (v: {
            _id: mongoose.Types.ObjectId
            label: string
            deckText: string
          }) => ({
            id: v._id.toString(),
            label: v.label,
            deckText: v.deckText
          })
        )
      : []

    return NextResponse.json({
      id: doc._id.toString(),
      name: doc.name,
      deckText: doc.deckText,
      pokemonSlugs: Array.isArray(doc.pokemonSlugs) ? doc.pokemonSlugs : [],
      variants,
      principalVariantId: serializePrincipalVariantId(doc.principalVariantId),
      updatedAt: doc.updatedAt.toISOString(),
      createdAt: doc.createdAt.toISOString()
    })
  } catch (e) {
    console.error('GET /api/decklists/[id]:', e)
    return NextResponse.json(
      { error: 'Error al cargar el decklist' },
      { status: 500 }
    )
  }
}

/**
 * Actualiza qué listado muestra la pestaña «Principal»: el texto base del mazo
 * o el de una variante existente.
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
    const oid = parseObjectId(id || '')
    if (!oid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const o =
      body && typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : null
    if (!o || !('principalVariantId' in o)) {
      return NextResponse.json(
        { error: 'Falta principalVariantId (string o null)' },
        { status: 400 }
      )
    }

    const raw = o.principalVariantId
    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.findOne({ _id: oid, userId: uid })
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (raw === null) {
      doc.set('principalVariantId', null)
    } else if (typeof raw === 'string') {
      const vid = parseObjectId(raw)
      if (!vid) {
        return NextResponse.json(
          { error: 'principalVariantId inválido' },
          { status: 400 }
        )
      }
      const sub = doc.variants.id(vid)
      if (!sub) {
        return NextResponse.json(
          { error: 'La variante no existe en este mazo' },
          { status: 400 }
        )
      }
      doc.principalVariantId = vid
    } else {
      return NextResponse.json(
        { error: 'principalVariantId debe ser string o null' },
        { status: 400 }
      )
    }

    await doc.save()

    return NextResponse.json({
      principalVariantId: serializePrincipalVariantId(doc.principalVariantId),
      updatedAt: doc.updatedAt.toISOString()
    })
  } catch (e) {
    console.error('PATCH /api/decklists/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el mazo' },
      { status: 500 }
    )
  }
}

/** Elimina el mazo guardado (solo el dueño). */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const oid = parseObjectId(id || '')
    if (!oid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const result = await SavedDecklist.deleteOne({ _id: oid, userId: uid })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/decklists/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar el mazo' },
      { status: 500 }
    )
  }
}
