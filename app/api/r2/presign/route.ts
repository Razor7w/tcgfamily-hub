import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'
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

function safeFolder(folder: unknown): 'uploads' | 'Avatar' {
  if (typeof folder !== 'string') return 'uploads'
  const f = folder.trim()
  if (f === 'Avatar') return 'Avatar'
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

    const { filename, contentType, folder } = body as Record<string, unknown>
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
    const key =
      baseFolder === 'Avatar'
        ? `Avatar/${session.user.id}.${ext}`
        : `uploads/${session.user.id}/${crypto.randomUUID()}.${ext}`

    const bucket = r2BucketName()
    const s3 = r2Client()

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentTypeStr,
        CacheControl: 'public, max-age=31536000, immutable'
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
