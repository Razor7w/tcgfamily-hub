import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import {
  assertCanManageStoreMutation,
  canAssignOwnerMembership,
  canAssignStoreAdminOnStore
} from '@/lib/store-admin-access'
import connectDB from '@/lib/mongodb'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import { normalizeEmail } from '@/lib/password-rules'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { storeId } = await params
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ error: 'storeId inválido' }, { status: 400 })
    }
    const oid = new mongoose.Types.ObjectId(storeId)
    const uid = gate.session.user!.id

    const can = await assertCanManageStoreMutation(uid, oid)
    if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    await connectDB()
    const m = await StoreMembership.find({ storeId: oid })
      .sort({ role: 1 })
      .lean()

    const uids = m.map(row => row.userId)
    const users = await User.find({ _id: { $in: uids } })
      .select('email name')
      .lean()
    const byId = new Map(
      users.map(u => [(u._id as mongoose.Types.ObjectId).toString(), u])
    )

    return NextResponse.json({
      memberships: m.map(row => {
        const k = row.userId.toString()
        const u = byId.get(k)
        return {
          userId: k,
          role: row.role,
          email: u?.email ?? '',
          name: u?.name ?? ''
        }
      })
    })
  } catch (e) {
    console.error('GET memberships:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las membresías' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { storeId } = await params
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ error: 'storeId inválido' }, { status: 400 })
    }
    const oid = new mongoose.Types.ObjectId(storeId)
    const body = await request.json()
    const role =
      body?.role === 'owner' || body?.role === 'store_admin' ? body.role : null
    let targetUserOid: mongoose.Types.ObjectId | null = null
    const userIdRaw =
      typeof body?.userId === 'string' ? body.userId.trim() : ''
    if (userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw)) {
      targetUserOid = new mongoose.Types.ObjectId(userIdRaw)
    }
    if (!targetUserOid && typeof body?.email === 'string') {
      const em = normalizeEmail(body.email.trim())
      if (!em) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
      }
      await connectDB()
      const hit = await User.findOne({
        email: em
      })
        .collation({ locale: 'en', strength: 2 })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>()
      if (!hit)
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      targetUserOid = hit._id
    }

    if (!role || !targetUserOid) {
      return NextResponse.json(
        { error: 'Indica rol (owner|store_admin) y userId o email' },
        { status: 400 }
      )
    }

    await connectDB()
    const acting = gate.session.user!.id

    if (role === 'owner') {
      if (!(await canAssignOwnerMembership(acting))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    } else if (!(await canAssignStoreAdminOnStore(acting, oid))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await StoreMembership.updateOne(
      { userId: targetUserOid, storeId: oid },
      { $set: { role } },
      { upsert: true }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST memberships:', e)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { storeId } = await params
    const userDel = request.nextUrl.searchParams.get('userId')?.trim() ?? ''

    if (!mongoose.Types.ObjectId.isValid(storeId) || !userDel) {
      return NextResponse.json(
        { error: 'storeId y userId requeridos' },
        { status: 400 }
      )
    }
    if (!mongoose.Types.ObjectId.isValid(userDel)) {
      return NextResponse.json({ error: 'userId inválido' }, { status: 400 })
    }

    const oid = new mongoose.Types.ObjectId(storeId)
    const targetUserOid = new mongoose.Types.ObjectId(userDel)

    await connectDB()
    const row = await StoreMembership.findOne({
      storeId: oid,
      userId: targetUserOid
    }).lean<{ role: string } | null>()
    if (!row) return NextResponse.json({ ok: true })

    const acting = gate.session.user!.id
    if (row.role === 'owner') {
      if (!(await canAssignOwnerMembership(acting))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    } else if (!(await canAssignStoreAdminOnStore(acting, oid))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await StoreMembership.deleteOne({
      storeId: oid,
      userId: targetUserOid
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE memberships:', e)
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 })
  }
}
