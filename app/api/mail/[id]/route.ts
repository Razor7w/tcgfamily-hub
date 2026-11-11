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
import { normalizeMailContactPhone } from '@/lib/mail-contact-phone'
import { resolveAssignableBranchId } from '@/lib/store-branch'
import { findUserByRut, formatMailRut } from '@/lib/mail-create'
import { clean as cleanRut, validate as validateRut } from 'rut.js'
import StoreBranch from '@/models/StoreBranch'

void StoreBranch

function rutsAreTheSamePerson(a: string, b: string) {
  if (!a.trim() || !b.trim()) return false
  try {
    if (!validateRut(a) || !validateRut(b)) return false
    return cleanRut(a) === cleanRut(b)
  } catch {
    return false
  }
}

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
    .populate('branchId', 'name address isActive')
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
    const {
      fromUserId,
      toUserId,
      fromRut,
      toRut,
      isRecived,
      isRecivedInStore,
      observations,
      contactPhone,
      branchId: rawBranchId
    } = body

    const fromRutRaw = typeof fromRut === 'string' ? fromRut.trim() : ''
    const toRutRaw = typeof toRut === 'string' ? toRut.trim() : ''
    const patchFromByRut = fromRutRaw.length > 0
    const patchToByRut = toRutRaw.length > 0

    let nextFromId = existing.fromUserId?.toString() ?? ''
    let nextToId = existing.toUserId?.toString() ?? ''
    let nextFromRut =
      typeof existing.fromRut === 'string' ? existing.fromRut.trim() : ''
    let nextToRut =
      typeof existing.toRut === 'string' ? existing.toRut.trim() : ''

    if (patchFromByRut) {
      if (!validateRut(fromRutRaw)) {
        return NextResponse.json(
          { error: 'RUT del remitente inválido' },
          { status: 400 }
        )
      }
      const fromUser = await findUserByRut(fromRutRaw)
      nextFromRut = formatMailRut(fromRutRaw)
      nextFromId = fromUser ? String(fromUser._id) : ''
    } else if (fromUserId != null) {
      const fromUser = await User.findById(fromUserId)
      if (!fromUser) {
        return NextResponse.json(
          { error: `El usuario con ID ${fromUserId} no existe` },
          { status: 404 }
        )
      }
      nextFromId = String(fromUserId)
    }

    if (patchToByRut) {
      if (!validateRut(toRutRaw)) {
        return NextResponse.json(
          { error: 'RUT del destinatario inválido' },
          { status: 400 }
        )
      }
      const toUser = await findUserByRut(toRutRaw)
      nextToRut = formatMailRut(toRutRaw)
      nextToId = toUser ? String(toUser._id) : ''
    } else if (toUserId != null) {
      const toUser = await User.findById(toUserId)
      if (!toUser) {
        return NextResponse.json(
          { error: `El usuario con ID ${toUserId} no existe` },
          { status: 404 }
        )
      }
      nextToId = String(toUserId)
      if (typeof toUser.rut === 'string' && toUser.rut.trim()) {
        nextToRut = toUser.rut.trim()
      }
    }

    const sameUser =
      nextFromId.length > 0 && nextToId.length > 0 && nextFromId === nextToId
    const sameRut = rutsAreTheSamePerson(nextFromRut, nextToRut)
    if (sameUser || sameRut) {
      return NextResponse.json(
        { error: 'No puedes enviar un correo a ti mismo' },
        { status: 400 }
      )
    }

    if (patchFromByRut) {
      existing.fromRut = nextFromRut
      if (nextFromId) {
        existing.set('fromUserId', new mongoose.Types.ObjectId(nextFromId))
      } else {
        existing.set('fromUserId', undefined)
        existing.markModified('fromUserId')
      }
    } else if (fromUserId != null) {
      existing.set(
        'fromUserId',
        new mongoose.Types.ObjectId(String(fromUserId))
      )
    }

    if (patchToByRut) {
      existing.toRut = nextToRut
      if (nextToId) {
        existing.set('toUserId', new mongoose.Types.ObjectId(nextToId))
      } else {
        existing.set('toUserId', undefined)
        existing.markModified('toUserId')
      }
    } else if (toUserId != null) {
      existing.set('toUserId', new mongoose.Types.ObjectId(String(toUserId)))
      if (nextToRut) existing.toRut = nextToRut
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

    const transfer = existing.transfer as
      | { status?: string; destinationBranchId?: mongoose.Types.ObjectId }
      | undefined
    if (
      transfer?.status === 'in_transit' &&
      (typeof isRecived === 'boolean' || typeof isRecivedInStore === 'boolean')
    ) {
      return NextResponse.json(
        {
          error:
            'Este correo está en tránsito entre sucursales. Recepcionalo en la sucursal de destino.'
        },
        { status: 409 }
      )
    }
    if (
      (transfer?.status === 'requested' || transfer?.status === 'in_transit') &&
      nextStatus.isRecived
    ) {
      return NextResponse.json(
        {
          error:
            'No puedes marcarlo como retirado hasta que la sucursal de destino lo recepcione.'
        },
        { status: 409 }
      )
    }

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
      if (transfer?.status === 'requested') {
        existing.transfer!.status = 'in_transit'
        existing.markModified('transfer')
      }
    } else if (!nextStatus.isRecivedInStore && wasReceivedInStore) {
      existing.receivedInStoreAt = null
    }
    if (observations !== undefined) existing.observations = observations ?? ''
    if (contactPhone !== undefined) {
      existing.contactPhone = normalizeMailContactPhone(contactPhone)
    }

    if (rawBranchId !== undefined) {
      if (existing.isRecived) {
        return NextResponse.json(
          {
            error: 'No se puede cambiar la sucursal de un correo ya retirado'
          },
          { status: 409 }
        )
      }
      const storeOidForBranch =
        (existing.storeId as mongoose.Types.ObjectId | undefined) ??
        gate.activeStoreOid
      const branchGate = await resolveAssignableBranchId({
        storeOid: storeOidForBranch,
        branchIdRaw: rawBranchId
      })
      if (!branchGate.ok) {
        return NextResponse.json(
          { error: branchGate.error },
          { status: branchGate.status }
        )
      }
      if (branchGate.branchOid) {
        existing.set('branchId', branchGate.branchOid)
      } else {
        existing.set('branchId', undefined)
        existing.markModified('branchId')
      }
    }

    const startedBranchTransit =
      transfer?.status === 'requested' &&
      nextStatus.isRecivedInStore &&
      !wasReceivedInStore
    const becameReadyInStore =
      nextStatus.isRecivedInStore &&
      !wasReceivedInStore &&
      !startedBranchTransit
    const becameWithdrawn = nextStatus.isRecived && !wasWithdrawn

    await existing.save()

    const storeIdForPoints = existing.storeId ?? gate.activeStoreOid

    const fromIdForPoints = existing.fromUserId?.toString()
    if (
      fromIdForPoints &&
      (becameReadyInStore || startedBranchTransit || becameWithdrawn)
    ) {
      await applyMailStatusContributionAwards({
        storeId: storeIdForPoints.toString(),
        mailId: existing._id.toString(),
        fromUserId: fromIdForPoints,
        toUserId: existing.toUserId?.toString(),
        receivedInStore: becameReadyInStore || Boolean(startedBranchTransit),
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
