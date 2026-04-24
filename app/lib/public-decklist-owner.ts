/** Datos del dueño para decklists públicos (sin exponer email completo). */
export function ownerPublicDisplay(
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
): { displayName: string; imageUrl: string | null } {
  if (!user) {
    return { displayName: 'Usuario', imageUrl: null }
  }
  const rawName = typeof user.name === 'string' ? user.name.trim() : ''
  if (rawName) {
    const imageUrl =
      typeof user.image === 'string' && user.image.trim() !== ''
        ? user.image.trim()
        : null
    return { displayName: rawName, imageUrl }
  }
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  const fromEmail =
    email && email.includes('@') ? email.split('@')[0]!.trim() : ''
  const displayName = fromEmail || 'Usuario'
  const imageUrl =
    typeof user.image === 'string' && user.image.trim() !== ''
      ? user.image.trim()
      : null
  return { displayName, imageUrl }
}
