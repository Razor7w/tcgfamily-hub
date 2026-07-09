export const TEAM_SLUG_MAX = 80
export const TEAM_NAME_MAX = 80
export const TEAM_BIO_MAX = 2000
export const TEAM_INVITATION_EXPIRY_DAYS = 14
export const TEAM_PUBLIC_DECKLISTS_LIMIT = 12
export const TEAM_RECENT_TOURNAMENTS_LIMIT = 6

export const TEAM_APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected'
] as const
export type TeamApprovalStatus = (typeof TEAM_APPROVAL_STATUSES)[number]

export const TEAM_APPROVAL_LABELS: Record<TeamApprovalStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado'
}

export const TEAM_ROLES = ['captain', 'co_captain', 'member'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export const TEAM_MEMBERSHIP_STATUSES = ['active', 'left'] as const
export type TeamMembershipStatus = (typeof TEAM_MEMBERSHIP_STATUSES)[number]

export const TEAM_INVITATION_STATUSES = [
  'pending',
  'awaiting_user',
  'accepted',
  'declined',
  'cancelled',
  'expired'
] as const
export type TeamInvitationStatus = (typeof TEAM_INVITATION_STATUSES)[number]

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  captain: 'Capitán',
  co_captain: 'Co-capitán',
  member: 'Miembro'
}

export function teamRoleCanManageTeam(role: TeamRole): boolean {
  return role === 'captain' || role === 'co_captain'
}

/** Peso de cada miembro al sumar puntos de liga al equipo (por rol). */
export const TEAM_LEAGUE_ROLE_WEIGHTS: Record<TeamRole, number> = {
  captain: 1,
  co_captain: 1,
  member: 1
}
