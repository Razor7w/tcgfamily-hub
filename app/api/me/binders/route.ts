import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import {
  CARD_BINDER_DESCRIPTION_MAX,
  CARD_BINDER_NAME_MAX
} from '@/lib/card-binder-constants'
import {
  isValidCardBinderSlug,
  normalizeCardBinderSlug,
  slugFromCardBinderName
} from '@/lib/card-binder-slug'
import { toCardBinderDTO } from '@/lib/card-single-dto'
import { binderItemCountsByUser } from '@/lib/card-binder-counts'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const userOid = new mongoose.Types.ObjectId(session.user.id)
    await connectDB()

    const binders = await CardBinder.find({ userId: userOid })
      .sort({ updatedAt: -1 })
      .lean()

    const countMap = await binderItemCountsByUser(userOid)

    const list = binders.map(b => {
      const c = countMap.get(String(b._id)) ?? { total: 0, published: 0 }
      return toCardBinderDTO(
        b as unknown as Parameters<typeof toCardBinderDTO>[0],
        c
      )
    })

    return NextResponse.json({ binders: list })
  } catch (e) {
    console.error('GET /api/me/binders:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las carpetas' },
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

    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown
      slug?: unknown
      description?: unknown
    }
    const name =
      typeof body.name === 'string'
        ? body.name.trim().slice(0, CARD_BINDER_NAME_MAX)
        : ''
    if (name.length < 1) {
      return NextResponse.json(
        { error: 'El nombre de la carpeta es obligatorio' },
        { status: 400 }
      )
    }

    const slugRaw =
      typeof body.slug === 'string' && body.slug.trim()
        ? body.slug
        : slugFromCardBinderName(name)
    const slug = normalizeCardBinderSlug(slugRaw)
    if (!isValidCardBinderSlug(slug)) {
      return NextResponse.json(
        {
          error:
            'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones (ej. full-art).'
        },
        { status: 400 }
      )
    }

    const description =
      typeof body.description === 'string'
        ? body.description.trim().slice(0, CARD_BINDER_DESCRIPTION_MAX)
        : ''

    await connectDB()

    const taken = await CardBinder.exists({ slug })
    if (taken) {
      return NextResponse.json(
        { error: 'Ese slug ya está en uso. Elige otro para tu link público.' },
        { status: 409 }
      )
    }

    try {
      const userOid = new mongoose.Types.ObjectId(session.user.id)
      let doc = await CardBinder.create({
        userId: userOid,
        name,
        slug,
        description
      })

      // Si el schema en memoria estaba viejo, el create puede omitir slug: forzar.
      const savedSlug = String(doc.slug ?? '').trim()
      if (savedSlug !== slug) {
        await CardBinder.updateOne(
          { _id: doc._id },
          { $set: { slug, name, description } }
        )
        const reloaded = await CardBinder.findById(doc._id)
        if (reloaded) doc = reloaded
      }

      const lean = doc.toObject() as unknown as Parameters<
        typeof toCardBinderDTO
      >[0]
      if (!String(lean.slug ?? '').trim()) {
        return NextResponse.json(
          {
            error:
              'No se pudo guardar el slug. Reinicia el servidor de desarrollo e intenta de nuevo.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { binder: toCardBinderDTO(lean) },
        { status: 201 }
      )
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: number }).code
          : undefined
      if (code === 11000) {
        return NextResponse.json(
          {
            error: 'Ese slug ya está en uso. Elige otro para tu link público.'
          },
          { status: 409 }
        )
      }
      throw e
    }
  } catch (e) {
    console.error('POST /api/me/binders:', e)
    return NextResponse.json(
      { error: 'No se pudo crear la carpeta' },
      { status: 500 }
    )
  }
}
