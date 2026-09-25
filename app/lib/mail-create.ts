import mongoose from 'mongoose'
import Mail from '@/models/Mails'
import User from '@/models/User'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import {
  clean as cleanRut,
  format as formatRut,
  validate as validateRut
} from 'rut.js'

function pad3(n: number) {
  return String(n).padStart(3, '0')
}

function todayPrefix(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  return `${dd}-${mm}-${yyyy}-`
}

export async function generateNextMailCode(
  activeStoreOid: mongoose.Types.ObjectId,
  primaryStoreOid: mongoose.Types.ObjectId | null
) {
  const prefix = todayPrefix()
  const scope = mongoFilterByStore(activeStoreOid, primaryStoreOid) as Record<
    string,
    unknown
  >
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

export function isMailDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  return err.code === 11000
}

export async function findUserByRut(input: string) {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  if (!validateRut(raw)) return null

  const cleaned = cleanRut(raw)
  const formattedDots = formatRut(cleaned)
  const formattedNoDots = formatRut(cleaned, { dots: false })

  const exact = await User.findOne({
    rut: { $in: [formattedDots, formattedNoDots, cleaned] }
  })
  if (exact) return exact

  const [byDots, byNoDots, byCleaned] = await Promise.all([
    User.findOne({
      rut: { $regex: `^${formattedDots}$`, $options: 'i' }
    }),
    User.findOne({
      rut: { $regex: `^${formattedNoDots}$`, $options: 'i' }
    }),
    User.findOne({
      rut: { $regex: `^${cleaned}$`, $options: 'i' }
    })
  ])
  return byDots ?? byNoDots ?? byCleaned ?? null
}

export function formatMailRut(input: string): string {
  return formatRut(cleanRut(input))
}
