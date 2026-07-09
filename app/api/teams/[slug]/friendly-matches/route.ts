import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  canManageTeam,
  countActiveMembers,
  getApprovedTeamBySlug,
  getMembershipForUserOnTeam
} from '@/lib/teams/access'
import { buildTeamFriendlyMatchList } from '@/lib/teams/friendly-match/build-payload'
import {
  TEAM_FRIENDLY_CHALLENGE_EXPIRY_DAYS,
  TEAM_FRIENDLY_INTRAMURAL_MIN_MEMBERS
} from '@/lib/teams/friendly-match/constants'
import { createFriendlyMatchDuels } from '@/lib/teams/friendly-match/lifecycle'
import {
  assertIntramuralLineups,
  assertLineupBelongsToTeam,
  parseFriendlyLineupInput
} from '@/lib/teams/friendly-match/validation'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'

export async function GET(
  _request: NextRequest,
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

    const matches = await buildTeamFriendlyMatchList(
      teamOid,
      gate.session.user!.id!,
      canManageTeam(membership.role)
    )

    return NextResponse.json({ matches })
  } catch (e) {
    console.error('GET /api/teams/[slug]/friendly-matches:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los versus' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const challengerTeam = await getApprovedTeamBySlug(slug)
    if (!challengerTeam) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const challengerOid = challengerTeam._id as mongoose.Types.ObjectId
    const membership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      challengerOid
    )
    if (!membership || !canManageTeam(membership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const isIntramural = body?.intramural === true

    if (isIntramural) {
      const memberCount = await countActiveMembers(challengerOid)
      if (memberCount < TEAM_FRIENDLY_INTRAMURAL_MIN_MEMBERS) {
        return NextResponse.json(
          {
            error: `Se necesitan al menos ${TEAM_FRIENDLY_INTRAMURAL_MIN_MEMBERS} miembros activos para un versus interno`
          },
          { status: 400 }
        )
      }

      const parsedChallengerLineup = parseFriendlyLineupInput(body?.lineup)
      if (!parsedChallengerLineup.ok) {
        return NextResponse.json(
          { error: parsedChallengerLineup.error },
          { status: 400 }
        )
      }

      const parsedOpponentLineup = parseFriendlyLineupInput(
        body?.opponentLineup
      )
      if (!parsedOpponentLineup.ok) {
        return NextResponse.json(
          { error: parsedOpponentLineup.error },
          { status: 400 }
        )
      }

      const intramuralCheck = await assertIntramuralLineups(
        challengerOid,
        parsedChallengerLineup.lineup,
        parsedOpponentLineup.lineup
      )
      if (!intramuralCheck.ok) {
        return NextResponse.json(
          { error: intramuralCheck.error },
          { status: 400 }
        )
      }

      await connectDB()

      const existingIntramural = await TeamFriendlyMatch.findOne({
        challengerTeamId: challengerOid,
        opponentTeamId: challengerOid,
        isIntramural: true,
        status: { $in: ['in_progress', 'disputed'] }
      }).lean()

      if (existingIntramural) {
        return NextResponse.json(
          { error: 'Ya hay un versus interno en curso en este equipo' },
          { status: 409 }
        )
      }

      const match = await TeamFriendlyMatch.create({
        challengerTeamId: challengerOid,
        opponentTeamId: challengerOid,
        requestedByUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
        respondedByUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
        status: 'in_progress',
        tier: 'social',
        isIntramural: true,
        challengerLineup: parsedChallengerLineup.lineup.map(slot => ({
          userId: new mongoose.Types.ObjectId(slot.userId),
          slot: slot.slot
        })),
        opponentLineup: parsedOpponentLineup.lineup.map(slot => ({
          userId: new mongoose.Types.ObjectId(slot.userId),
          slot: slot.slot
        })),
        acceptedAt: new Date()
      })

      await createFriendlyMatchDuels(
        match._id as mongoose.Types.ObjectId,
        parsedChallengerLineup.lineup,
        parsedOpponentLineup.lineup
      )

      return NextResponse.json({
        match: { id: String(match._id), status: 'in_progress' }
      })
    }

    const opponentSlug =
      typeof body?.opponentTeamSlug === 'string'
        ? body.opponentTeamSlug.trim().toLowerCase()
        : ''

    if (!opponentSlug) {
      return NextResponse.json(
        { error: 'Debes indicar el equipo rival' },
        { status: 400 }
      )
    }

    if (opponentSlug === slug) {
      return NextResponse.json(
        { error: 'No puedes retar a tu propio equipo' },
        { status: 400 }
      )
    }

    const parsedLineup = parseFriendlyLineupInput(body?.lineup)
    if (!parsedLineup.ok) {
      return NextResponse.json({ error: parsedLineup.error }, { status: 400 })
    }

    const opponentTeam = await getApprovedTeamBySlug(opponentSlug)
    if (!opponentTeam) {
      return NextResponse.json(
        { error: 'Equipo rival no encontrado' },
        { status: 404 }
      )
    }

    const opponentOid = opponentTeam._id as mongoose.Types.ObjectId
    const lineupCheck = await assertLineupBelongsToTeam(
      challengerOid,
      parsedLineup.lineup
    )
    if (!lineupCheck.ok) {
      return NextResponse.json({ error: lineupCheck.error }, { status: 400 })
    }

    await connectDB()

    const existing = await TeamFriendlyMatch.findOne({
      $or: [
        { challengerTeamId: challengerOid, opponentTeamId: opponentOid },
        { challengerTeamId: opponentOid, opponentTeamId: challengerOid }
      ],
      status: { $in: ['pending', 'in_progress'] }
    }).lean()

    if (existing) {
      return NextResponse.json(
        { error: 'Ya hay un versus pendiente o en curso con ese equipo' },
        { status: 409 }
      )
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + TEAM_FRIENDLY_CHALLENGE_EXPIRY_DAYS)

    const match = await TeamFriendlyMatch.create({
      challengerTeamId: challengerOid,
      opponentTeamId: opponentOid,
      requestedByUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
      status: 'pending',
      tier: 'social',
      isIntramural: false,
      challengerLineup: parsedLineup.lineup.map(slot => ({
        userId: new mongoose.Types.ObjectId(slot.userId),
        slot: slot.slot
      })),
      opponentLineup: [],
      expiresAt
    })

    return NextResponse.json({
      match: { id: String(match._id), status: 'pending' }
    })
  } catch (e) {
    console.error('POST /api/teams/[slug]/friendly-matches:', e)
    return NextResponse.json(
      { error: 'No se pudo enviar el desafío' },
      { status: 500 }
    )
  }
}
