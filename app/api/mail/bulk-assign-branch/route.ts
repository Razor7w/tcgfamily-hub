import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { resolveAssignableBranchId } from '@/lib/store-branch'

const MAX_BULK_ASSIGN = 2000

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

/**
 * POST — Asigna (o quita) sucursal a varios correos.
 * Solo actualiza correos que no estén retirados (`isRecived: false`).
 */
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
    if (mailIds.length > MAX_BULK_ASSIGN) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BULK_ASSIGN} correos por operación` },
        { status: 400 }
      )
    }

    if (!('branchId' in (body ?? {}))) {
      return NextResponse.json(
        { error: 'branchId es requerido (usa null o "" para quitar)' },
        { status: 400 }
      )
    }

    const branchGate = await resolveAssignableBranchId({
      storeOid: gate.activeStoreOid,
      branchIdRaw: body.branchId
    })
    if (!branchGate.ok) {
      return NextResponse.json(
        { error: branchGate.error },
        { status: branchGate.status }
      )
    }

    await connectDB()
    const scoped = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>

    const filter = {
      _id: { $in: mailIds },
      isRecived: false,
      ...scoped
    }

    const update =
      branchGate.branchOid != null
        ? { $set: { branchId: branchGate.branchOid } }
        : { $unset: { branchId: 1 } }

    const result = await Mails.updateMany(filter, update)

    return NextResponse.json({
      matchedCount: result.matchedCount,
      updatedCount: result.modifiedCount,
      branchId: branchGate.branchOid?.toString() ?? null
    })
  } catch (e) {
    console.error('POST /api/mail/bulk-assign-branch:', e)
    return NextResponse.json(
      { error: 'No se pudo asignar la sucursal' },
      { status: 500 }
    )
  }
}
