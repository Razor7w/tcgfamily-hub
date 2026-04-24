import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  buildPlayPokemonDecklistPdf,
  type AgeDivisionPdf
} from '@/lib/play-pokemon-decklist-pdf'

const MAX_DECK_TEXT = 120_000

function parseAgeDivision(raw: unknown): AgeDivisionPdf | null {
  if (raw === 'junior' || raw === 'senior' || raw === 'masters') return raw
  return null
}

function parseIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const s = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return s
}

/**
 * Genera un PDF Play! Pokémon a partir de un listado en texto (sin mazo guardado).
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const b =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const deckText =
      typeof b.deckText === 'string' ? b.deckText.slice(0, MAX_DECK_TEXT) : ''
    const playerName =
      typeof b.playerName === 'string' ? b.playerName.trim().slice(0, 200) : ''
    const playerId =
      typeof b.playerId === 'string' ? b.playerId.trim().slice(0, 64) : ''
    const dateOfBirthIso = parseIsoDate(b.dateOfBirth)
    const ageDivision = parseAgeDivision(b.ageDivision)

    if (!deckText.trim()) {
      return NextResponse.json(
        { error: 'Incluye el listado del mazo' },
        { status: 400 }
      )
    }
    if (!playerName) {
      return NextResponse.json(
        { error: 'El nombre del jugador es obligatorio' },
        { status: 400 }
      )
    }
    if (!dateOfBirthIso) {
      return NextResponse.json(
        { error: 'Fecha de nacimiento inválida (usa AAAA-MM-DD)' },
        { status: 400 }
      )
    }
    if (!ageDivision) {
      return NextResponse.json(
        { error: 'Categoría inválida (junior, senior o masters)' },
        { status: 400 }
      )
    }

    const bytes = await buildPlayPokemonDecklistPdf({
      deckText,
      playerName,
      playerId,
      dateOfBirthIso,
      ageDivision
    })

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="play-pokemon-decklist.pdf"'
      }
    })
  } catch (e) {
    console.error('POST /api/play-pokemon-decklist-pdf:', e)
    return NextResponse.json(
      { error: 'No se pudo generar el PDF' },
      { status: 500 }
    )
  }
}
