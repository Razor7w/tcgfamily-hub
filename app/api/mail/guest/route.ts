import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import Store from '@/models/Store'
import {
  validate as validateRut
} from 'rut.js'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'
import {
  generateNextMailCode,
  findUserByRut,
  formatMailRut,
  isMailDuplicateKeyError
} from '@/lib/mail-create'
import { normalizeMailContactPhone } from '@/lib/mail-contact-phone'
import { resolveMailBranchIdForStore } from '@/lib/store-branch'
import { countGuestMailsRegisteredTodayByFromRutForStore } from '@/lib/mail-register-daily'
import {
  GUEST_MAIL_REGISTER_DAILY_LIMIT,
  GUEST_MAIL_SESSION_LIMIT
} from '@/lib/mail-register-constants'
import {
  bumpGuestMailSessionCookie,
  guestMailSessionSnapshot
} from '@/lib/guest-mail-session'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import { rutCompareKey } from '@/lib/mail-recipient-filter'

export const runtime = 'nodejs'

const guestIpLimiter = createSlidingWindowLimiter({
  max: 30,
  windowMs: 15 * 60 * 1000
})

function getClientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

const OBS_MAX = 2000

function normalizeObs(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, OBS_MAX)
}

/**
 * POST /api/mail/guest — registrar correo sin sesión.
 * Body: { fromRut, toRut, storeId, branchId?, contactPhone?, observations? }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (guestIpLimiter(`guest-mail:${ip}`)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
        { status: 429 }
      )
    }

    const sessionSnap = guestMailSessionSnapshot(request)
    if (sessionSnap.sessionRemaining <= 0) {
      return NextResponse.json(
        {
          error: `Límite de sesión alcanzado: máximo ${GUEST_MAIL_SESSION_LIMIT} correos como invitado en este navegador. Cierra el navegador o inicia sesión para continuar.`,
          ...sessionSnap
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const fromRutRaw =
      typeof body?.fromRut === 'string' ? body.fromRut.trim() : ''
    const toRutRaw = typeof body?.toRut === 'string' ? body.toRut.trim() : ''
    const storeIdRaw =
      typeof body?.storeId === 'string' ? body.storeId.trim() : ''

    if (!fromRutRaw || !validateRut(fromRutRaw)) {
      return NextResponse.json(
        { error: 'RUT del emisor inválido' },
        { status: 400 }
      )
    }
    if (!toRutRaw || !validateRut(toRutRaw)) {
      return NextResponse.json(
        { error: 'RUT del receptor inválido' },
        { status: 400 }
      )
    }
    if (rutCompareKey(fromRutRaw) === rutCompareKey(toRutRaw)) {
      return NextResponse.json(
        { error: 'No puedes enviar un correo a tu mismo RUT' },
        { status: 400 }
      )
    }
    if (!storeIdRaw || !mongoose.Types.ObjectId.isValid(storeIdRaw)) {
      return NextResponse.json({ error: 'Tienda inválida' }, { status: 400 })
    }

    await connectDB()
    const storeOid = new mongoose.Types.ObjectId(storeIdRaw)
    const store = await Store.findOne({ _id: storeOid, isActive: true })
      .select('name slug')
      .lean<{ name?: string; slug?: string } | null>()
    if (!store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada o inactiva' },
        { status: 404 }
      )
    }

    const branchGate = await resolveMailBranchIdForStore({
      storeOid,
      branchIdRaw: body?.branchId
    })
    if (!branchGate.ok) {
      return NextResponse.json(
        { error: branchGate.error },
        { status: branchGate.status }
      )
    }

    const primary = await memoPrimaryTcgfamilyStoreObjectId()
    const fromRut = formatMailRut(fromRutRaw)
    const toRut = formatMailRut(toRutRaw)

    const usedToday = await countGuestMailsRegisteredTodayByFromRutForStore(
      fromRut,
      storeOid,
      primary
    )
    if (usedToday >= GUEST_MAIL_REGISTER_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `Límite de invitado alcanzado: máximo ${GUEST_MAIL_REGISTER_DAILY_LIMIT} correos por día (hora Chile) con este RUT en esta tienda.`
        },
        { status: 429 }
      )
    }

    const [fromUser, toUser] = await Promise.all([
      findUserByRut(fromRutRaw),
      findUserByRut(toRutRaw)
    ])

    let saved: {
      _id: mongoose.Types.ObjectId
      code: string
    } | null = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const code = await generateNextMailCode(storeOid, primary)
        const doc = new Mail({
          storeId: storeOid,
          ...(branchGate.branchOid ? { branchId: branchGate.branchOid } : {}),
          code,
          ...(fromUser ? { fromUserId: fromUser._id } : {}),
          fromRut,
          isGuest: true,
          ...(toUser ? { toUserId: toUser._id } : {}),
          toRut,
          isRecived: false,
          isRecivedInStore: false,
          observations: normalizeObs(body?.observations),
          contactPhone: normalizeMailContactPhone(body?.contactPhone)
        })
        const created = await doc.save()
        saved = {
          _id: created._id as mongoose.Types.ObjectId,
          code: created.code
        }
        lastError = null
        break
      } catch (e) {
        lastError = e
        if (isMailDuplicateKeyError(e)) continue
        throw e
      }
    }

    if (!saved) {
      console.error('guest mail create failed:', lastError)
      return NextResponse.json(
        { error: 'No se pudo registrar el correo' },
        { status: 500 }
      )
    }

    const remaining = Math.max(
      0,
      GUEST_MAIL_REGISTER_DAILY_LIMIT - (usedToday + 1)
    )

    const nextSessionUsed = Math.min(
      sessionSnap.sessionUsed + 1,
      GUEST_MAIL_SESSION_LIMIT
    )
    const sessionPayload = {
      sessionUsed: nextSessionUsed,
      sessionLimit: GUEST_MAIL_SESSION_LIMIT,
      sessionRemaining: Math.max(0, GUEST_MAIL_SESSION_LIMIT - nextSessionUsed)
    }

    const res = NextResponse.json(
      {
        ok: true,
        mail: {
          id: saved._id.toString(),
          code: saved.code,
          fromRut,
          toRut,
          storeId: storeOid.toString(),
          storeName: typeof store.name === 'string' ? store.name : '',
          linkedToAccount: Boolean(fromUser),
          remainingToday: remaining,
          limit: GUEST_MAIL_REGISTER_DAILY_LIMIT,
          ...sessionPayload
        },
        ...sessionPayload
      },
      { status: 201 }
    )
    bumpGuestMailSessionCookie(request, res)
    return res
  } catch (e) {
    console.error('POST /api/mail/guest:', e)
    return NextResponse.json(
      { error: 'No se pudo registrar el correo' },
      { status: 500 }
    )
  }
}
