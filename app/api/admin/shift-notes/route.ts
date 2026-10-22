import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireTcgfamilyStaffSession } from '@/lib/shift-note-access'
import { isShiftNoteImageUrl } from '@/lib/shift-note-image'
import {
  isValidShiftNoteBody,
  normalizeShiftNoteBody,
  SHIFT_NOTE_DONE_LIMIT,
  SHIFT_NOTE_OPEN_LIMIT,
  type ShiftNoteDto,
  type ShiftNoteStatus
} from '@/lib/shift-note'
import ShiftNote from '@/models/ShiftNote'
import User from '@/models/User'

export const runtime = 'nodejs'

type NoteLean = {
  _id: mongoose.Types.ObjectId
  body: string
  imageUrl?: string | null
  status: ShiftNoteStatus
  createdAt?: Date
  createdBy: mongoose.Types.ObjectId
  resolvedAt?: Date | null
  resolvedBy?: mongoose.Types.ObjectId | null
}

type UserLean = {
  _id: mongoose.Types.ObjectId
  name?: string
  email?: string
}

function displayName(user: UserLean | undefined): string {
  const name = typeof user?.name === 'string' ? user.name.trim() : ''
  if (name) return name
  const email = typeof user?.email === 'string' ? user.email.trim() : ''
  if (email) return email
  return 'Staff'
}

function toDto(doc: NoteLean, users: Map<string, UserLean>): ShiftNoteDto {
  const author = users.get(doc.createdBy.toString())
  const resolverId = doc.resolvedBy ? doc.resolvedBy.toString() : ''
  const resolver = resolverId ? users.get(resolverId) : undefined
  return {
    id: doc._id.toString(),
    body: doc.body,
    imageUrl:
      typeof doc.imageUrl === 'string' && doc.imageUrl ? doc.imageUrl : null,
    status: doc.status === 'done' ? 'done' : 'open',
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date().toISOString(),
    authorId: doc.createdBy.toString(),
    authorName: displayName(author),
    resolvedAt:
      doc.resolvedAt instanceof Date ? doc.resolvedAt.toISOString() : null,
    resolvedByName: resolver ? displayName(resolver) : null
  }
}

async function loadUsers(ids: mongoose.Types.ObjectId[]) {
  const unique = [...new Set(ids.map(id => id.toString()))].map(
    id => new mongoose.Types.ObjectId(id)
  )
  if (unique.length === 0) return new Map<string, UserLean>()
  const rows = await User.find({ _id: { $in: unique } })
    .select('name email')
    .lean<UserLean[]>()
  return new Map(rows.map(row => [row._id.toString(), row]))
}

export async function GET() {
  try {
    const gate = await requireTcgfamilyStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const storeId = gate.activeStoreOid
    const [openDocs, doneDocs] = await Promise.all([
      ShiftNote.find({ storeId, status: 'open' })
        .sort({ createdAt: -1 })
        .limit(SHIFT_NOTE_OPEN_LIMIT)
        .lean<NoteLean[]>(),
      ShiftNote.find({ storeId, status: 'done' })
        .sort({ createdAt: -1 })
        .limit(SHIFT_NOTE_DONE_LIMIT)
        .lean<NoteLean[]>()
    ])

    const ids = [...openDocs, ...doneDocs].flatMap(doc => {
      const list = [doc.createdBy]
      if (doc.resolvedBy) list.push(doc.resolvedBy)
      return list
    })
    const users = await loadUsers(ids)

    return NextResponse.json({
      open: openDocs.map(doc => toDto(doc, users)),
      done: doneDocs.map(doc => toDto(doc, users))
    })
  } catch (error) {
    console.error('GET /api/admin/shift-notes:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar las notas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireTcgfamilyStaffSession()
    if (!gate.ok) return gate.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const text = normalizeShiftNoteBody(record.body)
    if (!isValidShiftNoteBody(text)) {
      return NextResponse.json(
        { error: 'Escribe una nota de hasta 2000 caracteres.' },
        { status: 400 }
      )
    }

    const imageRaw =
      typeof record.imageUrl === 'string' ? record.imageUrl.trim() : ''
    const userId = gate.session.user.id
    if (imageRaw && !isShiftNoteImageUrl(imageRaw, userId)) {
      return NextResponse.json(
        { error: 'La imagen no es válida.' },
        { status: 400 }
      )
    }

    await connectDB()
    const created = await ShiftNote.create({
      storeId: gate.activeStoreOid,
      body: text,
      imageUrl: imageRaw || null,
      status: 'open',
      createdBy: new mongoose.Types.ObjectId(userId)
    })

    const users = await loadUsers([created.createdBy])
    const lean: NoteLean = {
      _id: created._id,
      body: created.body,
      imageUrl: created.imageUrl,
      status: 'open',
      createdAt: created.createdAt,
      createdBy: created.createdBy
    }

    return NextResponse.json({ note: toDto(lean, users) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/shift-notes:', error)
    return NextResponse.json(
      { error: 'No se pudo guardar la nota' },
      { status: 500 }
    )
  }
}
