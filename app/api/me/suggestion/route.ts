import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import UserSuggestion from '@/models/UserSuggestion'
import {
  normalizeUserSuggestionText,
  USER_SUGGESTION_MAX_LEN,
  USER_SUGGESTION_MIN_LEN
} from '@/lib/user-suggestion-text'

export const runtime = 'nodejs'

function suggestionDto(doc: {
  text: string
  createdAt?: Date
  updatedAt?: Date
}) {
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date().toISOString()
  return {
    text: doc.text,
    createdAt
  }
}

/** Sugerencia del usuario (máximo una por cuenta). */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(session.user.id)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    await connectDB()
    const doc = await UserSuggestion.findOne({ userId: uid })
      .select('text createdAt updatedAt')
      .lean<{ text: string; createdAt?: Date; updatedAt?: Date } | null>()

    return NextResponse.json({
      hasSubmitted: Boolean(doc),
      suggestion: doc ? suggestionDto(doc) : null
    })
  } catch (e) {
    console.error('GET /api/me/suggestion:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar tu sugerencia' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(session.user.id)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const text = normalizeUserSuggestionText(
      body && typeof body === 'object'
        ? (body as { text?: unknown }).text
        : undefined
    )
    if (!text) {
      return NextResponse.json(
        {
          error: `Escribe entre ${USER_SUGGESTION_MIN_LEN} y ${USER_SUGGESTION_MAX_LEN} caracteres.`
        },
        { status: 400 }
      )
    }

    await connectDB()

    const existing = await UserSuggestion.findOne({ userId: uid })
      .select('_id')
      .lean()
    if (existing) {
      return NextResponse.json(
        {
          error: 'Ya enviaste una sugerencia con esta cuenta.',
          code: 'suggestion_already_submitted'
        },
        { status: 409 }
      )
    }

    try {
      const created = await UserSuggestion.create({ userId: uid, text })
      return NextResponse.json(
        {
          hasSubmitted: true,
          suggestion: suggestionDto(created)
        },
        { status: 201 }
      )
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: number }).code === 11000
      ) {
        return NextResponse.json(
          {
            error: 'Ya enviaste una sugerencia con esta cuenta.',
            code: 'suggestion_already_submitted'
          },
          { status: 409 }
        )
      }
      throw e
    }
  } catch (e) {
    console.error('POST /api/me/suggestion:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar la sugerencia' },
      { status: 500 }
    )
  }
}
