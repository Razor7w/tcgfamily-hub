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
      .select('playPokemonRankPublic')
      .lean<{ playPokemonRankPublic?: boolean } | null>()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      rankPublic: user.playPokemonRankPublic === true
    })
  } catch (error) {
    console.error('GET /api/me/championship-points/visibility:', error)
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
    const rankPublic = (body as { rankPublic?: unknown }).rankPublic
    if (typeof rankPublic !== 'boolean') {
      return NextResponse.json(
        { error: 'rankPublic debe ser boolean' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(
      uid,
      { playPokemonRankPublic: rankPublic },
      { new: true }
    )
      .select('playPokemonRankPublic')
      .lean<{ playPokemonRankPublic?: boolean } | null>()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      rankPublic: user.playPokemonRankPublic === true
    })
  } catch (error) {
    console.error('PATCH /api/me/championship-points/visibility:', error)
    return NextResponse.json(
      { error: 'Error al guardar preferencias' },
      { status: 500 }
    )
  }
}
