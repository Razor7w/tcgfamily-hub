import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { rutMatchVariants } from '@/lib/store-points-csv'
import {
  popidForStorage,
  rutForStorage,
  validatePopidOptional,
  validateRutChile
} from '@/lib/rut-chile'

/**
 * Completar RUT/Pop ID tras primer acceso con Google (usuarios sin RUT en BD).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { rut, popid } = body as Record<string, unknown>
    const rutStr = typeof rut === 'string' ? rut : ''
    const popidStr = typeof popid === 'string' ? popid : ''

    await connectDB()
    const user = await User.findById(session.user.id).select(
      '+passwordHash rut popid'
    )
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const rutErr = validateRutChile(rutStr)
    if (rutErr) {
      return NextResponse.json({ error: rutErr }, { status: 400 })
    }

    const popidErr = validatePopidOptional(popidStr)
    if (popidErr) {
      return NextResponse.json({ error: popidErr }, { status: 400 })
    }

    const rutStored = rutForStorage(rutStr)
    const variants = rutMatchVariants(rutStored)
    const existingRut = await User.findOne({
      rut: { $in: variants },
      _id: { $ne: user._id }
    }).select('_id')
    if (existingRut) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este RUT.' },
        { status: 409 }
      )
    }

    user.rut = rutStored
    user.popid = popidForStorage(popidStr)
    await user.save()

    return NextResponse.json({
      ok: true,
      rut: user.rut,
      popid: user.popid ?? ''
    })
  } catch (e) {
    console.error('oauth-onboarding:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar el perfil.' },
      { status: 500 }
    )
  }
}
