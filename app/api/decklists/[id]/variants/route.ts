import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { DECKLIST_VARIANTS_MAX } from '@/lib/decklist-constants'
import { parseNewVariantPayload } from '@/lib/decklist-variant-payload'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'

function parseObjectId(id: string): mongoose.Types.ObjectId | null {
  try {
    return new mongoose.Types.ObjectId(id.trim())
  } catch {
    return null
  }
}

/** Añade una variante (lista alternativa) al mazo guardado. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const deckOid = parseObjectId(id || '')
    if (!deckOid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const parsed = parseNewVariantPayload(body)
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            'Etiqueta y texto del deck obligatorios; texto dentro del límite permitido'
        },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.findOne({ _id: deckOid, userId: uid })
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const n = doc.variants?.length ?? 0
    if (n >= DECKLIST_VARIANTS_MAX) {
      return NextResponse.json(
        { error: `Máximo ${DECKLIST_VARIANTS_MAX} variantes por mazo` },
        { status: 400 }
      )
    }

    doc.variants.push({
      label: parsed.label,
      deckText: parsed.deckText
    })
    await doc.save()

    const last = doc.variants[doc.variants.length - 1]
    return NextResponse.json(
      {
        variant: {
          id: last._id.toString(),
          label: last.label,
          deckText: last.deckText
        },
        updatedAt: doc.updatedAt.toISOString()
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/decklists/[id]/variants:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar la variante' },
      { status: 500 }
    )
  }
}
