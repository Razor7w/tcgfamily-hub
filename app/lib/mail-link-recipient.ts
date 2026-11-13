import mongoose from 'mongoose'
import { clean, format, validate } from 'rut.js'
import Mail from '@/models/Mails'
import User from '@/models/User'
import { rutCompareKey, type FilterFromUser } from '@/lib/mail-recipient-filter'

/** Formas en las que el mismo RUT puede estar guardado. */
export function mailRutVariants(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const variants = new Set<string>([trimmed])
  if (!validate(trimmed)) return [...variants]
  const cleaned = clean(trimmed)
  variants.add(cleaned)
  variants.add(format(cleaned))
  variants.add(format(cleaned, { dots: false }))
  return [...variants]
}

const ORPHAN_RECIPIENT = {
  $or: [{ toUserId: { $exists: false } }, { toUserId: null }]
}

/**
 * Pasa a la cuenta los correos que solo tenían su RUT de destinatario.
 * No toca envíos que ya apuntan a otro usuario.
 */
export async function linkOrphanRecipientMails(
  userId: string,
  rut: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return
  const variants = mailRutVariants(rut)
  if (variants.length === 0) return
  await Mail.updateMany(
    { toRut: { $in: variants }, ...ORPHAN_RECIPIENT },
    { $set: { toUserId: new mongoose.Types.ObjectId(userId) } }
  )
}

/**
 * Une destinatarios repetidos: el mismo RUT como cuenta y como “sin usuario”.
 * Devuelve las cuentas a las que se asignaron esos correos.
 */
export async function claimOrphanMailRecipients(
  rawToRuts: readonly string[]
): Promise<FilterFromUser[]> {
  const groups = new Map<string, string[]>()
  for (const raw of rawToRuts) {
    const key = rutCompareKey(raw)
    const trimmed = raw.trim()
    if (!key || !trimmed) continue
    const list = groups.get(key) ?? []
    list.push(trimmed)
    groups.set(key, list)
  }
  if (groups.size === 0) return []

  const variants = [
    ...new Set([...groups.values()].flat().flatMap(mailRutVariants))
  ]
  const users = await User.find({ rut: { $in: variants } })
    .select({ name: 1, rut: 1 })
    .lean<{ _id: mongoose.Types.ObjectId; name?: string; rut?: string }[]>()

  const usersByKey = new Map<string, typeof users>()
  for (const user of users) {
    const key = rutCompareKey(typeof user.rut === 'string' ? user.rut : '')
    if (!key) continue
    const list = usersByKey.get(key) ?? []
    list.push(user)
    usersByKey.set(key, list)
  }

  const claimed: FilterFromUser[] = []
  const ops: mongoose.AnyBulkWriteOperation[] = []
  for (const [key, raws] of groups) {
    const matches = usersByKey.get(key) ?? []
    if (matches.length !== 1) continue
    const user = matches[0]
    if (!user) continue
    const toRutIn = [...new Set(raws.flatMap(mailRutVariants))]
    ops.push({
      updateMany: {
        filter: { toRut: { $in: toRutIn }, ...ORPHAN_RECIPIENT },
        update: { $set: { toUserId: user._id } }
      }
    })
    claimed.push({
      id: String(user._id),
      name:
        typeof user.name === 'string' && user.name.trim()
          ? user.name
          : 'Sin nombre',
      rut: typeof user.rut === 'string' ? user.rut : ''
    })
  }

  if (ops.length > 0) {
    try {
      await Mail.bulkWrite(ops, { ordered: false })
    } catch (error) {
      console.error('No se pudieron unir correos huérfanos por RUT:', error)
    }
  }

  return claimed
}
