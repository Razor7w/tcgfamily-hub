import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { requireSellerModuleSession } from '@/lib/seller-module-access'
import {
  CARD_PHOTO_DESCRIPTION_MAX,
  CARD_PHOTO_NAME_MAX
} from '@/lib/card-binder-constants'
import { toCardPhotoDTO } from '@/lib/card-photo-dto'
import { r2BucketName, r2Client } from '@/lib/r2'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardPhoto from '@/models/CardPhoto'
import CardPhotoInterest from '@/models/CardPhotoInterest'
import User from '@/models/User'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    }

    await connectDB()
    const doc = await CardPhoto.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id)
    })
    if (!doc) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (typeof body.name === 'string') {
      const name = body.name.trim().slice(0, CARD_PHOTO_NAME_MAX)
      if (!name) {
        return NextResponse.json(
          { error: 'El nombre es obligatorio' },
          { status: 400 }
        )
      }
      doc.name = name
    }

    if (typeof body.description === 'string') {
      doc.description = body.description
        .trim()
        .slice(0, CARD_PHOTO_DESCRIPTION_MAX)
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
      } else {
        doc.published = false
      }
    }

    await doc.save()
    return NextResponse.json({
      photo: toCardPhotoDTO(
        doc.toObject() as unknown as Parameters<typeof toCardPhotoDTO>[0]
      )
    })
  } catch (e) {
    console.error('PATCH /api/me/photos/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar la foto' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    }

    await connectDB()
    const deleted = await CardPhoto.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id)
    })
    if (!deleted) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }

    await CardPhotoInterest.deleteMany({ photoId: deleted._id })

    const key = typeof deleted.imageKey === 'string' ? deleted.imageKey : ''
    if (key.startsWith(`uploads/${session.user.id}/`)) {
      try {
        await r2Client().send(
          new DeleteObjectCommand({
            Bucket: r2BucketName(),
            Key: key
          })
        )
      } catch (err) {
        console.error('R2 delete card photo:', err)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/me/photos/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar la foto' },
      { status: 500 }
    )
  }
}
