import { TEAM_JOIN_REQUEST_EXPIRY_DAYS } from '@/lib/teams/constants'

export function teamJoinRequestExpiryDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + TEAM_JOIN_REQUEST_EXPIRY_DAYS)
  return d
}
