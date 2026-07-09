export type AdminTeamDisplayStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disbanded'

export function adminTeamDisplayStatus(row: {
  approvalStatus: string
  isActive: boolean
}): AdminTeamDisplayStatus {
  if (row.approvalStatus === 'pending') return 'pending'
  if (row.approvalStatus === 'rejected') return 'rejected'
  if (row.approvalStatus === 'approved' && row.isActive) return 'approved'
  return 'disbanded'
}

export const ADMIN_TEAM_STATUS_LABELS: Record<AdminTeamDisplayStatus, string> =
  {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    disbanded: 'Disuelto / inactivo'
  }

export function adminTeamStatusQuery(
  statusFilter: 'pending' | 'approved' | 'rejected' | 'all'
): Record<string, unknown> {
  if (statusFilter === 'all') return {}
  if (statusFilter === 'approved') {
    return { approvalStatus: 'approved', isActive: true }
  }
  if (statusFilter === 'rejected') {
    return {
      $or: [
        { approvalStatus: 'rejected' },
        { approvalStatus: 'approved', isActive: false }
      ]
    }
  }
  return { approvalStatus: 'pending' }
}
