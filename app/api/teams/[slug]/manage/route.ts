import { NextRequest, NextResponse } from 'next/server'
import { requireSessionUser } from '@/lib/api-auth'
import {
  buildTeamManageCore,
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

    const payload = await buildTeamManageCore({
      team: access.team,
      teamOid: access.teamOid,
      viewerUserId: gate.session.user!.id!,
      viewerMembership: access.viewerMembership
    })

    return NextResponse.json(payload)
  } catch (e) {
    console.error('GET /api/teams/[slug]/manage:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar la gestión del equipo' },
      { status: 500 }
    )
  }
}
