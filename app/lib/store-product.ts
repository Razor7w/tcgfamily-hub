export const STORE_PRODUCT_NAME_MAX = 160
export const STORE_PRODUCT_BARCODE_MAX = 64
export const STORE_PRODUCT_PRICE_CLP_MAX = 99_999_999
export const STORE_PRODUCT_PAGE_SIZE = 10

export function normalizeStoreProductBarcode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\s+/g, '').slice(0, STORE_PRODUCT_BARCODE_MAX)
}

export function normalizeStoreProductName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, STORE_PRODUCT_NAME_MAX)
}

export function parseStoreProductPriceClp(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.round(raw)
  }
  if (typeof raw !== 'string') return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

export function isValidStoreProductBarcode(barcode: string): boolean {
  return barcode.length >= 3 && barcode.length <= STORE_PRODUCT_BARCODE_MAX
}

export function isValidStoreProductPriceClp(priceClp: number): boolean {
  return (
    Number.isFinite(priceClp) &&
    priceClp >= 0 &&
    priceClp <= STORE_PRODUCT_PRICE_CLP_MAX
  )
}

export function formatStoreProductPriceClp(priceClp: number): string {
  return `$${priceClp.toLocaleString('es-CL')}`
}

export type StoreProductDto = {
  id: string
  barcode: string
  name: string
  priceClp: number
  updatedAt: string
}
