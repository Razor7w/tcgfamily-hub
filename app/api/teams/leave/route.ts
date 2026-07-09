import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { getActiveTeamForUser } from '@/lib/teams/access'
import { vacatePlayerFromTeamFriendlyMatches } from '@/lib/teams/friendly-match/lineup-roster'
import TeamMembership from '@/models/TeamMembership'
import type { TeamRole } from '@/lib/teams/constants'

export async function POST() {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const active = await getActiveTeamForUser(gate.session.user!.id!)
    if (!active) {
      return NextResponse.json(
        { error: 'No perteneces a ningún equipo' },
        { status: 404 }
      )
    }

    const role = active.membership.role as TeamRole
    if (role === 'captain') {
      return NextResponse.json(
        {
          error:
            'El capitán no puede salir sin disolver el equipo o transferir el mando',
          code: 'captain_cannot_leave'
        },
        { status: 400 }
      )
    }

    await connectDB()
    const teamOid = active.team._id as mongoose.Types.ObjectId
    const userId = gate.session.user!.id!

    await vacatePlayerFromTeamFriendlyMatches(teamOid, userId)

    await TeamMembership.updateOne(
      {
        teamId: teamOid,
        userId: new mongoose.Types.ObjectId(userId),
        status: 'active'
      },
      { $set: { status: 'left' }, $unset: { featuredDecklistId: '' } }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/teams/leave:', e)
    return NextResponse.json(
      { error: 'No se pudo salir del equipo' },
      { status: 500 }
    )
  }
}
