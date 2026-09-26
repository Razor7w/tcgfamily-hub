import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import CardSingle from '@/models/CardSingle'
import CardSingleInterest from '@/models/CardSingleInterest'

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
      return NextResponse.json({ error: 'Single inválido' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const singleOid = new mongoose.Types.ObjectId(id)
    await connectDB()

    const single = await CardSingle.findById(singleOid)
      .select('userId published interestCount')
      .lean<{
        userId: mongoose.Types.ObjectId
        published: boolean
        interestCount: number
      } | null>()

    if (!single || !single.published) {
      return NextResponse.json(
        { error: 'Single no disponible' },
        { status: 404 }
      )
    }
    if (single.userId.equals(userOid)) {
      return NextResponse.json(
        { error: 'No puedes marcar interés en tu propio single' },
        { status: 400 }
      )
    }

    try {
      await CardSingleInterest.create({
        singleId: singleOid,
        userId: userOid
      })
      await CardSingle.updateOne(
        { _id: singleOid },
        { $inc: { interestCount: 1 } }
      )
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: number }).code
          : undefined
      if (code !== 11000) throw e
      // ya existía: idempotente
    }

    const updated = await CardSingle.findById(singleOid)
      .select('interestCount')
      .lean<{ interestCount?: number } | null>()

    return NextResponse.json({
      interestedByMe: true,
      interestCount: Math.max(0, Number(updated?.interestCount) || 0)
    })
  } catch (e) {
    console.error('POST /api/me/singles/[id]/interest:', e)
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
      return NextResponse.json({ error: 'Single inválido' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const singleOid = new mongoose.Types.ObjectId(id)
    await connectDB()

    const removed = await CardSingleInterest.findOneAndDelete({
      singleId: singleOid,
      userId: userOid
    })
    if (removed) {
      await CardSingle.updateOne(
        { _id: singleOid, interestCount: { $gt: 0 } },
        { $inc: { interestCount: -1 } }
      )
    }

    const updated = await CardSingle.findById(singleOid)
      .select('interestCount')
      .lean<{ interestCount?: number } | null>()

    return NextResponse.json({
      interestedByMe: false,
      interestCount: Math.max(0, Number(updated?.interestCount) || 0)
    })
  } catch (e) {
    console.error('DELETE /api/me/singles/[id]/interest:', e)
    return NextResponse.json(
      { error: 'No se pudo quitar el interés' },
      { status: 500 }
    )
  }
}
