import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import User from '@/models/User'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { queueMailPickupReadyEmails } from '@/lib/email/queue-mail-pickup-ready-emails'

type RouteContext = { params: Promise<{ id: string }> }

/** La sucursal de destino confirma que el paquete llegó. */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de mail inválido' },
        { status: 400 }
      )
    }

    await connectDB()
    const scoped = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>
    const mail = await Mails.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ...scoped
    })
    if (!mail) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    const transfer = mail.transfer as
      | {
          status?: string
          destinationBranchId?: mongoose.Types.ObjectId
        }
      | undefined

    if (!transfer || transfer.status !== 'in_transit') {
      return NextResponse.json(
        {
          error:
            'Este correo no está esperando recepción en otra sucursal. Primero márcalo como recibido en la sucursal de origen.'
        },
        { status: 409 }
      )
    }
    if (!transfer.destinationBranchId) {
      return NextResponse.json(
        { error: 'El correo no tiene sucursal de destino' },
        { status: 409 }
      )
    }

    const now = new Date()
    mail.set('branchId', transfer.destinationBranchId)
    mail.set('transfer.status', 'received')
    mail.set('transfer.receivedAtDestinationAt', now)
    mail.isRecivedInStore = true
    mail.isRecived = false
    mail.markModified('transfer')
    await mail.save()

    if (mail.toUserId) {
      const recipientDoc = await User.findById(mail.toUserId)
        .select('email name')
        .lean<{ email?: string; name?: string } | null>()
      const toEmail =
        typeof recipientDoc?.email === 'string' ? recipientDoc.email.trim() : ''
      const mailCode = typeof mail.code === 'string' ? mail.code.trim() : ''
      if (toEmail && mailCode) {
        queueMailPickupReadyEmails(gate.activeStoreOid.toString(), [
          {
            toEmail,
            recipientName:
              typeof recipientDoc?.name === 'string'
                ? recipientDoc.name
                : undefined,
            mailCode
          }
        ])
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('POST /api/mail/[id]/receive-transfer:', error)
    return NextResponse.json(
      { error: 'No se pudo recepcionar el correo' },
      { status: 500 }
    )
  }
}
