import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { listActiveBranchesForStore } from '@/lib/store-branch'

export const runtime = 'nodejs'

/**
 * GET /api/mail/branches?storeId=
 * Sucursales activas de una tienda (registro autenticado o invitado).
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId')?.trim() ?? ''
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ error: 'storeId inválido' }, { status: 400 })
    }

    await connectDB()
    const oid = new mongoose.Types.ObjectId(storeId)
    const store = await Store.exists({ _id: oid, isActive: true })
    if (!store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada o inactiva' },
        { status: 404 }
      )
    }

    const branches = await listActiveBranchesForStore(oid)
    return NextResponse.json({
      storeId,
      /** Si true, el registro debe enviar `branchId`. */
      required: branches.length > 0,
      branches
    })
  } catch (e) {
    console.error('GET /api/mail/branches:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las sucursales' },
      { status: 500 }
    )
  }
}
