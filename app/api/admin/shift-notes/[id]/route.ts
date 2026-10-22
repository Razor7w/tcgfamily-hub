import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireTcgfamilyStaffSession } from '@/lib/shift-note-access'
import ShiftNote from '@/models/ShiftNote'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const gate = await requireTcgfamilyStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Nota inválida' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }
    const resolved = (body as { resolved?: unknown } | null)?.resolved
    if (typeof resolved !== 'boolean') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    await connectDB()
    const userOid = new mongoose.Types.ObjectId(gate.session.user.id)
    const updated = await ShiftNote.findOneAndUpdate(
      { _id: id, storeId: gate.activeStoreOid },
      resolved
        ? {
            status: 'done',
            resolvedAt: new Date(),
            resolvedBy: userOid
          }
        : {
            status: 'open',
            resolvedAt: null,
            resolvedBy: null
          },
      { new: true }
    ).select('_id')

    if (!updated) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/admin/shift-notes/[id]:', error)
    return NextResponse.json(
      { error: 'No se pudo actualizar la nota' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const gate = await requireTcgfamilyStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Nota inválida' }, { status: 400 })
    }

    await connectDB()
    const deleted = await ShiftNote.findOneAndDelete({
      _id: id,
      storeId: gate.activeStoreOid
    }).select('_id')

    if (!deleted) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/admin/shift-notes/[id]:', error)
    return NextResponse.json(
      { error: 'No se pudo eliminar la nota' },
      { status: 500 }
    )
  }
}
