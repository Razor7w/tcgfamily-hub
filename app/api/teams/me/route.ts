import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import {
  TEAM_BIO_MAX,
  TEAM_NAME_MAX,
  TEAM_ROLE_LABELS
} from '@/lib/teams/constants'
import {
  getActiveTeamForUser,
  getPendingTeamApplicationForUser,
  userCanApplyForTeam
} from '@/lib/teams/access'
import Team from '@/models/Team'

export async function GET() {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const userId = gate.session.user!.id!
    const active = await getActiveTeamForUser(userId)
    const pending = await getPendingTeamApplicationForUser(userId)

    let lastRejected: {
      name: string
      slug: string
      rejectionReason: string
      reviewedAt: string
    } | null = null

    if (!active && !pending) {
      const rejected = await Team.findOne({
        captainUserId: new mongoose.Types.ObjectId(userId),
        approvalStatus: 'rejected'
      })
        .sort({ reviewedAt: -1 })
        .select('name slug rejectionReason reviewedAt')
        .lean<{
          name: string
          slug: string
          rejectionReason?: string
          reviewedAt?: Date
        } | null>()

      if (rejected) {
        lastRejected = {
          name: rejected.name,
          slug: rejected.slug,
          rejectionReason:
            typeof rejected.rejectionReason === 'string'
              ? rejected.rejectionReason.trim()
              : '',
          reviewedAt:
            rejected.reviewedAt instanceof Date
              ? rejected.reviewedAt.toISOString()
              : new Date().toISOString()
        }
      }
    }

    return NextResponse.json({
      membership: active
        ? {
            teamId: String(active.team._id),
            teamName: active.team.name,
            teamSlug: active.team.slug,
            teamLogoUrl: active.team.logoUrl ?? '',
            role: active.membership.role,
            roleLabel: TEAM_ROLE_LABELS[active.membership.role]
          }
        : null,
      application: pending
        ? {
            id: String(pending._id),
            name: pending.name,
            slug: pending.slug,
            bio: pending.bio ?? '',
            status: 'pending' as const,
            submittedAt:
              pending.createdAt instanceof Date
                ? pending.createdAt.toISOString()
                : new Date().toISOString()
          }
        : null,
      lastRejected,
      canApplyForTeam: await userCanApplyForTeam(userId),
      limits: {
        nameMax: TEAM_NAME_MAX,
        bioMax: TEAM_BIO_MAX
      }
    })
  } catch (e) {
    console.error('GET /api/teams/me:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar tu equipo' },
      { status: 500 }
    )
  }
}
