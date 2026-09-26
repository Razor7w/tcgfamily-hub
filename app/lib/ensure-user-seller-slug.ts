import type { Types } from 'mongoose'
import {
  isValidSellerSlug,
  normalizeSellerSlug,
  slugFromSellerName
} from '@/lib/seller-slug'
import User from '@/models/User'

/**
 * Asegura un sellerSlug único persistido en BD. Si ya existe, lo devuelve.
 * Si no, lo genera desde el nombre (con sufijo numérico si choca).
 */
export async function ensureUserSellerSlug(input: {
  userId: Types.ObjectId | string
  name?: string | null
}): Promise<string> {
  const user = await User.findById(input.userId).select('sellerSlug name')
  if (!user) return ''

  const existing =
    typeof user.sellerSlug === 'string'
      ? normalizeSellerSlug(user.sellerSlug)
      : ''
  if (isValidSellerSlug(existing)) return existing

  const base = slugFromSellerName(
    (typeof input.name === 'string' && input.name.trim()
      ? input.name
      : user.name) || 'vendedor'
  )

  let candidate = base
  for (let i = 0; i < 40; i++) {
    const taken = await User.exists({
      sellerSlug: candidate,
      _id: { $ne: user._id }
    })
    if (!taken) {
      await User.updateOne(
        { _id: user._id },
        { $set: { sellerSlug: candidate } }
      )
      const saved = await User.findById(user._id).select('sellerSlug').lean<{
        sellerSlug?: string
      } | null>()
      const verified = normalizeSellerSlug(saved?.sellerSlug ?? '')
      if (!isValidSellerSlug(verified)) {
        throw new Error(
          'No se pudo guardar el slug de vendedor. Reinicia el servidor de desarrollo e inténtalo de nuevo.'
        )
      }
      return verified
    }
    candidate = normalizeSellerSlug(`${base}-${i + 2}`)
    if (!isValidSellerSlug(candidate)) {
      candidate = normalizeSellerSlug(`vendedor-${user._id.toString().slice(-6)}`)
    }
  }

  candidate = normalizeSellerSlug(`v-${user._id.toString().slice(-8)}`)
  await User.updateOne({ _id: user._id }, { $set: { sellerSlug: candidate } })
  const saved = await User.findById(user._id).select('sellerSlug').lean<{
    sellerSlug?: string
  } | null>()
  const verified = normalizeSellerSlug(saved?.sellerSlug ?? '')
  if (!isValidSellerSlug(verified)) {
    throw new Error(
      'No se pudo guardar el slug de vendedor. Reinicia el servidor de desarrollo e inténtalo de nuevo.'
    )
  }
  return verified
}
