import { NextRequest, NextResponse } from 'next/server'
import type { AnyBulkWriteOperation } from 'mongoose'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import {
  canonicalRut,
  mapHeaderRow,
  normalizeEmail,
  parseCsvSemicolonLine,
  rowToPointsData,
  rutMatchVariants,
  type PointsCsvRow
} from '@/lib/store-points-csv'

function lookupRutId(
  rutToId: Map<string, mongoose.Types.ObjectId>,
  canon: string
): mongoose.Types.ObjectId | undefined {
  for (const v of rutMatchVariants(canon)) {
    const id = rutToId.get(v)
    if (id) return id
  }
  return undefined
}

export const runtime = 'nodejs'

const BULK_CHUNK = 500

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos .csv' },
        { status: 400 }
      )
    }

    const text = (await file.text()).replace(/^\uFEFF/, '')
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'El CSV no tiene filas de datos' },
        { status: 400 }
      )
    }

    const headerCells = parseCsvSemicolonLine(lines[0]!)
    const headerMap = mapHeaderRow(headerCells)
    if (!headerMap) {
      return NextResponse.json(
        {
          error:
            'Encabezados no reconocidos. Se espera el formato del reporte de puntos (RUT, Saldo, próximos a vencer, fecha, etc.).'
        },
        { status: 400 }
      )
    }

    await connectDB()

    const users = await User.find({
      $or: [
        { email: { $exists: true, $nin: ['', null] } },
        { rut: { $exists: true, $nin: ['', null, ''] } }
      ]
    })
      .select('_id rut email')
      .lean()

    const emailToId = new Map<string, mongoose.Types.ObjectId>()
    const rutToId = new Map<string, mongoose.Types.ObjectId>()

    for (const u of users) {
      const id = (u as { _id: mongoose.Types.ObjectId })._id
      const em = normalizeEmail(String((u as { email?: string }).email ?? ''))
      if (em && !emailToId.has(em)) {
        emailToId.set(em, id)
      }
      const r = canonicalRut(String((u as { rut?: string }).rut ?? ''))
      if (r) {
        for (const v of rutMatchVariants(r)) {
          if (!rutToId.has(v)) {
            rutToId.set(v, id)
          }
        }
      }
    }

    /** Una fila pendiente por usuario (_id); gana la última fila del CSV. */
    const pending = new Map<string, { id: mongoose.Types.ObjectId; row: PointsCsvRow }>()
    let skipped = 0
    let noIdentifierInCsv = 0
    let noUserMatch = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!
      const cells = parseCsvSemicolonLine(line)
      const row = rowToPointsData(cells, headerMap)
      if (!row) {
        skipped++
        continue
      }

      if (!row.email && !row.rut) {
        noIdentifierInCsv++
        continue
      }

      let id: mongoose.Types.ObjectId | undefined
      if (row.rut) {
        id = lookupRutId(rutToId, row.rut)
      }
      if (!id && row.email) {
        id = emailToId.get(row.email)
      }

      if (!id) {
        noUserMatch++
        continue
      }

      pending.set(id.toString(), { id, row })
    }

    const ops: AnyBulkWriteOperation[] = []
    for (const { id, row } of pending.values()) {
      const update: {
        $set: Record<string, unknown>
        $unset?: Record<string, ''>
      } = {
        $set: {
          storePoints: row.saldo,
          storePointsExpiringNext: row.proximosVencer
        }
      }
      if (row.expiry) {
        update.$set.storePointsExpiryDate = row.expiry
      } else {
        update.$unset = { storePointsExpiryDate: '' }
      }

      ops.push({
        updateOne: {
          filter: { _id: id },
          update
        }
      })
    }

    let matched = 0
    let modified = 0
    const errors: string[] = []

    for (let i = 0; i < ops.length; i += BULK_CHUNK) {
      const chunk = ops.slice(i, i + BULK_CHUNK)
      try {
        const res = await User.bulkWrite(chunk, { ordered: false })
        matched += res.matchedCount
        modified += res.modifiedCount
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Lote ${i / BULK_CHUNK + 1}: ${msg}`)
        if (errors.length >= 20) break
      }
    }

    return NextResponse.json({
      ok: true,
      /** Filas resueltas a un usuario (correo y/o RUT del CSV coincide con la base). */
      updated: matched,
      modified,
      skipped,
      /** Filas sin correo ni RUT válido en el CSV. */
      noIdentifierInCsv,
      /** Ni el correo ni el RUT del CSV coincidieron con ningún usuario. */
      noUserMatch,
      errors
    })
  } catch (error) {
    console.error('import-store-points:', error)
    return NextResponse.json(
      { error: 'Error al procesar el archivo' },
      { status: 500 }
    )
  }
}
