import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { rutMatchVariants } from '@/lib/store-points-csv'
import {
  popidForStorage,
  rutForStorage,
  validatePopidOptional
} from '@/lib/rut-chile'
import { getRutFieldError } from '@/lib/rut-input'
import { resolveValidSignupStoreObjectId } from '@/lib/signup-default-store.server'

/**
 * Completar RUT, Pop ID y tienda de preferencia tras primer acceso con Google
 * (usuarios sin RUT o sin defaultStoreId en BD).
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

    const {
      rut,
      popid,
      defaultStoreId: defaultStoreField
    } = body as Record<string, unknown>
    const rutStr = typeof rut === 'string' ? rut : ''
    const popidStr = typeof popid === 'string' ? popid : ''
    const defaultStoreStr =
      typeof defaultStoreField === 'string' ? defaultStoreField : ''

    await connectDB()
    const user = await User.findById(session.user.id).select(
      '+passwordHash rut popid defaultStoreId'
    )
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const rutErr = getRutFieldError(rutStr, true)
    if (rutErr) {
      return NextResponse.json({ error: rutErr }, { status: 400 })
    }

    const popidErr = validatePopidOptional(popidStr)
    if (popidErr) {
      return NextResponse.json({ error: popidErr }, { status: 400 })
    }

    const storeResolved = await resolveValidSignupStoreObjectId(defaultStoreStr)
    if (!storeResolved.ok) {
      return NextResponse.json({ error: storeResolved.error }, { status: 400 })
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
    user.defaultStoreId = storeResolved.objectId
    await user.save()

    return NextResponse.json({
      ok: true,
      rut: user.rut,
      popid: user.popid ?? '',
      defaultStoreId: String(storeResolved.objectId)
    })
  } catch (e) {
    console.error('oauth-onboarding:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar el perfil.' },
      { status: 500 }
    )
  }
}
