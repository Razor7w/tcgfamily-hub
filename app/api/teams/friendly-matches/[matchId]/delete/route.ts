import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import { requireCaptainOnFriendlyMatch } from '@/lib/teams/friendly-match/captain-access'
import { deleteFriendlyMatch } from '@/lib/teams/friendly-match/lifecycle'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { matchId: raw } = await context.params
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      return NextResponse.json({ error: 'Match inválido' }, { status: 400 })
    }

    const matchId = new mongoose.Types.ObjectId(raw)
    const access = await requireCaptainOnFriendlyMatch(
      gate.session.user!.id!,
      matchId
    )
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const result = await deleteFriendlyMatch(matchId)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST friendly-matches delete:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar el versus' },
      { status: 500 }
    )
  }
}
