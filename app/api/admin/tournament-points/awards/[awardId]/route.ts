import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import {
  applyAwardRowCreditDeltas,
  applyDeductionsToRows,
  parseDeductionsInput,
  resolveUserIdsForAwardRows,
  rowsToSnapshot,
  staffDisplayName,
  writeTournamentPointsAuditLog,
  type ParsedAwardRow
} from '@/lib/tournament-points-admin'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ awardId: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { awardId } = await context.params
    if (!awardId?.trim() || !mongoose.Types.ObjectId.isValid(awardId.trim())) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}
    const rawDeductions = rec.deductions
    if (!Array.isArray(rawDeductions)) {
      return NextResponse.json(
        {
          error: 'Se requiere deductions (array con popId, subtract y reason)'
        },
        { status: 400 }
      )
    }

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const award = await TournamentPointsAward.findOne({
      _id: new mongoose.Types.ObjectId(awardId.trim()),
      storeId: gate.activeStoreOid
    })
    if (!award) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const beforeRows: ParsedAwardRow[] = (award.rows ?? []).map(
      (r: (typeof award.rows)[number]) => ({
        place: r.place,
        displayName: r.displayName,
        popId: r.popId,
        userId: r.userId,
        points: r.points
      })
    )

    const deductions = parseDeductionsInput(rawDeductions)
    const applied = applyDeductionsToRows(beforeRows, deductions)
    if (!applied.ok) {
      return NextResponse.json({ error: applied.error }, { status: 400 })
    }

    const { after: afterParsed, changes } = applied
    if (changes.length === 0) {
      return NextResponse.json(
        { ok: true, changed: false, message: 'Sin cambios' },
        { status: 200 }
      )
    }

    const popToUser = await resolveUserIdsForAwardRows(afterParsed)
    for (const row of afterParsed) {
      if (!row.userId) {
        const uid = popToUser.get(row.popId)
        if (uid) row.userId = uid
      }
    }

    const staffOid =
      gate.session.user?.id &&
      mongoose.Types.ObjectId.isValid(gate.session.user.id)
        ? new mongoose.Types.ObjectId(gate.session.user.id)
        : undefined
    const changedByName = await staffDisplayName(staffOid)

    const { adjustments, skippedNoUser } = await applyAwardRowCreditDeltas(
      beforeRows,
      afterParsed,
      popToUser,
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    )

    award.rows = rowsToSnapshot(afterParsed) as ITournamentPointsAward['rows']
    award.topCount = afterParsed.length
    award.markModified('rows')
    await award.save()

    await writeTournamentPointsAuditLog({
      storeId: gate.activeStoreOid,
      awardId: award._id as mongoose.Types.ObjectId,
      eventId: award.eventId as mongoose.Types.ObjectId,
      eventTitle: award.eventTitle,
      action: 'deducted',
      changedByUserId: staffOid,
      changedByName,
      changes
    })

    return NextResponse.json(
      {
        ok: true,
        changed: true,
        adjustments,
        skippedNoUser,
        pointsTotal: afterParsed.reduce((s, r) => s + r.points, 0),
        rowCount: afterParsed.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('PATCH /api/admin/tournament-points/awards/[awardId]:', error)
    return NextResponse.json(
      { error: 'Error al actualizar asignación' },
      { status: 500 }
    )
  }
}
