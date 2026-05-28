import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { sendMailPickupReadyEmail } from '@/lib/email/send-mail-pickup-ready'
import { getResendNotifyPickupInStoreEnabledForStore } from '@/lib/get-resend-notify-pickup-enabled'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import User from '@/models/User'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'

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

    const pending = await Mails.find(filter).select('_id toUserId code').lean<
      Array<{
        _id: mongoose.Types.ObjectId
        toUserId?: unknown
        code?: string
      }>
    >()

    const now = new Date()
    const result = await Mails.updateMany(filter, {
      $set: { isRecivedInStore: true, receivedInStoreAt: now }
    })

    if (pending.length > 0) {
      try {
        const notifyEnabled = await getResendNotifyPickupInStoreEnabledForStore(
          gate.activeStoreOid.toString()
        )
        if (notifyEnabled) {
          for (const mail of pending) {
            if (!mail.toUserId) continue
            const recipientDoc = await User.findById(mail.toUserId)
              .select('email name')
              .lean()
            const recipient = recipientDoc as {
              email?: string
              name?: string
            } | null
            const toEmail =
              recipient && typeof recipient.email === 'string'
                ? recipient.email.trim()
                : ''
            if (!toEmail) continue
            const mailCode =
              typeof mail.code === 'string' ? mail.code.trim() : ''
            if (!mailCode) continue
            try {
              await sendMailPickupReadyEmail({
                to: toEmail,
                recipientName:
                  recipient && typeof recipient.name === 'string'
                    ? recipient.name
                    : undefined,
                mailCode
              })
            } catch (emailErr) {
              console.error(
                '[api/mail/bulk-receive-in-store] Aviso por email no enviado:',
                emailErr
              )
            }
          }
        }
      } catch (notifyErr) {
        console.error(
          '[api/mail/bulk-receive-in-store] Error al enviar avisos:',
          notifyErr
        )
      }
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
