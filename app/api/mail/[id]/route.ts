import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requireAdminSession } from '@/lib/api-auth'
import { sendMailPickupReadyEmail } from '@/lib/email/send-mail-pickup-ready'
import { getResendNotifyPickupInStoreEnabled } from '@/lib/get-resend-notify-pickup-enabled'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import User from '@/models/User'
import mongoose from 'mongoose'

function parseMailId(id: string) {
  try {
    return new mongoose.Types.ObjectId(id)
  } catch {
    return null
  }
}

async function getMailOr404(mailId: mongoose.Types.ObjectId) {
  const mail = await Mails.findById(mailId)
    .populate('fromUserId', 'name rut')
    .populate('toUserId', 'name rut')
    .lean()
  if (!mail || Array.isArray(mail)) return null
  return mail
}

/** ObjectId string desde ref poblada `{ _id }` o id suelto. */
function refUserIdString(ref: unknown): string | null {
  if (ref == null) return null
  if (typeof ref === 'object' && '_id' in ref) {
    const id = (ref as { _id: unknown })._id
    return id != null ? String(id) : null
  }
  return String(ref)
}

// GET - Obtener un mail por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()
    const mailId = parseMailId(id)
    if (!mailId) {
      return NextResponse.json(
        { error: 'ID de mail inválido' },
        { status: 400 }
      )
    }

    const mail = await getMailOr404(mailId)
    if (!mail) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin'
    if (!isAdmin) {
      const sessionUserId = session.user.id as string | undefined
      if (!sessionUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      const fromId = refUserIdString(mail.fromUserId)
      const toId = refUserIdString(mail.toUserId)
      const isSender = fromId === sessionUserId
      const isRecipient = toId != null && toId === sessionUserId
      if (!isSender && !isRecipient) {
        return NextResponse.json(
          { error: 'Mail no encontrado' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({ mail }, { status: 200 })
  } catch (error) {
    console.error('Error al obtener mail:', error)
    return NextResponse.json(
      { error: 'Error al obtener mail' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un mail por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const { id } = await params
    await connectDB()
    const mailId = parseMailId(id)
    if (!mailId) {
      return NextResponse.json(
        { error: 'ID de mail inválido' },
        { status: 400 }
      )
    }

    const existing = await Mails.findById(mailId)
    if (!existing) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { fromUserId, toUserId, isRecived, isRecivedInStore, observations } =
      body

    const nextFrom = fromUserId ?? existing.fromUserId?.toString()
    const nextTo = toUserId ?? existing.toUserId?.toString()
    if (nextFrom && nextTo && nextFrom === nextTo) {
      return NextResponse.json(
        { error: 'No puedes enviar un correo a ti mismo' },
        { status: 400 }
      )
    }

    if (fromUserId != null) {
      const fromUser = await User.findById(fromUserId)
      if (!fromUser) {
        return NextResponse.json(
          { error: `El usuario con ID ${fromUserId} no existe` },
          { status: 404 }
        )
      }
      existing.fromUserId = fromUserId as mongoose.Types.ObjectId
    }
    if (toUserId != null) {
      const toUser = await User.findById(toUserId)
      if (!toUser) {
        return NextResponse.json(
          { error: `El usuario con ID ${toUserId} no existe` },
          { status: 404 }
        )
      }
      existing.toUserId = toUserId as mongoose.Types.ObjectId
    }

    const wasReceivedInStore = existing.isRecivedInStore

    if (typeof isRecived === 'boolean') existing.isRecived = isRecived
    if (typeof isRecivedInStore === 'boolean')
      existing.isRecivedInStore = isRecivedInStore
    if (observations !== undefined) existing.observations = observations ?? ''

    const becameReadyInStore =
      typeof isRecivedInStore === 'boolean' &&
      isRecivedInStore === true &&
      !wasReceivedInStore

    await existing.save()

    if (becameReadyInStore && existing.toUserId) {
      const recipientDoc = await User.findById(existing.toUserId)
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
      if (toEmail) {
        try {
          const notifyEnabled = await getResendNotifyPickupInStoreEnabled()
          if (notifyEnabled) {
            await sendMailPickupReadyEmail({
              to: toEmail,
              recipientName:
                recipient && typeof recipient.name === 'string'
                  ? recipient.name
                  : undefined,
              mailCode: existing.code
            })
          } else {
            console.info(
              '[api/mail] Aviso Resend desactivado en configuración (recepción en tienda).'
            )
          }
        } catch (emailErr) {
          console.error(
            '[api/mail] Aviso por email de retiro en tienda no enviado:',
            emailErr
          )
        }
      }
    }

    const mail = await getMailOr404(mailId)
    return NextResponse.json({ mail }, { status: 200 })
  } catch (error) {
    console.error('Error al actualizar mail:', error)
    return NextResponse.json(
      { error: 'Error al actualizar mail' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un mail por ID
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()
    const mailId = parseMailId(id)
    if (!mailId) {
      return NextResponse.json(
        { error: 'ID de mail inválido' },
        { status: 400 }
      )
    }

    const existing = await Mails.findById(mailId)
    if (!existing) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin'
    if (!isAdmin) {
      const sessionUserId = session.user.id as string | undefined
      if (!sessionUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      if (existing.isRecivedInStore) {
        return NextResponse.json(
          { error: 'No se puede borrar: ya fue recibido en tienda' },
          { status: 400 }
        )
      }
      if (existing.fromUserId?.toString() !== sessionUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    await existing.deleteOne()

    return NextResponse.json(
      { message: 'Mail eliminado correctamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al eliminar mail:', error)
    return NextResponse.json(
      { error: 'Error al eliminar mail' },
      { status: 500 }
    )
  }
}
