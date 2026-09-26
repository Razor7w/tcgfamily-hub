import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import {
  CARD_SINGLE_NOTE_MAX,
  CARD_SINGLE_PRICE_CLP_MAX,
  CARD_SINGLE_QUANTITY_MAX
} from '@/lib/card-binder-constants'
import { isCardSingleCondition } from '@/lib/card-single-condition'
import { isCardSingleLanguage } from '@/lib/card-single-language'
import { toCardSingleDTO } from '@/lib/card-single-dto'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardSingle from '@/models/CardSingle'
import CardSingleInterest from '@/models/CardSingleInterest'
import User from '@/models/User'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Single inválido' }, { status: 400 })
    }

    await connectDB()
    const doc = await CardSingle.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id)
    })
    if (!doc) {
      return NextResponse.json(
        { error: 'Single no encontrado' },
        { status: 404 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (body.condition !== undefined) {
      if (!isCardSingleCondition(body.condition)) {
        return NextResponse.json(
          { error: 'Estado de conservación inválido' },
          { status: 400 }
        )
      }
      doc.condition = body.condition
    }

    if (body.language !== undefined) {
      if (!isCardSingleLanguage(body.language)) {
        return NextResponse.json(
          { error: 'Idioma de la carta inválido' },
          { status: 400 }
        )
      }
      doc.language = body.language
    }

    if (body.priceClp !== undefined) {
      const priceClp = Math.round(Number(body.priceClp))
      if (
        !Number.isFinite(priceClp) ||
        priceClp < 0 ||
        priceClp > CARD_SINGLE_PRICE_CLP_MAX
      ) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
      }
      doc.priceClp = priceClp
    }

    if (body.compareAtPriceClp !== undefined) {
      if (body.compareAtPriceClp === null || body.compareAtPriceClp === '') {
        doc.compareAtPriceClp = null
      } else {
        const compareAt = Math.round(Number(body.compareAtPriceClp))
        if (
          !Number.isFinite(compareAt) ||
          compareAt < 0 ||
          compareAt > CARD_SINGLE_PRICE_CLP_MAX
        ) {
          return NextResponse.json(
            { error: 'Precio anterior inválido' },
            { status: 400 }
          )
        }
        doc.compareAtPriceClp = compareAt
      }
    }

    const effectiveCompare =
      doc.compareAtPriceClp != null
        ? Math.round(Number(doc.compareAtPriceClp))
        : null
    if (
      effectiveCompare != null &&
      (!Number.isFinite(effectiveCompare) || effectiveCompare <= doc.priceClp)
    ) {
      doc.compareAtPriceClp = null
    }

    if (body.quantity !== undefined) {
      const quantity = Math.round(Number(body.quantity))
      if (
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        quantity > CARD_SINGLE_QUANTITY_MAX
      ) {
        return NextResponse.json(
          { error: 'Cantidad inválida' },
          { status: 400 }
        )
      }
      doc.quantity = quantity
    }

    if (typeof body.note === 'string') {
      doc.note = body.note.trim().slice(0, CARD_SINGLE_NOTE_MAX)
    }

    if (body.published !== undefined) {
      const wantPublished = Boolean(body.published)
      if (wantPublished) {
        const binder = await CardBinder.findById(doc.binderId)
          .select('slug')
          .lean<{ slug?: string } | null>()
        const binderSlug =
          typeof binder?.slug === 'string' ? binder.slug.trim() : ''
        if (!binderSlug) {
          return NextResponse.json(
            {
              error:
                'Esta carpeta no tiene slug público. Edita la carpeta y define un slug.'
            },
            { status: 400 }
          )
        }

        const user = await User.findById(session.user.id)
          .select('phone')
          .lean<{ phone?: string } | null>()
        const phone = typeof user?.phone === 'string' ? user.phone.trim() : ''
        if (!phone) {
          return NextResponse.json(
            {
              error:
                'Debes agregar un teléfono en tu perfil para que te contacten por WhatsApp.',
              code: 'PHONE_REQUIRED'
            },
            { status: 400 }
          )
        }

        doc.published = true
        doc.storeId = null
      } else {
        doc.published = false
      }
    }

    await doc.save()
    return NextResponse.json({
      single: toCardSingleDTO(
        doc.toObject() as unknown as Parameters<typeof toCardSingleDTO>[0]
      )
    })
  } catch (e) {
    console.error('PATCH /api/me/singles/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el single' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Single inválido' }, { status: 400 })
    }

    await connectDB()
    const singleOid = new mongoose.Types.ObjectId(id)
    const deleted = await CardSingle.findOneAndDelete({
      _id: singleOid,
      userId: new mongoose.Types.ObjectId(session.user.id)
    })
    if (!deleted) {
      return NextResponse.json(
        { error: 'Single no encontrado' },
        { status: 404 }
      )
    }
    await CardSingleInterest.deleteMany({ singleId: singleOid })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/me/singles/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar el single' },
      { status: 500 }
    )
  }
}
