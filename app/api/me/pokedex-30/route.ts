import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Pokedex30Progress from '@/models/Pokedex30Progress'
import { POKEDEX_30_CARDS } from '@/lib/pokedex-30-cards'

export const runtime = 'nodejs'

const ALLOWED_CARD_IDS = new Set(POKEDEX_30_CARDS.map(card => card.id))

function sessionUserId() {
  return auth().then(session => {
    const id = session?.user?.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null
    return new mongoose.Types.ObjectId(id)
  })
}

function sanitizeCardIds(input: unknown) {
  if (!Array.isArray(input)) return null
  const seen = new Set<string>()
  const cardIds: string[] = []
  for (const id of input) {
    if (typeof id !== 'string' || !ALLOWED_CARD_IDS.has(id) || seen.has(id)) {
      continue
    }
    seen.add(id)
    cardIds.push(id)
  }
  return cardIds
}

export async function GET() {
  try {
    const userId = await sessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const doc = await Pokedex30Progress.findOne({ userId })
      .select('cardIds')
      .lean<{ cardIds?: string[] } | null>()

    return NextResponse.json({ cardIds: doc?.cardIds ?? [] })
  } catch (error) {
    console.error('GET /api/me/pokedex-30:', error)
    return NextResponse.json(
      { error: 'No se pudo leer la Pokédex' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await sessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      cardIds?: unknown
    } | null
    const cardIds = sanitizeCardIds(body?.cardIds)
    if (!cardIds) {
      return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
    }

    await connectDB()
    const doc = await Pokedex30Progress.findOneAndUpdate(
      { userId },
      { $set: { cardIds } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .select('cardIds')
      .lean<{ cardIds?: string[] } | null>()

    return NextResponse.json({ cardIds: doc?.cardIds ?? cardIds })
  } catch (error) {
    console.error('PUT /api/me/pokedex-30:', error)
    return NextResponse.json(
      { error: 'No se pudo guardar la Pokédex' },
      { status: 500 }
    )
  }
}
