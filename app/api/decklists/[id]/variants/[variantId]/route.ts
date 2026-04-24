import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { parsePatchVariantPayload } from '@/lib/decklist-variant-payload'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'

function parseObjectId(id: string): mongoose.Types.ObjectId | null {
  try {
    return new mongoose.Types.ObjectId(id.trim())
  } catch {
    return null
  }
}

/** Actualiza etiqueta y/o texto de una variante. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, variantId } = await context.params
    const deckOid = parseObjectId(id || '')
    const varOid = parseObjectId(variantId || '')
    if (!deckOid || !varOid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const parsed = parsePatchVariantPayload(body)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Incluye al menos un campo: label o deckText válidos' },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.findOne({ _id: deckOid, userId: uid })
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const sub = doc.variants.id(varOid)
    if (!sub) {
      return NextResponse.json(
        { error: 'Variante no encontrada' },
        { status: 404 }
      )
    }

    if (parsed.label !== undefined) sub.label = parsed.label
    if (parsed.deckText !== undefined) sub.deckText = parsed.deckText
    await doc.save()

    return NextResponse.json({
      variant: {
        id: sub._id.toString(),
        label: sub.label,
        deckText: sub.deckText
      },
      updatedAt: doc.updatedAt.toISOString()
    })
  } catch (e) {
    console.error('PATCH /api/decklists/[id]/variants/[variantId]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar la variante' },
      { status: 500 }
    )
  }
}

/** Elimina una variante. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, variantId } = await context.params
    const deckOid = parseObjectId(id || '')
    const varOid = parseObjectId(variantId || '')
    if (!deckOid || !varOid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.findOne({ _id: deckOid, userId: uid })
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const sub = doc.variants.id(varOid)
    if (!sub) {
      return NextResponse.json(
        { error: 'Variante no encontrada' },
        { status: 404 }
      )
    }

    if (
      doc.principalVariantId &&
      doc.principalVariantId.toString() === varOid.toString()
    ) {
      doc.set('principalVariantId', null)
    }

    sub.deleteOne()
    await doc.save()

    return NextResponse.json({
      ok: true,
      updatedAt: doc.updatedAt.toISOString()
    })
  } catch (e) {
    console.error('DELETE /api/decklists/[id]/variants/[variantId]:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar la variante' },
      { status: 500 }
    )
  }
}
