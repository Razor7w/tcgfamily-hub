import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { applyStoreCreditSlice } from '@/lib/store-credit-slice-write'
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

const WRITE_CHUNK = 80

export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

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
    const pending = new Map<
      string,
      { id: mongoose.Types.ObjectId; row: PointsCsvRow }
    >()
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

    const entries = [...pending.values()]
    const storeOid = gate.activeStoreOid
    let updated = 0
    const errors: string[] = []

    for (let i = 0; i < entries.length; i += WRITE_CHUNK) {
      const chunk = entries.slice(i, i + WRITE_CHUNK)
      try {
        await Promise.all(
          chunk.map(({ id, row }) =>
            applyStoreCreditSlice(id, storeOid, {
              saldo: row.saldo,
              proximosVencer: row.proximosVencer,
              expiry: row.expiry ?? null
            })
          )
        )
        updated += chunk.length
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Lote ${i / WRITE_CHUNK + 1}: ${msg}`)
        if (errors.length >= 20) break
      }
    }

    return NextResponse.json({
      ok: true,
      storeId: storeOid.toString(),
      /** Filas resueltas a un usuario (correo y/o RUT del CSV coincide con la base). */
      updated,
      modified: updated,
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
