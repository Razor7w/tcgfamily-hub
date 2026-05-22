import { randomInt } from 'crypto'
import { isPasswordStrengthSatisfied } from '@/lib/password-rules'

const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SPECIAL = '!@#$%&*'
const ALL = LOWER + UPPER + DIGITS + SPECIAL

/** Contraseña temporal aleatoria que cumple las reglas del sistema (12–16 chars). */
export function generateTemporaryPassword(length = 14): string {
  const size = Math.max(12, Math.min(16, length))
  const chars = [
    LOWER[randomInt(LOWER.length)]!,
    UPPER[randomInt(UPPER.length)]!,
    DIGITS[randomInt(DIGITS.length)]!,
    SPECIAL[randomInt(SPECIAL.length)]!
  ]
  while (chars.length < size) {
    chars.push(ALL[randomInt(ALL.length)]!)
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }
  const result = chars.join('')
  if (!isPasswordStrengthSatisfied(result)) {
    return generateTemporaryPassword(size)
  }
  return result
}
