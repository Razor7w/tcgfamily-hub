import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { applyMailWithdrawnInStoreContributionAward } from '@/lib/contribution-points/mail-contribution-awards'
import { partitionMailsForWithdraw } from '@/lib/mail-status-transitions'
import { storeBranchNamesById } from '@/lib/store-branch'

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
      isRecivedInStore: true,
      'transfer.status': { $ne: 'in_transit' }
    }

    const pending = await Mails.find(withdrawFilter)
      .select('_id fromUserId toUserId storeId branchId')
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId
          fromUserId?: mongoose.Types.ObjectId
          toUserId?: mongoose.Types.ObjectId
          storeId?: mongoose.Types.ObjectId
          branchId?: mongoose.Types.ObjectId
        }>
      >()

    const branchNames = await storeBranchNamesById(
      pending.map(mail => mail.branchId)
    )
    const classified = pending.map(mail => ({
      mail,
      id: mail._id.toString(),
      branchName: branchNames.get(mail.branchId?.toString() ?? '') ?? ''
    }))
    const split = partitionMailsForWithdraw(gate.session.user.email, classified)
    const allowed = split.allowed.map(row => row.mail)
    const skippedCount = split.skipped.length
    const skippedMessage = split.skippedMessage

    if (allowed.length === 0) {
      return NextResponse.json({
        updatedCount: 0,
        matchedCount: 0,
        skippedCount,
        updatedIds: [],
        skippedMessage
      })
    }

    const allowedIds = allowed.map(mail => mail._id)
    const result = await Mails.updateMany(
      { ...withdrawFilter, _id: { $in: allowedIds } },
      { $set: { isRecived: true, statusUpdatedAt: new Date() } }
    )

    for (const mail of allowed) {
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
      matchedCount: result.matchedCount,
      skippedCount,
      updatedIds: allowedIds.map(id => id.toString()),
      skippedMessage
    })
  } catch (error) {
    console.error('Error bulk withdraw mails:', error)
    return NextResponse.json(
      { error: 'Error al marcar correos como retirados' },
      { status: 500 }
    )
  }
}
