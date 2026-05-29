import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function GET() {
  try {
    const session = await auth()
    const uid = session?.user?.id
    if (!uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(uid)
      .select('contributionHideBadge')
      .lean<{ contributionHideBadge?: boolean } | null>()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      hideBadge: user.contributionHideBadge === true
    })
  } catch (error) {
    console.error('GET /api/me/contribution-preferences:', error)
    return NextResponse.json(
      { error: 'Error al cargar preferencias' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    const uid = session?.user?.id
    if (!uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }
    const hideBadge = (body as { hideBadge?: unknown }).hideBadge
    if (typeof hideBadge !== 'boolean') {
      return NextResponse.json(
        { error: 'hideBadge debe ser boolean' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(
      uid,
      { contributionHideBadge: hideBadge },
      { new: true }
    )
      .select('contributionHideBadge')
      .lean<{ contributionHideBadge?: boolean } | null>()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      hideBadge: user.contributionHideBadge === true
    })
  } catch (error) {
    console.error('PATCH /api/me/contribution-preferences:', error)
    return NextResponse.json(
      { error: 'Error al guardar preferencias' },
      { status: 500 }
    )
  }
}
