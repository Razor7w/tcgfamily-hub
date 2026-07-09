import { r2PublicBaseUrl } from '@/lib/r2'

export function teamBrandingKeyForTeam(teamId: string, key: string): boolean {
  if (!teamId || !key) return false
  return key.startsWith(`team-branding/${teamId}/`)
}

export function keyFromTeamBrandingPublicUrl(url: string): string | null {
  const base = r2PublicBaseUrl()
  if (!url.startsWith(`${base}/`)) return null
  const key = url.slice(base.length + 1)
  return key || null
}

export function resolveTeamBrandingAsset(
  teamId: string,
  urlRaw: string,
  keyRaw: string
): { url: string; key: string } | null {
  const url = urlRaw.trim()
  const key = keyRaw.trim()
  if (!url) return { url: '', key: '' }

  if (
    key &&
    teamBrandingKeyForTeam(teamId, key) &&
    url === `${r2PublicBaseUrl()}/${key}`
  ) {
    return { url, key }
  }

  const fromUrl = keyFromTeamBrandingPublicUrl(url)
  if (fromUrl && teamBrandingKeyForTeam(teamId, fromUrl)) {
    return { url, key: fromUrl }
  }

  return null
}
