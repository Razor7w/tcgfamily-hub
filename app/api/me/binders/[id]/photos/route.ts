import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import {
  CARD_PHOTO_DESCRIPTION_MAX,
  CARD_PHOTO_NAME_MAX
} from '@/lib/card-binder-constants'
import { toCardPhotoDTO } from '@/lib/card-photo-dto'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardPhoto from '@/models/CardPhoto'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

function isOwnedUploadKey(userId: string, key: string): boolean {
  return key.startsWith(`uploads/${userId}/`)
}

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
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

    const rows = await CardPhoto.find({ binderId: binderOid, userId: userOid })
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      photos: rows.map(r =>
        toCardPhotoDTO(r as unknown as Parameters<typeof toCardPhotoDTO>[0])
      )
    })
  } catch (e) {
    console.error('GET /api/me/binders/[id]/photos:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las fotos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Carpeta inválida' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const name =
      typeof body.name === 'string'
        ? body.name.trim().slice(0, CARD_PHOTO_NAME_MAX)
        : ''
    const description =
      typeof body.description === 'string'
        ? body.description.trim().slice(0, CARD_PHOTO_DESCRIPTION_MAX)
        : ''
    const imageUrl =
      typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const imageKey =
      typeof body.imageKey === 'string' ? body.imageKey.trim() : ''

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      )
    }
    if (!imageUrl || !imageKey) {
      return NextResponse.json(
        { error: 'Falta la imagen subida' },
        { status: 400 }
      )
    }
    if (!isOwnedUploadKey(session.user.id, imageKey)) {
      return NextResponse.json({ error: 'Imagen inválida' }, { status: 400 })
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

    const doc = await CardPhoto.create({
      userId: userOid,
      binderId: binderOid,
      name,
      description,
      imageUrl,
      imageKey,
      published: false
    })

    await CardBinder.updateOne(
      { _id: binderOid },
      { $set: { updatedAt: new Date() } }
    )

    return NextResponse.json({
      photo: toCardPhotoDTO(
        doc.toObject() as unknown as Parameters<typeof toCardPhotoDTO>[0]
      )
    })
  } catch (e) {
    console.error('POST /api/me/binders/[id]/photos:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar la foto' },
      { status: 500 }
    )
  }
}
