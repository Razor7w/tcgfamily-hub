import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import {
  applyUserRutOnceToDoc,
  linkTeamInvitesAfterRutAssign,
  userHasAssignedRut
} from '@/lib/assign-user-rut'
import { linkTournamentParticipantsToUserByPop } from '@/lib/link-tournament-participants-by-pop'
import { popidForStorage, validatePopidOptional } from '@/lib/rut-chile'
import { resolveValidSignupStoreObjectId } from '@/lib/signup-default-store.server'

/**
 * Completar tienda de preferencia (y RUT opcional) tras primer acceso con Google
 * (usuarios sin defaultStoreId en BD).
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

    const popidErr = validatePopidOptional(popidStr)
    if (popidErr) {
      return NextResponse.json({ error: popidErr }, { status: 400 })
    }

    const storeResolved = await resolveValidSignupStoreObjectId(defaultStoreStr)
    if (!storeResolved.ok) {
      return NextResponse.json({ error: storeResolved.error }, { status: 400 })
    }

    let rutAssigned = false
    if (rutStr.trim()) {
      const assigned = await applyUserRutOnceToDoc(user, rutStr, {
        required: false
      })
      if (!assigned.ok) {
        return NextResponse.json(
          { error: assigned.error },
          { status: assigned.status }
        )
      }
      rutAssigned = assigned.assigned
    }

    const popNorm = popidForStorage(popidStr)
    user.popid = popNorm
    user.defaultStoreId = storeResolved.objectId
    await user.save()

    if (rutAssigned && userHasAssignedRut(user.rut)) {
      await linkTeamInvitesAfterRutAssign(
        String(user._id),
        String(user.rut ?? '')
      )
    }

    if (popNorm) {
      try {
        await linkTournamentParticipantsToUserByPop(
          user._id as mongoose.Types.ObjectId,
          popNorm
        )
      } catch (e) {
        console.error(
          'linkTournamentParticipantsToUserByPop (oauth-onboarding):',
          e
        )
      }
    }

    return NextResponse.json({
      ok: true,
      rut: user.rut ?? '',
      popid: user.popid ?? '',
      defaultStoreId: String(storeResolved.objectId),
      rutAssigned: userHasAssignedRut(user.rut)
    })
  } catch (e) {
    console.error('oauth-onboarding:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar el perfil.' },
      { status: 500 }
    )
  }
}
