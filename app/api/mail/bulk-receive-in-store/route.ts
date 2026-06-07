import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { queueMailPickupReadyEmails } from '@/lib/email/queue-mail-pickup-ready-emails'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import User from '@/models/User'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { applyMailReceivedInStoreContributionAward } from '@/lib/contribution-points/mail-contribution-awards'

const MAX_BULK_RECEIVE = 100

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

/** POST - Marcar varios correos como recibidos en tienda en una sola operación. */
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

    if (mailIds.length > MAX_BULK_RECEIVE) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BULK_RECEIVE} correos por operación` },
        { status: 400 }
      )
    }

    await connectDB()

    const scoped = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>

    const filter = {
      _id: { $in: mailIds },
      ...scoped,
      isRecived: false,
      isRecivedInStore: false
    }

    const pending = await Mails.find(filter)
      .select('_id fromUserId toUserId code storeId')
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId
          fromUserId?: mongoose.Types.ObjectId
          toUserId?: unknown
          code?: string
          storeId?: mongoose.Types.ObjectId
        }>
      >()

    const now = new Date()
    const result = await Mails.updateMany(filter, {
      $set: { isRecivedInStore: true, receivedInStoreAt: now }
    })

    for (const mail of pending) {
      if (!mail.fromUserId) continue
      const storeIdForPoints = mail.storeId ?? gate.activeStoreOid
      await applyMailReceivedInStoreContributionAward({
        storeId: storeIdForPoints,
        fromUserId: mail.fromUserId,
        mailId: mail._id
      })
    }

    const pickupEmailJobs: {
      toEmail: string
      recipientName?: string
      mailCode: string
    }[] = []

    if (pending.length > 0) {
      const toUserIds = [
        ...new Set(
          pending
            .map(m => m.toUserId)
            .filter((id): id is mongoose.Types.ObjectId => id != null)
            .map(id => id.toString())
        )
      ]

      const recipientsById = new Map<
        string,
        { email?: string; name?: string }
      >()
      if (toUserIds.length > 0) {
        const users = await User.find({
          _id: {
            $in: toUserIds.map(id => new mongoose.Types.ObjectId(id))
          }
        })
          .select('email name')
          .lean()
        for (const u of users) {
          recipientsById.set(
            String((u as { _id: unknown })._id),
            u as {
              email?: string
              name?: string
            }
          )
        }
      }

      for (const mail of pending) {
        if (!mail.toUserId) continue
        const recipient = recipientsById.get(String(mail.toUserId))
        const toEmail =
          recipient && typeof recipient.email === 'string'
            ? recipient.email.trim()
            : ''
        const mailCode = typeof mail.code === 'string' ? mail.code.trim() : ''
        if (!toEmail || !mailCode) continue
        pickupEmailJobs.push({
          toEmail,
          recipientName:
            recipient && typeof recipient.name === 'string'
              ? recipient.name
              : undefined,
          mailCode
        })
      }
    }

    if (pickupEmailJobs.length > 0) {
      queueMailPickupReadyEmails(
        gate.activeStoreOid.toString(),
        pickupEmailJobs
      )
    }

    return NextResponse.json({
      updatedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      receivedInStoreAt: now.toISOString()
    })
  } catch (error) {
    console.error('Error bulk receive in store mails:', error)
    return NextResponse.json(
      { error: 'Error al marcar correos como recibidos en tienda' },
      { status: 500 }
    )
  }
}
