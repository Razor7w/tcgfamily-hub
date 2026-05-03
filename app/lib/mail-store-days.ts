import { deepOrange } from '@mui/material/colors'
import type { SxProps, Theme } from '@mui/material/styles'

export type ElapsedBucketFilter = 'all' | 'green' | 'yellow' | 'orange' | 'red'

/** Días completos desde `startIso` hasta `until` (por defecto ahora). */
export function getElapsedCalendarDaysSince(
  startIso: string | Date,
  until: number = Date.now()
): number {
  const t =
    typeof startIso === 'string'
      ? new Date(startIso).getTime()
      : startIso instanceof Date
        ? startIso.getTime()
        : NaN
  if (!Number.isFinite(t)) return 0
  return Math.floor((until - t) / (24 * 60 * 60 * 1000))
}

/** Colores solicitados para antigüedad en tienda (pendiente de retiro). */
export type StoreWaitTone = 'green' | 'yellow' | 'orange' | 'red'

export function toneForStoreWaitDays(days: number): StoreWaitTone {
  if (days <= 7) return 'green'
  if (days <= 14) return 'yellow'
  if (days <= 30) return 'orange'
  return 'red'
}

/** Días en tienda esperando retiro desde `receivedInStoreAt`; sin fecha → null. */
export function getMailStoreWaitDays(mail: {
  isRecived?: boolean
  isRecivedInStore?: boolean
  receivedInStoreAt?: string | Date | null
}): number | null {
  if (!mail.isRecivedInStore || mail.isRecived) return null
  if (mail.receivedInStoreAt == null) return null
  return getElapsedCalendarDaysSince(mail.receivedInStoreAt)
}

export function matchesStoreWaitBucket(
  days: number,
  bucket: Exclude<ElapsedBucketFilter, 'all'>
): boolean {
  return toneForStoreWaitDays(days) === bucket
}

export function storeWaitChipSx(
  tone: StoreWaitTone
): SxProps<Theme> | undefined {
  if (tone === 'orange') {
    return {
      bgcolor: deepOrange[700],
      color: '#fff',
      fontWeight: 600 as const,
      '& .MuiChip-label': { px: 1 }
    }
  }
  return undefined
}

export function storeWaitChipColor(
  tone: StoreWaitTone
): 'success' | 'warning' | 'error' | undefined {
  if (tone === 'green') return 'success'
  if (tone === 'yellow') return 'warning'
  if (tone === 'red') return 'error'
  return undefined
}

export function storeWaitChipProps(days: number): {
  label: string
  color?: 'success' | 'warning' | 'error'
  sx?: SxProps<Theme>
} {
  const tone = toneForStoreWaitDays(days)
  const color = storeWaitChipColor(tone)
  const sx = storeWaitChipSx(tone)
  return {
    label: days === 1 ? '1 día' : `${days} días`,
    ...(color !== undefined ? { color } : {}),
    ...(sx !== undefined ? { sx } : {})
  }
}
