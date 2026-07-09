import { NextRequest, NextResponse } from 'next/server'
import { requireSessionUser } from '@/lib/api-auth'
import { canManageTeam } from '@/lib/teams/access'
import {
  loadTeamManageInvitations,
  requireTeamManageAccess
} from '@/lib/teams/manage-payload'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const access = await requireTeamManageAccess(slug, gate.session.user!.id!)
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    if (!canManageTeam(access.viewerMembership.role)) {
      return NextResponse.json({ invitations: [] })
    }

    const invitations = await loadTeamManageInvitations(access.teamOid)

    return NextResponse.json({ invitations })
  } catch (e) {
    console.error('GET /api/teams/[slug]/manage/invitations:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las invitaciones' },
      { status: 500 }
    )
  }
}
