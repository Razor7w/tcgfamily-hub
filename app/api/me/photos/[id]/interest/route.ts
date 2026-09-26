import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import CardPhoto from '@/models/CardPhoto'
import CardPhotoInterest from '@/models/CardPhotoInterest'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const photoOid = new mongoose.Types.ObjectId(id)
    await connectDB()

    const photo = await CardPhoto.findById(photoOid)
      .select('userId published interestCount')
      .lean<{
        userId: mongoose.Types.ObjectId
        published: boolean
        interestCount: number
      } | null>()

    if (!photo || !photo.published) {
      return NextResponse.json({ error: 'Foto no disponible' }, { status: 404 })
    }
    if (photo.userId.equals(userOid)) {
      return NextResponse.json(
        { error: 'No puedes marcar interés en tu propia foto' },
        { status: 400 }
      )
    }

    try {
      await CardPhotoInterest.create({
        photoId: photoOid,
        userId: userOid
      })
      await CardPhoto.updateOne(
        { _id: photoOid },
        { $inc: { interestCount: 1 } }
      )
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: number }).code
          : undefined
      if (code !== 11000) throw e
    }

    const updated = await CardPhoto.findById(photoOid)
      .select('interestCount')
      .lean<{ interestCount?: number } | null>()

    return NextResponse.json({
      interestedByMe: true,
      interestCount: Math.max(0, Number(updated?.interestCount) || 0)
    })
  } catch (e) {
    console.error('POST /api/me/photos/[id]/interest:', e)
    return NextResponse.json(
      { error: 'No se pudo marcar el interés' },
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
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const photoOid = new mongoose.Types.ObjectId(id)
    await connectDB()

    const removed = await CardPhotoInterest.findOneAndDelete({
      photoId: photoOid,
      userId: userOid
    })
    if (removed) {
      await CardPhoto.updateOne(
        { _id: photoOid, interestCount: { $gt: 0 } },
        { $inc: { interestCount: -1 } }
      )
    }

    const updated = await CardPhoto.findById(photoOid)
      .select('interestCount')
      .lean<{ interestCount?: number } | null>()

    return NextResponse.json({
      interestedByMe: false,
      interestCount: Math.max(0, Number(updated?.interestCount) || 0)
    })
  } catch (e) {
    console.error('DELETE /api/me/photos/[id]/interest:', e)
    return NextResponse.json(
      { error: 'No se pudo quitar el interés' },
      { status: 500 }
    )
  }
}
