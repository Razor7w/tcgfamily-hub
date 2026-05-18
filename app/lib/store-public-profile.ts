const MAX_ADDRESS = 500
const MAX_URL = 2048

export function normalizeStoreAddress(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, MAX_ADDRESS)
}

/** Vacío o URL http(s); si falta esquema se asume https. */
export function normalizeStoreWebsiteUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let t = raw.trim()
  if (!t) return ''
  if (!/^https?:\/\//i.test(t)) {
    t = `https://${t}`
  }
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.toString().slice(0, MAX_URL)
  } catch {
    return ''
  }
}

/** Vacío, @usuario, instagram.com/… o URL completa. */
export function normalizeStoreInstagramUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let t = raw.trim()
  if (!t) return ''

  if (t.startsWith('@')) {
    const handle = t.slice(1).replace(/\//g, '').trim()
    return handle
      ? `https://www.instagram.com/${encodeURIComponent(handle)}/`.slice(
          0,
          MAX_URL
        )
      : ''
  }

  if (!/^https?:\/\//i.test(t)) {
    if (t.includes('instagram.com')) {
      t = `https://${t.replace(/^\/+/, '')}`
    } else {
      const handle = t.replace(/^@/, '').replace(/\//g, '').trim()
      return handle
        ? `https://www.instagram.com/${encodeURIComponent(handle)}/`.slice(
            0,
            MAX_URL
          )
        : ''
    }
  }

  try {
    const u = new URL(t)
    if (!u.hostname.replace(/^www\./, '').includes('instagram.com')) {
      return ''
    }
    return u.toString().slice(0, MAX_URL)
  } catch {
    return ''
  }
}

export function instagramDisplayLabel(url: string): string {
  const t = url.trim()
  if (!t) return ''
  try {
    const u = new URL(t)
    const parts = u.pathname.split('/').filter(Boolean)
    const handle = parts[0]
    return handle ? `@${handle}` : 'Instagram'
  } catch {
    return 'Instagram'
  }
}

export function websiteDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
