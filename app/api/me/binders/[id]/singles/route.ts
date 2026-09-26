import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSellerModuleSession } from '@/lib/seller-module-access'
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

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Carpeta inválida' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const binderOid = new mongoose.Types.ObjectId(id)
    await connectDB()

    const binder = await CardBinder.findOne({
      _id: binderOid,
      userId: userOid
    })
      .select('_id')
      .lean()
    if (!binder) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      )
    }

    const rows = await CardSingle.find({ binderId: binderOid, userId: userOid })
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      singles: rows.map(r =>
        toCardSingleDTO(r as unknown as Parameters<typeof toCardSingleDTO>[0])
      )
    })
  } catch (e) {
    console.error('GET /api/me/binders/[id]/singles:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los singles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Carpeta inválida' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    const set =
      typeof body.set === 'string' ? body.set.trim().toUpperCase() : ''
    const number =
      typeof body.number === 'string'
        ? body.number.trim()
        : body.number != null
          ? String(body.number).trim()
          : ''
    const region =
      typeof body.region === 'string' && body.region.trim()
        ? body.region.trim()
        : 'int'
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const cardType =
      typeof body.cardType === 'string' ? body.cardType.trim() : ''
    const limitlessId = Number(body.limitlessId)
    const priceClp = Math.round(Number(body.priceClp))
    const quantity = Math.round(Number(body.quantity ?? 1))
    const condition = body.condition
    const note =
      typeof body.note === 'string'
        ? body.note.trim().slice(0, CARD_SINGLE_NOTE_MAX)
        : ''
    const marketRaw = body.marketPriceUsd
    const marketPriceUsd =
      marketRaw != null && Number.isFinite(Number(marketRaw))
        ? Number(marketRaw)
        : null

    if (!set || !number || !name || !Number.isFinite(limitlessId)) {
      return NextResponse.json(
        { error: 'Datos de la carta incompletos' },
        { status: 400 }
      )
    }
    if (!isCardSingleCondition(condition)) {
      return NextResponse.json(
        { error: 'Estado de conservación inválido' },
        { status: 400 }
      )
    }
    if (!isCardSingleLanguage(body.language)) {
      return NextResponse.json(
        { error: 'Idioma de la carta obligatorio' },
        { status: 400 }
      )
    }
    const language = body.language
    if (
      !Number.isFinite(priceClp) ||
      priceClp < 0 ||
      priceClp > CARD_SINGLE_PRICE_CLP_MAX
    ) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }
    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > CARD_SINGLE_QUANTITY_MAX
    ) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const binderOid = new mongoose.Types.ObjectId(id)
    await connectDB()

    const binder = await CardBinder.findOne({
      _id: binderOid,
      userId: userOid
    })
      .select('_id')
      .lean()
    if (!binder) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      )
    }

    const doc = await CardSingle.create({
      userId: userOid,
      binderId: binderOid,
      storeId: null,
      limitlessId,
      setCode: set,
      number,
      region,
      name: name.slice(0, 160),
      cardType: cardType.slice(0, 64),
      condition,
      language,
      priceClp,
      quantity,
      published: false,
      note,
      marketPriceUsd,
      interestCount: 0
    })

    await CardBinder.updateOne(
      { _id: binderOid },
      { $set: { updatedAt: new Date() } }
    )

    return NextResponse.json(
      {
        single: toCardSingleDTO(
          doc.toObject() as unknown as Parameters<typeof toCardSingleDTO>[0]
        )
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/me/binders/[id]/singles:', e)
    return NextResponse.json(
      { error: 'No se pudo agregar el single' },
      { status: 500 }
    )
  }
}
