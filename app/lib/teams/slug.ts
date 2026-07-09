import { TEAM_SLUG_MAX } from '@/lib/teams/constants'

const TEAM_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeTeamSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, TEAM_SLUG_MAX)
}

export function slugFromTeamName(name: string): string {
  return normalizeTeamSlug(name)
}

export function isValidTeamSlug(slug: string): boolean {
  if (!slug || slug.length > TEAM_SLUG_MAX) return false
  return TEAM_SLUG_RE.test(slug)
}
