/** Cuenta de staff atada a una sucursal. El resto del staff no tiene este límite. */
const STAFF_BRANCH_KEY_BY_EMAIL: Record<string, string> = {
  'vinadelmar@tcgfamily.cl': 'vina del mar',
  'tcgfamilychile@gmail.com': 'villa alemana'
}

export function foldBranchName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function staffBranchKeyForEmail(
  email: string | null | undefined
): string | null {
  const key = email?.trim().toLowerCase() ?? ''
  if (!key) return null
  return STAFF_BRANCH_KEY_BY_EMAIL[key] ?? null
}

/** Sin clave de sucursal, el staff puede aceptar cualquier correo. */
export function staffAcceptsBranchName(
  email: string | null | undefined,
  branchName: string | null | undefined
): boolean {
  const staffKey = staffBranchKeyForEmail(email)
  if (!staffKey) return true
  const folded = foldBranchName(branchName ?? '')
  return folded.length > 0 && folded.includes(staffKey)
}

export function mailOtherBranchMessage(
  branchName: string | null | undefined
): string {
  const name = branchName?.trim() ?? ''
  if (!name) return 'Este correo fue registrado para la otra tienda.'
  return `Este correo fue registrado para ${name}.`
}
