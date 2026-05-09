import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'
import { assertCanManageStoreMutation } from '@/lib/store-admin-access'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import { r2BucketName, r2Client, r2PublicBaseUrl } from '@/lib/r2'

const presignLimiter = createSlidingWindowLimiter({
  max: 30,
  windowMs: 60 * 1000
})

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

function safeExtFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (ct === 'image/jpeg') return 'jpg'
  if (ct === 'image/png') return 'png'
  if (ct === 'image/webp') return 'webp'
  if (ct === 'image/gif') return 'gif'
  return ''
}

function safeFolder(folder: unknown): 'uploads' | 'Avatar' | 'store-branding' {
  if (typeof folder !== 'string') return 'uploads'
  const f = folder.trim()
  if (f === 'Avatar') return 'Avatar'
  if (f === 'store-branding') return 'store-branding'
  return 'uploads'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ip = clientIp(request)
    if (presignLimiter(`r2-presign:${session.user.id}:${ip}`)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Prueba más tarde.' },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { filename, contentType, folder, storeId } = body as Record<
      string,
      unknown
    >
    const filenameStr = typeof filename === 'string' ? filename.trim() : ''
    const contentTypeStr =
      typeof contentType === 'string' ? contentType.trim() : ''

    if (!filenameStr || !contentTypeStr) {
      return NextResponse.json(
        { error: 'Falta filename o contentType.' },
        { status: 400 }
      )
    }

    if (!contentTypeStr.toLowerCase().startsWith('image/')) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes.' },
        { status: 400 }
      )
    }

    const ext = safeExtFromContentType(contentTypeStr) || 'bin'
    const baseFolder = safeFolder(folder)
    let key: string

    if (baseFolder === 'Avatar') {
      key = `Avatar/${session.user.id}.${ext}`
    } else if (baseFolder === 'store-branding') {
      const storeIdStr = typeof storeId === 'string' ? storeId.trim() : ''
      if (!mongoose.Types.ObjectId.isValid(storeIdStr)) {
        return NextResponse.json(
          { error: 'Falta storeId válido para logo de tienda.' },
          { status: 400 }
        )
      }
      const gate = await requireStoreOwnerSession()
      if (!gate.ok) return gate.response
      const can = await assertCanManageStoreMutation(
        gate.session.user!.id,
        new mongoose.Types.ObjectId(storeIdStr)
      )
      if (!can) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      key = `store-branding/${storeIdStr}/${crypto.randomUUID()}.${ext}`
    } else {
      key = `uploads/${session.user.id}/${crypto.randomUUID()}.${ext}`
    }

    const bucket = r2BucketName()
    const s3 = r2Client()

    // Sin CacheControl en el objeto firmado: evita 403 en PUT desde el navegador
    // con R2 cuando el header firmado no coincide con lo que envía el cliente.
    // Cache del avatar: reglas en la CDN (p. ej. /Avatar/*).
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentTypeStr
      }),
      { expiresIn: 60 }
    )

    const publicUrl = `${r2PublicBaseUrl()}/${key}`

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl
    })
  } catch (e) {
    console.error('POST /api/r2/presign:', e)
    return NextResponse.json(
      { error: 'No se pudo generar URL de subida.' },
      { status: 500 }
    )
  }
}
