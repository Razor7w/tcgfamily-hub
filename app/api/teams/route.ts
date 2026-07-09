import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { TEAM_BIO_MAX, TEAM_NAME_MAX } from '@/lib/teams/constants'
import { userCanApplyForTeam } from '@/lib/teams/access'
import {
  isValidTeamSlug,
  normalizeTeamSlug,
  slugFromTeamName
} from '@/lib/teams/slug'
import Team from '@/models/Team'

async function resolveUniqueSlug(base: string): Promise<string | null> {
  const normalized = normalizeTeamSlug(base)
  if (!isValidTeamSlug(normalized)) return null

  await connectDB()
  let candidate = normalized
  for (let i = 0; i < 50; i++) {
    const exists = await Team.exists({ slug: candidate })
    if (!exists) return candidate
    const suffix = `-${i + 2}`
    candidate = `${normalized.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const userId = gate.session.user!.id!
    if (!(await userCanApplyForTeam(userId))) {
      return NextResponse.json(
        {
          error:
            'No puedes solicitar un equipo nuevo (ya tienes equipo, solicitud pendiente o membresía activa).',
          code: 'cannot_apply'
        },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => null)
    const name =
      typeof body?.name === 'string'
        ? body.name.trim().slice(0, TEAM_NAME_MAX)
        : ''
    const bio =
      typeof body?.bio === 'string'
        ? body.bio.trim().slice(0, TEAM_BIO_MAX)
        : ''
    const slugRaw =
      typeof body?.slug === 'string' && body.slug.trim()
        ? body.slug.trim()
        : slugFromTeamName(name)

    if (name.length < 2) {
      return NextResponse.json(
        { error: 'El nombre del equipo debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    const slug = await resolveUniqueSlug(slugRaw)
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug inválido o no disponible' },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(userId)

    const team = await Team.create({
      name,
      slug,
      bio,
      captainUserId: uid,
      approvalStatus: 'pending',
      isActive: false
    })

    return NextResponse.json(
      {
        application: {
          id: String(team._id),
          name: team.name,
          slug: team.slug,
          bio: team.bio ?? '',
          status: 'pending' as const,
          submittedAt: team.createdAt.toISOString()
        }
      },
      { status: 201 }
    )
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          error: 'Ya tienes una solicitud o equipo con ese slug',
          code: 'duplicate'
        },
        { status: 409 }
      )
    }
    console.error('POST /api/teams:', e)
    return NextResponse.json(
      { error: 'No se pudo enviar la solicitud' },
      { status: 500 }
    )
  }
}
