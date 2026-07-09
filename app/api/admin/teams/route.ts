import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import type { TeamApprovalStatus } from '@/lib/teams/constants'
import { adminTeamStatusQuery } from '@/lib/teams/approval-workflow-display'
import Team from '@/models/Team'
import User from '@/models/User'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const statusRaw = request.nextUrl.searchParams.get('status')?.trim()
    const statusFilter: TeamApprovalStatus | 'all' =
      statusRaw === 'approved' ||
      statusRaw === 'rejected' ||
      statusRaw === 'pending'
        ? statusRaw
        : statusRaw === 'all'
          ? 'all'
          : 'pending'

    await connectDB()

    const query = adminTeamStatusQuery(statusFilter)

    const teams = await Team.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    const captainIds = [
      ...new Set(teams.map(t => String(t.captainUserId)).filter(Boolean))
    ].map(id => new mongoose.Types.ObjectId(id))

    const captains =
      captainIds.length > 0
        ? await User.find({ _id: { $in: captainIds } })
            .select('name email image popid rut')
            .lean<
              {
                _id: mongoose.Types.ObjectId
                name?: string
                email?: string
                image?: string
                popid?: string
                rut?: string
              }[]
            >()
        : []

    const captainById = new Map(
      captains.map(u => {
        const { displayName, imageUrl } = ownerPublicDisplay(u)
        return [
          String(u._id),
          {
            displayName,
            imageUrl,
            email: typeof u.email === 'string' ? u.email : '',
            popid: typeof u.popid === 'string' ? u.popid.trim() : '',
            rut: typeof u.rut === 'string' ? u.rut.trim() : ''
          }
        ]
      })
    )

    return NextResponse.json({
      teams: teams.map(t => {
        const cid = String(t.captainUserId)
        const captain = captainById.get(cid)
        return {
          id: String(t._id),
          name: t.name,
          slug: t.slug,
          bio: typeof t.bio === 'string' ? t.bio : '',
          approvalStatus: t.approvalStatus,
          isActive: Boolean(t.isActive),
          rejectionReason:
            typeof t.rejectionReason === 'string' ? t.rejectionReason : '',
          submittedAt:
            t.createdAt instanceof Date
              ? t.createdAt.toISOString()
              : new Date().toISOString(),
          reviewedAt:
            t.reviewedAt instanceof Date ? t.reviewedAt.toISOString() : null,
          captain: captain
            ? {
                userId: cid,
                displayName: captain.displayName,
                imageUrl: captain.imageUrl,
                email: captain.email,
                popid: captain.popid,
                rut: captain.rut
              }
            : {
                userId: cid,
                displayName: 'Usuario',
                imageUrl: null,
                email: '',
                popid: '',
                rut: ''
              }
        }
      }),
      total: teams.length,
      filter: statusFilter
    })
  } catch (e) {
    console.error('GET /api/admin/teams:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los equipos' },
      { status: 500 }
    )
  }
}
