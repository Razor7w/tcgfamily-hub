import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requireAdminSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import User from '@/models/User'
import {
  clean as cleanRut,
  format as formatRut,
  validate as validateRut
} from 'rut.js'
import {
  countMailsRegisteredTodayBySender,
  getMailRegisterDailyLimit
} from '@/lib/mail-register-daily'

function pad3(n: number) {
  return String(n).padStart(3, '0')
}

function todayPrefix(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  return `${dd}-${mm}-${yyyy}-`
}

async function generateNextMailCode() {
  const prefix = todayPrefix()
  const last = await Mail.findOne({ code: { $regex: `^${prefix}` } })
    .sort({ code: -1 })
    .select({ code: 1 })
    .lean<{ code?: string } | null>()

  const lastCode = last?.code
  const lastSeq =
    typeof lastCode === 'string' && lastCode.startsWith(prefix)
      ? Number(lastCode.slice(prefix.length))
      : 0
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1
  return `${prefix}${pad3(nextSeq)}`
}

function isDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  return err.code === 11000
}

async function findUserByRut(input: string) {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  if (!validateRut(raw)) return null

  const cleaned = cleanRut(raw) // e.g. '12345678K' or '189726317'
  const formattedDots = formatRut(cleaned) // default dots true
  const formattedNoDots = formatRut(cleaned, { dots: false })

  // Intentos: exact match por variantes comunes
  const user =
    (await User.findOne({
      rut: { $in: [formattedDots, formattedNoDots, cleaned] }
    })) ??
    (await User.findOne({
      rut: { $regex: `^${formattedDots}$`, $options: 'i' }
    })) ??
    (await User.findOne({
      rut: { $regex: `^${formattedNoDots}$`, $options: 'i' }
    })) ??
    (await User.findOne({ rut: { $regex: `^${cleaned}$`, $options: 'i' } }))

  return user
}

// GET - listar mails
export async function GET() {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response
    await connectDB()

    const mails = await Mail.find({})
      .sort({ createdAt: -1 })
      .populate('fromUserId', 'name rut')
      .populate('toUserId', 'name rut')
      .lean()

    return NextResponse.json({ mails }, { status: 200 })
  } catch (error) {
    console.error('Error al obtener productos:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

// POST - crear mail
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    await connectDB()

    const body = await request.json()
    const {
      fromUserId,
      toUserId,
      toRut,
      isRecived,
      isRecivedInStore,
      observations,
      mode: rawMode
    } = body

    /** Admin: `all` = emisor/destinatario por ID (panel). `onlyReceptor` = como usuario (solo toRut). */
    const createMode = rawMode === 'onlyReceptor' ? 'onlyReceptor' : 'all'
    const adminFullCreate =
      session.user.role === 'admin' && createMode === 'all'

    const OBS_MAX = 2000
    const normalizeObs = (v: unknown) => {
      if (typeof v !== 'string') return ''
      return v.trim().slice(0, OBS_MAX)
    }

    const isAdmin = session.user.role === 'admin'
    const isUser = session.user.role === 'user'
    if (!isAdmin && !isUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let resolvedFromUserId: string | null = null
    let resolvedToUserId: string | null = null
    let resolvedToRut: string | null = null

    if (adminFullCreate) {
      // Admin en panel: emisor y destinatario por ID
      if (!fromUserId || !toUserId) {
        return NextResponse.json(
          { error: 'fromUserId y toUserId son requeridos' },
          { status: 400 }
        )
      }
      resolvedFromUserId = String(fromUserId)
      resolvedToUserId = String(toUserId)
    } else {
      // Usuario, o admin con mode "onlyReceptor": solo RUT del receptor (emisor = sesión)
      const sessionUserId = session.user.id as string | undefined
      if (!sessionUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      if (!toRut || typeof toRut !== 'string') {
        return NextResponse.json(
          { error: 'toRut es requerido' },
          { status: 400 }
        )
      }
      if (!validateRut(toRut)) {
        return NextResponse.json({ error: 'RUT inválido' }, { status: 400 })
      }
      const fromUser = await User.findById(sessionUserId)
      if (!fromUser) {
        return NextResponse.json(
          { error: 'Usuario emisor no encontrado' },
          { status: 404 }
        )
      }
      resolvedFromUserId = String(fromUser._id)
      resolvedToRut = formatRut(cleanRut(toRut))
      const maybeUser = await findUserByRut(toRut)
      resolvedToUserId = maybeUser ? String(maybeUser._id) : null
    }

    // Validar que fromUserId y toUserId sean diferentes
    if (resolvedToUserId && resolvedFromUserId === resolvedToUserId) {
      return NextResponse.json(
        { error: 'No puedes enviar un correo a ti mismo' },
        { status: 400 }
      )
    }

    // Validar existencia de IDs (admin) o resueltos (usuario)
    const fromUser = await User.findById(resolvedFromUserId)
    if (!fromUser) {
      return NextResponse.json(
        { error: `El usuario con ID ${resolvedFromUserId} no existe` },
        { status: 404 }
      )
    }
    let toUser: { rut?: unknown } | null = null
    if (resolvedToUserId) {
      toUser = await User.findById(resolvedToUserId)
      if (!toUser) {
        return NextResponse.json(
          { error: `El usuario con ID ${resolvedToUserId} no existe` },
          { status: 404 }
        )
      }
    }
    if (adminFullCreate) {
      resolvedToRut = String(toUser?.rut ?? '').trim()
      if (!resolvedToRut) {
        return NextResponse.json(
          { error: 'El destinatario no tiene RUT informado' },
          { status: 400 }
        )
      }
    }
    if (!resolvedToRut) {
      return NextResponse.json({ error: 'toRut es requerido' }, { status: 400 })
    }

    if (!adminFullCreate) {
      const usedToday = await countMailsRegisteredTodayBySender(
        session.user.id as string
      )
      const dailyLimit = await getMailRegisterDailyLimit()
      if (usedToday >= dailyLimit) {
        return NextResponse.json(
          {
            error: `Límite diario alcanzado: máximo ${dailyLimit} correo${dailyLimit === 1 ? '' : 's'} por día (hora Chile).`
          },
          { status: 429 }
        )
      }
    }

    // Crear el mail (con ID público correlativo por día)
    let savedMail: { _id: unknown } | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const code = await generateNextMailCode()
        const newMail = new Mail({
          code,
          fromUserId: resolvedFromUserId,
          ...(resolvedToUserId ? { toUserId: resolvedToUserId } : {}),
          toRut: resolvedToRut,
          isRecived: adminFullCreate ? (isRecived ?? false) : false,
          isRecivedInStore: adminFullCreate
            ? (isRecivedInStore ?? false)
            : false,
          observations: adminFullCreate
            ? normalizeObs(observations ?? '')
            : normalizeObs(observations)
        })
        savedMail = (await newMail.save()) as unknown as { _id: unknown }
        lastError = null
        break
      } catch (e: unknown) {
        lastError = e
        // Duplicate key (code único) => reintentar
        if (isDuplicateKeyError(e)) continue
        throw e
      }
    }
    if (!savedMail) {
      console.error('Error al crear mail (reintentos agotados):', lastError)
      return NextResponse.json(
        { error: 'Error al crear mail' },
        { status: 500 }
      )
    }

    // Retornar el mail con los datos poblados
    const populatedMail = await Mail.findById(savedMail._id)
      .populate('fromUserId', 'name rut')
      .populate('toUserId', 'name rut')
      .lean()

    return NextResponse.json({ mail: populatedMail }, { status: 201 })
  } catch (error) {
    console.error('Error al crear mail:', error)
    return NextResponse.json({ error: 'Error al crear mail' }, { status: 500 })
  }
}
