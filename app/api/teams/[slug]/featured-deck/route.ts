import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  getMembershipForUserOnTeam,
  getApprovedTeamBySlug
} from '@/lib/teams/access'
import SavedDecklist from '@/models/SavedDecklist'
import TeamMembership from '@/models/TeamMembership'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const teamOid = team._id as mongoose.Types.ObjectId
    const membership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      teamOid
    )
    if (!membership) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const decklistIdRaw =
      body?.decklistId === null || body?.decklistId === ''
        ? null
        : typeof body?.decklistId === 'string'
          ? body.decklistId.trim()
          : undefined

    if (decklistIdRaw === undefined) {
      return NextResponse.json(
        { error: 'Indica un mazo o null para quitar' },
        { status: 400 }
      )
    }

    await connectDB()

    let featuredDecklistId: mongoose.Types.ObjectId | undefined

    if (decklistIdRaw) {
      if (!mongoose.Types.ObjectId.isValid(decklistIdRaw)) {
        return NextResponse.json({ error: 'Mazo inválido' }, { status: 400 })
      }

      const deck = await SavedDecklist.findOne({
        _id: new mongoose.Types.ObjectId(decklistIdRaw),
        userId: new mongoose.Types.ObjectId(gate.session.user!.id!),
        isPublic: true
      })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>()

      if (!deck) {
        return NextResponse.json(
          {
            error:
              'El mazo no existe, no es tuyo o no está marcado como público'
          },
          { status: 400 }
        )
      }

      featuredDecklistId = deck._id
    }

    await TeamMembership.updateOne(
      { _id: membership._id },
      decklistIdRaw
        ? { $set: { featuredDecklistId } }
        : { $unset: { featuredDecklistId: 1 } }
    )

    return NextResponse.json({
      ok: true,
      featuredDecklistId: decklistIdRaw
    })
  } catch (e) {
    console.error('PATCH /api/teams/[slug]/featured-deck:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar el mazo destacado' },
      { status: 500 }
    )
  }
}
