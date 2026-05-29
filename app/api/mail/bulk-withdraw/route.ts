import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { applyMailWithdrawnInStoreContributionAward } from '@/lib/contribution-points/mail-contribution-awards'

const MAX_BULK_WITHDRAW = 100

function parseMailIds(ids: unknown): mongoose.Types.ObjectId[] {
  if (!Array.isArray(ids)) return []
  const out: mongoose.Types.ObjectId[] = []
  for (const id of ids) {
    if (typeof id !== 'string') continue
    try {
      out.push(new mongoose.Types.ObjectId(id))
    } catch {
      // omitir ids inválidos
    }
  }
  return out
}

/** POST - Marcar varios correos como retirados (isRecived: true) en una sola operación. */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const body = await request.json()
    const mailIds = parseMailIds(body.mailIds)

    if (mailIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un ID de correo válido' },
        { status: 400 }
      )
    }

    if (mailIds.length > MAX_BULK_WITHDRAW) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BULK_WITHDRAW} correos por operación` },
        { status: 400 }
      )
    }

    await connectDB()

    const scoped = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>

    const withdrawFilter = {
      _id: { $in: mailIds },
      ...scoped,
      isRecived: false,
      isRecivedInStore: true
    }

    const pending = await Mails.find(withdrawFilter)
      .select('_id fromUserId toUserId storeId')
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId
          fromUserId?: mongoose.Types.ObjectId
          toUserId?: mongoose.Types.ObjectId
          storeId?: mongoose.Types.ObjectId
        }>
      >()

    const result = await Mails.updateMany(withdrawFilter, {
      $set: { isRecived: true }
    })

    for (const mail of pending) {
      const withdrawUserId = mail.toUserId ?? mail.fromUserId
      if (!withdrawUserId) continue
      const storeIdForPoints = mail.storeId ?? gate.activeStoreOid
      await applyMailWithdrawnInStoreContributionAward({
        storeId: storeIdForPoints,
        userId: withdrawUserId,
        mailId: mail._id
      })
    }

    return NextResponse.json({
      updatedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    })
  } catch (error) {
    console.error('Error bulk withdraw mails:', error)
    return NextResponse.json(
      { error: 'Error al marcar correos como retirados' },
      { status: 500 }
    )
  }
}
