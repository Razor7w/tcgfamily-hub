import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { sellerPublicPath } from '@/lib/seller-slug'
import User from '@/models/User'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const gate = await requireOwnerSession()
    if (!gate.ok) return gate.response

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim().slice(0, 80)
    const mode = searchParams.get('mode') === 'search' ? 'search' : 'allowed'

    await connectDB()

    if (mode === 'search') {
      if (q.length < 2) {
        return NextResponse.json({ users: [] })
      }
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const users = await User.find({
        $or: [{ name: rx }, { email: rx }, { sellerSlug: rx }]
      })
        .select('name email role sellerSlug sellerModuleAccess image')
        .sort({ name: 1 })
        .limit(20)
        .lean()

      return NextResponse.json({
        users: users.map(u => ({
          id: String(u._id),
          name: (u.name ?? '').trim() || 'Sin nombre',
          email: (u.email ?? '').trim(),
          role: u.role === 'admin' ? 'admin' : 'user',
          sellerSlug:
            typeof u.sellerSlug === 'string' ? u.sellerSlug.trim() : '',
          sellerModuleAccess: Boolean(u.sellerModuleAccess),
          image: typeof u.image === 'string' ? u.image : '',
          publicPath:
            typeof u.sellerSlug === 'string' && u.sellerSlug.trim()
              ? sellerPublicPath(u.sellerSlug.trim().toLowerCase())
              : null,
          accessViaAdminRole: u.role === 'admin'
        }))
      })
    }

    const users = await User.find({
      $or: [{ sellerModuleAccess: true }, { role: 'admin' }]
    })
      .select('name email role sellerSlug sellerModuleAccess image')
      .sort({ name: 1 })
      .limit(200)
      .lean()

    return NextResponse.json({
      users: users.map(u => ({
        id: String(u._id),
        name: (u.name ?? '').trim() || 'Sin nombre',
        email: (u.email ?? '').trim(),
        role: u.role === 'admin' ? 'admin' : 'user',
        sellerSlug: typeof u.sellerSlug === 'string' ? u.sellerSlug.trim() : '',
        sellerModuleAccess: Boolean(u.sellerModuleAccess),
        image: typeof u.image === 'string' ? u.image : '',
        publicPath:
          typeof u.sellerSlug === 'string' && u.sellerSlug.trim()
            ? sellerPublicPath(u.sellerSlug.trim().toLowerCase())
            : null,
        accessViaAdminRole: u.role === 'admin'
      }))
    })
  } catch (e) {
    console.error('GET /api/admin/vendedores:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar la lista' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireOwnerSession()
    if (!gate.ok) return gate.response

    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown
      access?: unknown
    }
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
    }
    if (typeof body.access !== 'boolean') {
      return NextResponse.json(
        { error: 'Debes indicar access: true|false' },
        { status: 400 }
      )
    }

    await connectDB()
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { sellerModuleAccess: body.access } },
      { new: true }
    )
      .select('name email role sellerSlug sellerModuleAccess image')
      .lean()

    if (!updated) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: String(updated._id),
        name: (updated.name ?? '').trim() || 'Sin nombre',
        email: (updated.email ?? '').trim(),
        role: updated.role === 'admin' ? 'admin' : 'user',
        sellerSlug:
          typeof updated.sellerSlug === 'string'
            ? updated.sellerSlug.trim()
            : '',
        sellerModuleAccess: Boolean(updated.sellerModuleAccess),
        image: typeof updated.image === 'string' ? updated.image : '',
        publicPath:
          typeof updated.sellerSlug === 'string' && updated.sellerSlug.trim()
            ? sellerPublicPath(updated.sellerSlug.trim().toLowerCase())
            : null,
        accessViaAdminRole: updated.role === 'admin'
      }
    })
  } catch (e) {
    console.error('PATCH /api/admin/vendedores:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el acceso' },
      { status: 500 }
    )
  }
}
