import { NextRequest, NextResponse } from 'next/server'
import {
  requireSessionUserWithActiveStore,
  requireStoreStaffSession
} from '@/lib/api-auth'
import { queueMailPickupReadyEmails } from '@/lib/email/queue-mail-pickup-ready-emails'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import User from '@/models/User'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import { applyMailStatusContributionAwards } from '@/lib/contribution-points/mail-contribution-awards'
import {
  resolveMailStatusAfterUpdate,
  validateMailStatusTransition
} from '@/lib/mail-status-transitions'
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
    const sg = await requireSessionUserWithActiveStore()
    if (!sg.ok) return sg.response
    const session = sg.session

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

    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const scopedMatch = mongoFilterByStore(
      sg.activeStoreOid,
      primary
    ) as Record<string, unknown>
    const inStore = await Mails.exists({ _id: mailId, ...scopedMatch })
    if (!inStore) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    const isStaff =
      session.user.storeRole === 'owner' ||
      session.user.storeRole === 'store_admin'

    if (!isStaff) {
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
    const gate = await requireStoreStaffSession()
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

    const scoped = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>
    const existing = await Mails.findOne({ _id: mailId, ...scoped })
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
    const wasWithdrawn = existing.isRecived

    const nextStatus = resolveMailStatusAfterUpdate({
      isRecived: typeof isRecived === 'boolean' ? isRecived : undefined,
      isRecivedInStore:
        typeof isRecivedInStore === 'boolean' ? isRecivedInStore : undefined,
      currentIsRecived: existing.isRecived,
      currentIsRecivedInStore: existing.isRecivedInStore
    })

    const validationError = validateMailStatusTransition({
      nextIsRecived: nextStatus.isRecived,
      nextIsRecivedInStore: nextStatus.isRecivedInStore
    })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    existing.isRecived = nextStatus.isRecived
    existing.isRecivedInStore = nextStatus.isRecivedInStore
    if (nextStatus.isRecivedInStore && !wasReceivedInStore) {
      existing.receivedInStoreAt = new Date()
    } else if (!nextStatus.isRecivedInStore && wasReceivedInStore) {
      existing.receivedInStoreAt = null
    }
    if (observations !== undefined) existing.observations = observations ?? ''

    const becameReadyInStore =
      nextStatus.isRecivedInStore && !wasReceivedInStore
    const becameWithdrawn = nextStatus.isRecived && !wasWithdrawn

    await existing.save()

    const storeIdForPoints = existing.storeId ?? gate.activeStoreOid

    if (becameReadyInStore || becameWithdrawn) {
      await applyMailStatusContributionAwards({
        storeId: storeIdForPoints,
        mailId: existing._id,
        fromUserId: existing.fromUserId,
        toUserId: existing.toUserId,
        receivedInStore: becameReadyInStore,
        withdrawn: becameWithdrawn
      })
    }

    const pickupEmailJobs: {
      toEmail: string
      recipientName?: string
      mailCode: string
    }[] = []

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
      const mailCode =
        typeof existing.code === 'string' ? existing.code.trim() : ''
      if (toEmail && mailCode) {
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

    const mail = await getMailOr404(mailId)

    if (pickupEmailJobs.length > 0) {
      queueMailPickupReadyEmails(
        gate.activeStoreOid.toString(),
        pickupEmailJobs
      )
    }

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
    const sg = await requireSessionUserWithActiveStore()
    if (!sg.ok) return sg.response
    const session = sg.session

    const { id } = await params
    await connectDB()
    const mailId = parseMailId(id)
    if (!mailId) {
      return NextResponse.json(
        { error: 'ID de mail inválido' },
        { status: 400 }
      )
    }

    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const scoped = mongoFilterByStore(sg.activeStoreOid, primary) as Record<
      string,
      unknown
    >

    const existing = await Mails.findOne({ _id: mailId, ...scoped })
    if (!existing) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    const isStaff =
      session.user.storeRole === 'owner' ||
      session.user.storeRole === 'store_admin'
    if (!isStaff) {
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
