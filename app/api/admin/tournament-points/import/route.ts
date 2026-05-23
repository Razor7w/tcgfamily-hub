import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'
import {
  applyAwardRowCreditDeltas,
  diffAwardRows,
  resolveUserIdsForAwardRows,
  rowsToSnapshot,
  staffDisplayName,
  writeTournamentPointsAuditLog,
  type ParsedAwardRow
} from '@/lib/tournament-points-admin'
import {
  groupKeyForCsvRow,
  mergeImportCsvRowsByPopId,
  parseTournamentPointsCsv,
  type TournamentPointsCsvRow
} from '@/lib/tournament-points-csv'
import { normalizeLegacyTournamentLabel } from '@/lib/tournament-points-legacy-label'
import TournamentPointsAward from '@/models/TournamentPointsAward'
import type { IWeeklyEvent } from '@/models/WeeklyEvent'

export const runtime = 'nodejs'

const MAX_GROUPS_PER_IMPORT = 40
const MAX_ROWS_PER_EVENT = 64
const MAX_RAW_ROWS_PER_GROUP = 500

type ResolvedImportGroup =
  | {
      kind: 'event'
      doc: IWeeklyEvent
      displayTitle: string
    }
  | {
      kind: 'csv'
      importGroupKey: string
      displayTitle: string
      awardedAt: Date
    }

async function resolveImportGroup(
  gate: {
    activeStoreOid: mongoose.Types.ObjectId
  },
  groupKey: string,
  sample: TournamentPointsCsvRow,
  importPerformedAt: Date
): Promise<ResolvedImportGroup | { error: string }> {
  if (sample.eventId) {
    const doc = await weeklyOfficialByIdForStaffGate(
      gate,
      sample.eventId.trim()
    )
    if (!doc) {
      return { error: `Torneo no encontrado o sin acceso: ${sample.eventId}` }
    }
    return {
      kind: 'event',
      doc,
      displayTitle: String(doc.title ?? '').slice(0, 300)
    }
  }

  const awardedAt =
    sample.eventDate && !Number.isNaN(sample.eventDate.getTime())
      ? sample.eventDate
      : importPerformedAt

  return {
    kind: 'csv',
    importGroupKey: groupKey,
    displayTitle: normalizeLegacyTournamentLabel(sample.tournamentKey),
    awardedAt
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos .csv' },
        { status: 400 }
      )
    }

    const applyBalance =
      form.get('applyBalance') === '1' || form.get('applyBalance') === 'true'

    const {
      rows,
      errors: parseErrors,
      usesEventId
    } = parseTournamentPointsCsv(await file.text())
    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: parseErrors[0] ?? 'No hay filas válidas en el CSV',
          errors: parseErrors
        },
        { status: 400 }
      )
    }

    const byGroup = new Map<string, TournamentPointsCsvRow[]>()
    for (const row of rows) {
      const key = groupKeyForCsvRow(row)
      const list = byGroup.get(key) ?? []
      if (list.length >= MAX_RAW_ROWS_PER_GROUP) continue
      list.push(row)
      byGroup.set(key, list)
    }

    if (byGroup.size > MAX_GROUPS_PER_IMPORT) {
      return NextResponse.json(
        {
          error: `Máximo ${MAX_GROUPS_PER_IMPORT} torneos distintos por archivo`
        },
        { status: 400 }
      )
    }

    const importPerformedAt = new Date()

    const staffOid =
      gate.session.user?.id &&
      mongoose.Types.ObjectId.isValid(gate.session.user.id)
        ? new mongoose.Types.ObjectId(gate.session.user.id)
        : undefined
    const changedByName = await staffDisplayName(staffOid)

    let eventsCreated = 0
    let eventsSkipped = 0
    let rowsImported = 0
    let credited = 0
    let skippedNoUser = 0
    const errors = [...parseErrors]

    for (const [groupKey, rawEventRows] of byGroup) {
      const { merged: eventRows, combinedPopRows } =
        mergeImportCsvRowsByPopId(rawEventRows)
      if (combinedPopRows > 0) {
        errors.push(
          `${combinedPopRows} fila(s) con POP repetido en el mismo torneo: puntos sumados por jugador`
        )
      }
      if (eventRows.length === 0) continue
      if (eventRows.length > MAX_ROWS_PER_EVENT) {
        errors.push(
          `Tras fusionar POP, un torneo supera ${MAX_ROWS_PER_EVENT} jugadores`
        )
        eventsSkipped++
        continue
      }

      const sample = eventRows[0]!
      const resolved = await resolveImportGroup(
        gate,
        groupKey,
        sample,
        importPerformedAt
      )
      if ('error' in resolved) {
        errors.push(resolved.error)
        eventsSkipped++
        continue
      }

      const { displayTitle } = resolved

      const existing =
        resolved.kind === 'event'
          ? await TournamentPointsAward.findOne({
              storeId: gate.activeStoreOid,
              eventId: resolved.doc._id
            })
          : await TournamentPointsAward.findOne({
              storeId: gate.activeStoreOid,
              importGroupKey: resolved.importGroupKey
            })

      if (existing) {
        errors.push(
          `«${displayTitle}» ya tiene puntos asignados (omite o edita en gestión)`
        )
        eventsSkipped++
        continue
      }

      const parsed: ParsedAwardRow[] = eventRows
        .sort((a, b) => a.place - b.place)
        .map(r => ({
          place: r.place,
          displayName: r.displayName,
          popId: r.popId,
          points: r.points
        }))

      const popToUser = await resolveUserIdsForAwardRows(parsed)
      for (const row of parsed) {
        const uid = popToUser.get(row.popId)
        if (uid) row.userId = uid
      }

      if (applyBalance) {
        const result = await applyAwardRowCreditDeltas(
          [],
          parsed,
          popToUser,
          gate.activeStoreOid,
          gate.primaryStoreOid ?? null
        )
        credited += result.adjustments
        skippedNoUser += result.skippedNoUser
      }

      const playerCount =
        resolved.kind === 'event'
          ? Math.max(resolved.doc.participants?.length ?? 0, parsed.length)
          : parsed.length

      const award = await TournamentPointsAward.create({
        storeId: gate.activeStoreOid,
        ...(resolved.kind === 'event'
          ? { eventId: resolved.doc._id }
          : {
              importGroupKey: resolved.importGroupKey,
              awardedAt: resolved.awardedAt
            }),
        eventTitle: displayTitle,
        playerCount,
        topCount: parsed.length,
        rows: rowsToSnapshot(parsed),
        createdByUserId: staffOid
      })

      const changes = diffAwardRows([], parsed).map(c => ({
        ...c,
        reason: usesEventId ? 'Importación CSV' : 'Importación CSV (histórico)'
      }))

      await writeTournamentPointsAuditLog({
        storeId: gate.activeStoreOid,
        awardId: award._id as mongoose.Types.ObjectId,
        eventId:
          resolved.kind === 'event'
            ? (resolved.doc._id as mongoose.Types.ObjectId)
            : undefined,
        eventTitle: displayTitle,
        action: 'created',
        changedByUserId: staffOid,
        changedByName,
        changes
      })

      eventsCreated++
      rowsImported += parsed.length
    }

    return NextResponse.json({
      ok: true,
      eventsCreated,
      eventsSkipped,
      rowsImported,
      applyBalance,
      usesEventId,
      credited: applyBalance ? credited : 0,
      skippedNoUser: applyBalance ? skippedNoUser : 0,
      errors
    })
  } catch (error) {
    console.error('POST /api/admin/tournament-points/import:', error)
    return NextResponse.json(
      { error: 'Error al importar el archivo' },
      { status: 500 }
    )
  }
}
