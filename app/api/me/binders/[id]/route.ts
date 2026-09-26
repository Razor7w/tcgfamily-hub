import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import {
  CARD_BINDER_DESCRIPTION_MAX,
  CARD_BINDER_NAME_MAX
} from '@/lib/card-binder-constants'
import {
  isValidCardBinderSlug,
  normalizeCardBinderSlug
} from '@/lib/card-binder-slug'
import { toCardBinderDTO } from '@/lib/card-single-dto'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardSingle from '@/models/CardSingle'
import CardSingleInterest from '@/models/CardSingleInterest'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

async function loadOwnedBinder(userId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  return CardBinder.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId)
  })
}

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    await connectDB()
    const doc = await loadOwnedBinder(session.user.id, id)
    if (!doc) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      )
    }

    const binderOid = doc._id as mongoose.Types.ObjectId
    const [total, published] = await Promise.all([
      CardSingle.countDocuments({ binderId: binderOid }),
      CardSingle.countDocuments({ binderId: binderOid, published: true })
    ])

    return NextResponse.json({
      binder: toCardBinderDTO(
        doc.toObject() as unknown as Parameters<typeof toCardBinderDTO>[0],
        {
          total,
          published
        }
      )
    })
  } catch (e) {
    console.error('GET /api/me/binders/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar la carpeta' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Carpeta inválida' }, { status: 400 })
    }

    await connectDB()
    const binderOid = new mongoose.Types.ObjectId(id)
    const userOid = new mongoose.Types.ObjectId(session.user.id)

    const existing = await CardBinder.findOne({
      _id: binderOid,
      userId: userOid
    }).lean<{
      _id: mongoose.Types.ObjectId
      name: string
      slug?: string
      description?: string
    } | null>()

    if (!existing) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown
      slug?: unknown
      description?: unknown
    }

    const $set: Record<string, string> = {}

    if (typeof body.name === 'string') {
      const name = body.name.trim().slice(0, CARD_BINDER_NAME_MAX)
      if (name.length < 1) {
        return NextResponse.json(
          { error: 'El nombre no puede quedar vacío' },
          { status: 400 }
        )
      }
      $set.name = name
    }
    if (typeof body.description === 'string') {
      $set.description = body.description
        .trim()
        .slice(0, CARD_BINDER_DESCRIPTION_MAX)
    }
    if (typeof body.slug === 'string') {
      const slug = normalizeCardBinderSlug(body.slug)
      if (!isValidCardBinderSlug(slug)) {
        return NextResponse.json(
          {
            error:
              'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones.'
          },
          { status: 400 }
        )
      }
      const currentSlug = String(existing.slug ?? '').trim()
      if (slug !== currentSlug) {
        const taken = await CardBinder.exists({
          slug,
          _id: { $ne: binderOid }
        })
        if (taken) {
          return NextResponse.json(
            { error: 'Ese slug ya está en uso.' },
            { status: 409 }
          )
        }
        $set.slug = slug
      } else if (!currentSlug) {
        $set.slug = slug
      }
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json(
        { error: 'No hay cambios para guardar.' },
        { status: 400 }
      )
    }

    try {
      const updated = await CardBinder.findOneAndUpdate(
        { _id: binderOid, userId: userOid },
        { $set },
        { new: true, runValidators: true }
      )
      if (!updated) {
        return NextResponse.json(
          { error: 'Carpeta no encontrada' },
          { status: 404 }
        )
      }

      // Cinturón: si slug venía en el body y quedó vacío, forzar en colección.
      if ($set.slug && !String(updated.slug ?? '').trim()) {
        await CardBinder.collection.updateOne(
          { _id: binderOid },
          { $set: { slug: $set.slug } }
        )
        updated.slug = $set.slug
      }

      return NextResponse.json({
        binder: toCardBinderDTO(
          updated.toObject() as unknown as Parameters<typeof toCardBinderDTO>[0]
        )
      })
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: number }).code
          : undefined
      if (code === 11000) {
        return NextResponse.json(
          { error: 'Ese slug ya está en uso.' },
          { status: 409 }
        )
      }
      throw e
    }
  } catch (e) {
    console.error('PATCH /api/me/binders/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar la carpeta' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await context.params
    await connectDB()
    const doc = await loadOwnedBinder(session.user.id, id)
    if (!doc) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      )
    }

    const binderOid = doc._id as mongoose.Types.ObjectId
    const singleIds = await CardSingle.find({ binderId: binderOid })
      .select('_id')
      .lean()
    const ids = singleIds.map(s => s._id)
    if (ids.length > 0) {
      await CardSingleInterest.deleteMany({ singleId: { $in: ids } })
      await CardSingle.deleteMany({ binderId: binderOid })
    }
    await CardBinder.deleteOne({ _id: binderOid })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/me/binders/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo eliminar la carpeta' },
      { status: 500 }
    )
  }
}
