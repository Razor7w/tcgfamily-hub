import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import {
  buildPlayPokemonDecklistPdf,
  type AgeDivisionPdf,
  type PlayPokemonDecklistPdfOptions
} from '@/lib/play-pokemon-decklist-pdf'
import SavedDecklist from '@/models/SavedDecklist'

function parseObjectId(id: string): mongoose.Types.ObjectId | null {
  try {
    return new mongoose.Types.ObjectId(id.trim())
  } catch {
    return null
  }
}

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

/** Offset en puntos tipográficos; rango acotado para evitar abusos. */
function parsePdfOffset(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined
  if (raw < -400 || raw > 400) return undefined
  return raw
}

/** PDF tipo Play! Pokémon a partir del listado guardado + datos del jugador. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const oid = parseObjectId(id || '')
    if (!oid) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const b =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const playerName =
      typeof b.playerName === 'string' ? b.playerName.trim().slice(0, 200) : ''
    const playerId =
      typeof b.playerId === 'string' ? b.playerId.trim().slice(0, 64) : ''
    const dateOfBirthIso = parseIsoDate(b.dateOfBirth)
    const ageDivision = parseAgeDivision(b.ageDivision)
    const listKind = b.listKind === 'variant' ? 'variant' : 'base'
    const variantId =
      typeof b.variantId === 'string' && b.variantId.trim()
        ? b.variantId.trim()
        : null

    const ox = parsePdfOffset(b.offsetX)
    const oy = parsePdfOffset(b.offsetY)
    const pdfOptions: PlayPokemonDecklistPdfOptions | undefined =
      ox !== undefined || oy !== undefined
        ? {
            ...(ox !== undefined ? { offsetX: ox } : {}),
            ...(oy !== undefined ? { offsetY: oy } : {})
          }
        : undefined

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
    if (listKind === 'variant' && !variantId) {
      return NextResponse.json(
        { error: 'Selecciona una variante o el listado base' },
        { status: 400 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(session.user.id)

    const doc = await SavedDecklist.findOne({ _id: oid, userId: uid })
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    let deckText = typeof doc.deckText === 'string' ? doc.deckText : ''
    if (listKind === 'variant' && variantId) {
      const v = Array.isArray(doc.variants)
        ? doc.variants.find(
            (x: { _id: mongoose.Types.ObjectId }) => String(x._id) === variantId
          )
        : undefined
      if (!v || typeof v.deckText !== 'string') {
        return NextResponse.json(
          { error: 'Variante no encontrada' },
          { status: 400 }
        )
      }
      deckText = v.deckText
    }

    const name = typeof doc.name === 'string' ? doc.name : 'Mazo'

    const bytes = await buildPlayPokemonDecklistPdf(
      {
        deckText,
        playerName,
        playerId,
        dateOfBirthIso,
        ageDivision
      },
      pdfOptions
    )

    const safeName = name.replace(/[^\w\-]+/g, '_').slice(0, 40)
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="play-pokemon-decklist-${safeName}.pdf"`
      }
    })
  } catch (e) {
    console.error('POST /api/decklists/[id]/play-pokemon-pdf:', e)
    return NextResponse.json(
      { error: 'No se pudo generar el PDF' },
      { status: 500 }
    )
  }
}
