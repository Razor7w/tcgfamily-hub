import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import {
  requireSessionUserWithActiveStore,
  requireStoreStaffSession
} from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import User from '@/models/User'
import {
  clean as cleanRut,
  format as formatRut,
  validate as validateRut
} from 'rut.js'
import {
  countMailsRegisteredTodayBySenderForStore,
  getMailRegisterDailyLimitForStore
} from '@/lib/mail-register-daily'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'

function pad3(n: number) {
  return String(n).padStart(3, '0')
}

function todayPrefix(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  return `${dd}-${mm}-${yyyy}-`
}

async function generateNextMailCode(
  activeStoreOid: mongoose.Types.ObjectId,
  primaryStoreOid: mongoose.Types.ObjectId | null
) {
  const prefix = todayPrefix()
  const scope = mongoFilterByStore(activeStoreOid, primaryStoreOid) as Record<
    string,
    unknown
  >
  // Regex con prefijo fijo por día (no usar $gte/$lt sobre DD-MM-YYYY: el orden lexicográfico
  // no coincide con el orden de fechas entre meses/años).
  const last = await Mail.findOne({
    code: { $regex: `^${prefix}` },
    ...scope
  })
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

  // Índice { rut: 1 }: una sola búsqueda por variantes exactas (caso habitual)
  const exact = await User.findOne({
    rut: { $in: [formattedDots, formattedNoDots, cleaned] }
  })
  if (exact) return exact

  // Fallbacks (formatos legacy): en paralelo para no encadenar 3 round-trips
  const [byDots, byNoDots, byCleaned] = await Promise.all([
    User.findOne({
      rut: { $regex: `^${formattedDots}$`, $options: 'i' }
    }),
    User.findOne({
      rut: { $regex: `^${formattedNoDots}$`, $options: 'i' }
    }),
    User.findOne({ rut: { $regex: `^${cleaned}$`, $options: 'i' } })
  ])
  return byDots ?? byNoDots ?? byCleaned
}

// GET - listar mails
export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response
    await connectDB()

    const scope = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>

    // Datos legacy: anclar fecha de ingreso usando updatedAt cuando falte.
    await Mail.updateMany(
      {
        $and: [
          scope,
          {
            isRecivedInStore: true,
            $or: [
              { receivedInStoreAt: { $exists: false } },
              { receivedInStoreAt: null }
            ]
          }
        ]
      },
      [{ $set: { receivedInStoreAt: '$updatedAt' } }]
    ).catch(() => undefined)

    const mails = await Mail.find({ ...scope })
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

    let activeStoreOid: mongoose.Types.ObjectId
    let primaryStoreOid: mongoose.Types.ObjectId | null
    let adminFullCreate = false

    if (createMode === 'all') {
      const staffGate = await requireStoreStaffSession()
      if (!staffGate.ok) return staffGate.response
      activeStoreOid = staffGate.activeStoreOid
      primaryStoreOid = staffGate.primaryStoreOid ?? null
      adminFullCreate = true
    } else {
      const uGate = await requireSessionUserWithActiveStore()
      if (!uGate.ok) return uGate.response
      activeStoreOid = uGate.activeStoreOid
      await connectDB()
      primaryStoreOid = await memoPrimaryTcgfamilyStoreObjectId()
    }

    await connectDB()

    const OBS_MAX = 2000
    const normalizeObs = (v: unknown) => {
      if (typeof v !== 'string') return ''
      return v.trim().slice(0, OBS_MAX)
    }

    let resolvedFromUserId: string | null = null
    let resolvedToUserId: string | null = null
    let resolvedToRut: string | null = null
    /** Evita un segundo `findById` cuando el emisor ya se cargó desde la sesión. */
    let cachedFromUser: InstanceType<typeof User> | null = null
    /** Evita `findById` del receptor cuando ya se resolvió con `findUserByRut`. */
    let cachedToUserFromRut: InstanceType<typeof User> | null = null

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
      cachedFromUser = fromUser
      resolvedFromUserId = String(fromUser._id)
      resolvedToRut = formatRut(cleanRut(toRut))
      const maybeUser = await findUserByRut(toRut)
      cachedToUserFromRut = maybeUser
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
    const fromUser =
      cachedFromUser &&
      String(cachedFromUser._id) === String(resolvedFromUserId)
        ? cachedFromUser
        : await User.findById(resolvedFromUserId)
    if (!fromUser) {
      return NextResponse.json(
        { error: `El usuario con ID ${resolvedFromUserId} no existe` },
        { status: 404 }
      )
    }
    let toUser: { rut?: unknown } | null = null
    if (resolvedToUserId) {
      toUser =
        cachedToUserFromRut &&
        String(cachedToUserFromRut._id) === String(resolvedToUserId)
          ? cachedToUserFromRut
          : await User.findById(resolvedToUserId)
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
      const [usedToday, dailyLimit] = await Promise.all([
        countMailsRegisteredTodayBySenderForStore(
          session.user.id as string,
          activeStoreOid,
          primaryStoreOid
        ),
        getMailRegisterDailyLimitForStore(activeStoreOid.toString())
      ])
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
        const code = await generateNextMailCode(activeStoreOid, primaryStoreOid)
        const adminInStore =
          Boolean(adminFullCreate) && Boolean(isRecivedInStore ?? false)
        const newMail = new Mail({
          storeId: activeStoreOid,
          code,
          fromUserId: resolvedFromUserId,
          ...(resolvedToUserId ? { toUserId: resolvedToUserId } : {}),
          toRut: resolvedToRut,
          isRecived: adminFullCreate ? (isRecived ?? false) : false,
          isRecivedInStore: adminFullCreate
            ? (isRecivedInStore ?? false)
            : false,
          ...(adminInStore ? { receivedInStoreAt: new Date() } : {}),
          observations: adminFullCreate
            ? normalizeObs(observations ?? '')
            : normalizeObs(observations)
        })
        savedMail = (await newMail.save()) as unknown as { _id: unknown }
        lastError = null
        break
      } catch (e: unknown) {
        lastError = e
        // Carrera entre requests o índices viejos: reintentar
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
