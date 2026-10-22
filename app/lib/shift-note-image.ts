import { r2PublicBaseUrl } from '@/lib/r2'

const IMAGE_KEY =
  /^uploads\/([a-f0-9]{24})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i

/** URL pública de R2 subida por este usuario a `uploads/{userId}/`. */
export function isShiftNoteImageUrl(url: string, userId: string): boolean {
  const base = r2PublicBaseUrl()
  if (!url.startsWith(`${base}/`)) return false
  const key = url.slice(base.length + 1)
  const match = IMAGE_KEY.exec(key)
  return Boolean(match && match[1] === userId)
}
