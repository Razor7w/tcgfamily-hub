import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  matchRecordFromRounds,
  parseParticipantMatchRoundsFromLean
} from '@/lib/participant-match-round'
import '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'

const LIST_MAX = 400

type LeanParticipant = {
  displayName?: string
  userId?: { toString(): string } | null
  matchRounds?: unknown[]
  deckPokemonSlugs?: string[]
  wins?: number
  losses?: number
  ties?: number
  manualPlacement?: {
    categoryIndex: number
    place: number | null
    isDnf: boolean
  }
}

type LeanUser = {
  _id: unknown
  name?: string
  email?: string
}

function creatorMongoIdFromDoc(doc: {
  createdByUserId?: LeanUser | unknown | null
}): string | null {
  const raw = doc.createdByUserId
  if (raw && typeof raw === 'object' && '_id' in raw) {
    return String((raw as LeanUser)._id)
  }
  if (raw) return String(raw)
  return null
}

function serializeCustomTournament(doc: Record<string, unknown>) {
  const participants = (doc.participants as LeanParticipant[]) ?? []
  const creatorMongoId = creatorMongoIdFromDoc(
    doc as { createdByUserId?: unknown }
  )

  const populated = doc.createdByUserId as LeanUser | undefined
  const creator =
    populated && typeof populated === 'object' && '_id' in populated
      ? {
          _id: String(populated._id),
          name:
            typeof populated.name === 'string' && populated.name.trim()
              ? populated.name.trim()
              : null,
          email:
            typeof populated.email === 'string' && populated.email.trim()
              ? populated.email.trim()
              : null
        }
      : creatorMongoId
        ? { _id: creatorMongoId, name: null, email: null }
        : null

  let p: LeanParticipant | undefined
  if (creatorMongoId) {
    p = participants.find(x => x.userId && String(x.userId) === creatorMongoId)
  }
  if (!p && participants.length > 0) {
    p = participants[0]
  }

  let creatorParticipant: {
    displayName: string
    matchRoundsReported: number
    deckPokemonSlugs: string[]
    wins: number
    losses: number
    ties: number
    manualPlacement: {
      categoryIndex: number
      place: number | null
      isDnf: boolean
    } | null
  } | null = null

  if (p) {
    const parsedRounds = parseParticipantMatchRoundsFromLean(p.matchRounds)
    const mr = parsedRounds.length
    const deck = Array.isArray(p.deckPokemonSlugs) ? p.deckPokemonSlugs : []
    const mp = p.manualPlacement
    /** En torneos custom el W‑L‑T persistido en el participante suele ser 0; el récord real sale de las rondas. */
    const recordFromRounds = mr > 0 ? matchRecordFromRounds(parsedRounds) : null
    const winsFallback =
      typeof p.wins === 'number' && Number.isFinite(p.wins) ? p.wins : 0
    const lossesFallback =
      typeof p.losses === 'number' && Number.isFinite(p.losses) ? p.losses : 0
    const tiesFallback =
      typeof p.ties === 'number' && Number.isFinite(p.ties) ? p.ties : 0
    creatorParticipant = {
      displayName:
        typeof p.displayName === 'string' && p.displayName.trim()
          ? p.displayName.trim()
          : '—',
      matchRoundsReported: mr,
      deckPokemonSlugs: deck.filter(s => typeof s === 'string' && s.trim()),
      wins: recordFromRounds?.wins ?? winsFallback,
      losses: recordFromRounds?.losses ?? lossesFallback,
      ties: recordFromRounds?.ties ?? tiesFallback,
      manualPlacement:
        mp &&
        typeof mp === 'object' &&
        typeof mp.categoryIndex === 'number' &&
        mp.categoryIndex >= 0 &&
        mp.categoryIndex <= 2
          ? {
              categoryIndex: mp.categoryIndex,
              place:
                mp.place != null &&
                typeof mp.place === 'number' &&
                Number.isFinite(mp.place)
                  ? mp.place
                  : null,
              isDnf: mp.isDnf === true
            }
          : null
    }
  }

  const startsAt = doc.startsAt
    ? new Date(doc.startsAt as string | Date).toISOString()
    : new Date(0).toISOString()
  const createdAt = doc.createdAt
    ? new Date(doc.createdAt as string | Date).toISOString()
    : startsAt
  const updatedAt = doc.updatedAt
    ? new Date(doc.updatedAt as string | Date).toISOString()
    : createdAt

  return {
    _id: String(doc._id),
    title: typeof doc.title === 'string' ? doc.title : '',
    startsAt,
    createdAt,
    updatedAt,
    creator,
    participantCount: participants.length,
    creatorParticipant
  }
}

export async function GET() {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    await connectDB()

    const raw = await WeeklyEvent.find({ tournamentOrigin: 'custom' })
      .sort({ startsAt: -1 })
      .limit(LIST_MAX)
      .populate({ path: 'createdByUserId', select: 'name email' })
      .lean()

    const tournaments = raw.map(d =>
      serializeCustomTournament(d as Record<string, unknown>)
    )

    return NextResponse.json({ tournaments }, { status: 200 })
  } catch (error) {
    console.error('GET /api/admin/custom-tournaments:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneos custom' },
      { status: 500 }
    )
  }
}
