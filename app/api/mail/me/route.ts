import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import mongoose from 'mongoose'
import {
  clean as cleanRut,
  format as formatRut,
  validate as validateRut
} from 'rut.js'

// GET - mails donde el usuario actual es emisor (from) o receptor (to)
// Query: ?limit=3 para traer solo los 3 más recientes
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100)
      : undefined
    const pendingOnly =
      searchParams.get('pending') === '1' ||
      searchParams.get('pending') === 'true'
    const inStoreOnly =
      searchParams.get('inStore') === '1' ||
      searchParams.get('inStore') === 'true'

    await connectDB()
    const userId = session.user.id as string
    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(userId)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const sessionRut =
      typeof session.user.rut === 'string' ? session.user.rut.trim() : ''
    const rutVariants: string[] = []
    if (sessionRut && validateRut(sessionRut)) {
      const cleaned = cleanRut(sessionRut)
      rutVariants.push(formatRut(cleaned))
      rutVariants.push(formatRut(cleaned, { dots: false }))
      rutVariants.push(cleaned)
    }

    const query = Mail.find({
      $or: [
        { toUserId: uid },
        { fromUserId: uid },
        ...(rutVariants.length ? [{ toRut: { $in: rutVariants } }] : [])
      ],
      ...(pendingOnly ? { isRecived: false } : {}),
      ...(inStoreOnly ? { isRecivedInStore: true } : {})
    })
      .sort({ createdAt: -1 })
      .populate('fromUserId', 'name rut')
      .populate('toUserId', 'name rut')
      .lean()

    if (limit !== undefined) {
      query.limit(limit)
    }

    const mails = await query

    return NextResponse.json({ mails }, { status: 200 })
  } catch (error) {
    console.error('Error al obtener mails:', error)
    return NextResponse.json(
      { error: 'Error al obtener mails' },
      { status: 500 }
    )
  }
}
