/** Clave sessionStorage: contraseña usada al login (solo para prellenar el modal de cambio obligatorio). */
export const TEMP_PASSWORD_HINT_KEY = 'tcgfamily.tempPasswordHint'

export function readTempPasswordHint(): string {
  if (typeof window === 'undefined') return ''
  try {
    return sessionStorage.getItem(TEMP_PASSWORD_HINT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function clearTempPasswordHint(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(TEMP_PASSWORD_HINT_KEY)
  } catch {
    /* ignore */
  }
}

export function storeTempPasswordHint(plain: string): void {
  if (typeof window === 'undefined' || !plain) return
  try {
    sessionStorage.setItem(TEMP_PASSWORD_HINT_KEY, plain)
  } catch {
    /* ignore */
  }
}
