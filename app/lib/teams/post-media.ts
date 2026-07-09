import { r2PublicBaseUrl } from '@/lib/r2'

export function teamPostMediaKeyForTeam(teamId: string, key: string): boolean {
  if (!teamId || !key) return false
  return key.startsWith(`team-posts/${teamId}/`)
}

export function keyFromTeamPostMediaPublicUrl(url: string): string | null {
  const base = r2PublicBaseUrl()
  if (!url.startsWith(`${base}/`)) return null
  const key = url.slice(base.length + 1)
  return key || null
}

export function resolveTeamPostCoverAsset(
  teamId: string,
  urlRaw: string,
  keyRaw: string
): { url: string; key: string } | null {
  const url = urlRaw.trim()
  const key = keyRaw.trim()
  if (!url) return { url: '', key: '' }

  if (
    key &&
    teamPostMediaKeyForTeam(teamId, key) &&
    url === `${r2PublicBaseUrl()}/${key}`
  ) {
    return { url, key }
  }

  const fromUrl = keyFromTeamPostMediaPublicUrl(url)
  if (fromUrl && teamPostMediaKeyForTeam(teamId, fromUrl)) {
    return { url, key: fromUrl }
  }

  return null
}
