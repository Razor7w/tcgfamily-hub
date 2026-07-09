import type { TeamApprovalStatus } from '@/lib/teams/constants'
import type { AdminTeamDisplayStatus } from '@/lib/teams/approval-workflow-display'
import type { TeamPostDTO } from '@/lib/teams/post-payload'
import type { TeamMedalDTO } from '@/lib/teams/medals/types'

export type AdminTeamMemberDTO = {
  userId: string
  displayName: string
  imageUrl: string | null
  email: string
  popid: string
  role: string
  roleLabel: string
}

export type AdminTeamDetailDTO = {
  id: string
  name: string
  slug: string
  bio: string
  logoUrl: string
  coverUrl: string
  approvalStatus: TeamApprovalStatus
  displayStatus: AdminTeamDisplayStatus
  isActive: boolean
  rejectionReason: string
  submittedAt: string
  reviewedAt: string | null
  publicPath: string
  captain: {
    userId: string
    displayName: string
    imageUrl: string | null
    email: string
    popid: string
    rut: string
  }
  members: AdminTeamMemberDTO[]
  memberCount: number
  posts: TeamPostDTO[]
  postCount: number
  medals: TeamMedalDTO[]
}
