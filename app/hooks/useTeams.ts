'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsQueryKey } from '@/hooks/useNotifications'
import type { TeamPublicCoreDTO } from '@/lib/teams/public-payload'
import type { TeamMedalDTO } from '@/lib/teams/medals/types'
import type { TeamMonthlyActivityDTO } from '@/lib/teams/monthly-activity'

export const teamsPublicDirectoryQueryKey = [
  'teams',
  'public-directory'
] as const

export type PublicTeamDirectoryItem = {
  id: string
  name: string
  slug: string
  bio: string
  logoUrl: string
  memberCount: number
}

export function usePublicTeamsDirectory(limit = 24) {
  return useQuery({
    queryKey: [...teamsPublicDirectoryQueryKey, limit],
    queryFn: async (): Promise<{
      teams: PublicTeamDirectoryItem[]
      total: number
    }> => {
      const res = await fetch(`/api/teams/public?limit=${limit}`)
      if (!res.ok) await parseError(res, 'No se pudieron cargar los equipos')
      return res.json()
    },
    staleTime: 120_000
  })
}

export type MyTeamMembership = {
  teamId: string
  teamName: string
  teamSlug: string
  teamLogoUrl: string
  role: 'captain' | 'co_captain' | 'member'
  roleLabel: string
}

export type TeamApplication = {
  id: string
  name: string
  slug: string
  bio: string
  status: 'pending'
  submittedAt: string
}

export type TeamsMeResponse = {
  membership: MyTeamMembership | null
  application: TeamApplication | null
  lastRejected: {
    name: string
    slug: string
    rejectionReason: string
    reviewedAt: string
  } | null
  canApplyForTeam: boolean
  limits: { nameMax: number; bioMax: number }
}

export type TeamManageMember = {
  userId: string
  displayName: string
  imageUrl: string | null
  role: 'captain' | 'co_captain' | 'member'
  roleLabel: string
}

export type TeamManageInvitation = {
  id: string
  inviteeUserId: string | null
  inviteeName: string
  inviteeImage: string | null
  inviteePopid: string
  inviteeRut: string
  linkStatus: 'linked' | 'awaiting_user'
  expiresAt: string
  createdAt: string
}

export type TeamManageResponse = {
  team: {
    id: string
    name: string
    slug: string
    bio: string
    logoUrl: string
    logoKey: string
    coverUrl: string
    coverKey: string
  }
  viewer: {
    userId: string
    role: 'captain' | 'co_captain' | 'member'
    roleLabel: string
    canManage: boolean
    isCaptain: boolean
    featuredDecklistId: string | null
  }
  members: TeamManageMember[]
  memberCount: number
}

export type TeamManageMedalsResponse = {
  medals: TeamMedalDTO[]
}

export type TeamManageInvitationsResponse = {
  invitations: TeamManageInvitation[]
}

export type TeamManageJoinRequest = {
  id: string
  requesterUserId: string
  requesterName: string
  requesterImage: string | null
  requesterPopid: string
  expiresAt: string
  createdAt: string
}

export type TeamManageJoinRequestsResponse = {
  joinRequests: TeamManageJoinRequest[]
}

export type TeamJoinRequestMeResponse = {
  joinRequest: {
    id: string
    expiresAt: string
    createdAt: string
  } | null
}

export const teamsMeQueryKey = ['teams', 'me'] as const
export const teamPublicQueryKey = (slug: string) =>
  ['teams', 'public', 'v6', slug] as const
export const teamPublicMedalsQueryKey = (slug: string) =>
  ['teams', 'public', slug, 'medals', 'v2'] as const
export const teamPublicLeagueMedalsQueryKey = (slug: string) =>
  ['teams', 'public', slug, 'medals', 'league'] as const
export const teamPublicActivityQueryKey = (slug: string) =>
  ['teams', 'public', slug, 'activity', 'v2'] as const
export const teamManageQueryKey = (slug: string) =>
  ['teams', 'manage', slug] as const
export const teamManageMedalsQueryKey = (slug: string) =>
  ['teams', 'manage', slug, 'medals'] as const
export const teamManageInvitationsQueryKey = (slug: string) =>
  ['teams', 'manage', slug, 'invitations'] as const
export const teamManageJoinRequestsQueryKey = (slug: string) =>
  ['teams', 'manage', slug, 'join-requests'] as const
export const teamJoinRequestMeQueryKey = (slug: string) =>
  ['teams', slug, 'join-request', 'me'] as const

async function parseError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => ({}))
  throw new Error(typeof j.error === 'string' ? j.error : fallback)
}

export function useTeamsMe() {
  return useQuery({
    queryKey: teamsMeQueryKey,
    queryFn: async (): Promise<TeamsMeResponse> => {
      const res = await fetch('/api/teams/me')
      if (!res.ok) await parseError(res, 'No se pudo cargar tu equipo')
      return res.json()
    },
    staleTime: 60_000
  })
}

export function usePublicTeam(slug: string) {
  return useQuery({
    queryKey: teamPublicQueryKey(slug),
    queryFn: async (): Promise<{ team: TeamPublicCoreDTO }> => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}`)
      if (!res.ok) await parseError(res, 'No se pudo cargar el equipo')
      const data = (await res.json()) as { team: TeamPublicCoreDTO }
      return { team: data.team }
    },
    enabled: Boolean(slug?.trim()),
    staleTime: 120_000
  })
}

export function usePublicTeamMedals(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamPublicMedalsQueryKey(slug),
    queryFn: async (): Promise<{ medals: TeamMedalDTO[] }> => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}/medals`)
      if (!res.ok) await parseError(res, 'No se pudieron cargar las medallas')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 120_000
  })
}

export function usePublicTeamLeagueMedals(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamPublicLeagueMedalsQueryKey(slug),
    queryFn: async (): Promise<{ medals: TeamMedalDTO[] }> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/medals/league`
      )
      if (!res.ok)
        await parseError(res, 'No se pudieron cargar las medallas de liga')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 300_000
  })
}

export function usePublicTeamActivity(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamPublicActivityQueryKey(slug),
    queryFn: async (): Promise<{ activity: TeamMonthlyActivityDTO }> => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}/activity`)
      if (!res.ok) await parseError(res, 'No se pudo cargar la actividad')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 60_000
  })
}

export function useTeamManage(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamManageQueryKey(slug),
    queryFn: async (): Promise<TeamManageResponse> => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}/manage`)
      if (!res.ok) await parseError(res, 'No se pudo cargar la gestión')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 30_000
  })
}

export function useTeamManageMedals(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamManageMedalsQueryKey(slug),
    queryFn: async (): Promise<TeamManageMedalsResponse> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/manage/medals`
      )
      if (!res.ok) await parseError(res, 'No se pudieron cargar las medallas')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 120_000
  })
}

export function useTeamManageInvitations(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamManageInvitationsQueryKey(slug),
    queryFn: async (): Promise<TeamManageInvitationsResponse> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/manage/invitations`
      )
      if (!res.ok)
        await parseError(res, 'No se pudieron cargar las invitaciones')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 30_000
  })
}

export function useTeamManageJoinRequests(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamManageJoinRequestsQueryKey(slug),
    queryFn: async (): Promise<TeamManageJoinRequestsResponse> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/manage/join-requests`
      )
      if (!res.ok)
        await parseError(res, 'No se pudieron cargar las solicitudes')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 30_000
  })
}

export function useMyTeamJoinRequest(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamJoinRequestMeQueryKey(slug),
    queryFn: async (): Promise<TeamJoinRequestMeResponse> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/join-requests/me`
      )
      if (!res.ok) await parseError(res, 'No se pudo cargar tu solicitud')
      return res.json()
    },
    enabled: Boolean(slug?.trim()) && enabled,
    staleTime: 30_000
  })
}

export function useRequestJoinTeam(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/join-requests`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo enviar la solicitud')
      return res.json() as Promise<{
        joinRequest: {
          id: string
          teamSlug: string
          teamName: string
          expiresAt: string
        }
      }>
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useCancelTeamJoinRequest(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/join-requests/me`,
        { method: 'DELETE' }
      )
      if (!res.ok) await parseError(res, 'No se pudo cancelar')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useAcceptTeamJoinRequest(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (joinRequestId: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/join-requests/${encodeURIComponent(joinRequestId)}/accept`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo aceptar')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useDeclineTeamJoinRequest(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (joinRequestId: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/join-requests/${encodeURIComponent(joinRequestId)}/decline`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo rechazar')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

function invalidateTeams(qc: ReturnType<typeof useQueryClient>, slug?: string) {
  void qc.invalidateQueries({ queryKey: teamsMeQueryKey })
  void qc.invalidateQueries({ queryKey: notificationsQueryKey })
  if (slug) {
    void qc.invalidateQueries({ queryKey: teamPublicQueryKey(slug) })
    void qc.invalidateQueries({ queryKey: teamManageQueryKey(slug) })
    void qc.invalidateQueries({ queryKey: teamManageInvitationsQueryKey(slug) })
    void qc.invalidateQueries({
      queryKey: teamManageJoinRequestsQueryKey(slug)
    })
    void qc.invalidateQueries({ queryKey: teamJoinRequestMeQueryKey(slug) })
  }
}

export function useApplyForTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      slug?: string
      bio?: string
    }) => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      if (!res.ok) await parseError(res, 'No se pudo enviar la solicitud')
      return res.json() as Promise<{
        application: TeamApplication
      }>
    },
    onSuccess: () => {
      invalidateTeams(qc)
      void qc.invalidateQueries({ queryKey: teamsPublicDirectoryQueryKey })
    }
  })
}

/** @deprecated use useApplyForTeam */
export const useCreateTeam = useApplyForTeam

export function useUpdateTeam(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name?: string
      bio?: string
      logoUrl?: string
      logoKey?: string
      coverUrl?: string
      coverKey?: string
    }) => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      if (!res.ok) await parseError(res, 'No se pudo actualizar el equipo')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useDisbandTeam(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}`, {
        method: 'DELETE'
      })
      if (!res.ok) await parseError(res, 'No se pudo disolver el equipo')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useInviteToTeam(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rut: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/invitations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rut })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo enviar la solicitud')
      return res.json() as Promise<{
        invitation: {
          id: string
          inviteeRut: string
          linkStatus: 'linked' | 'awaiting_user'
        }
      }>
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useCancelTeamInvitation(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/invitations/${encodeURIComponent(invitationId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) await parseError(res, 'No se pudo cancelar')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useAcceptTeamInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { invitationId: string }) => {
      const res = await fetch('/api/teams/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      if (!res.ok) await parseError(res, 'No se pudo aceptar')
      return res.json() as Promise<{
        team: { id: string; name: string; slug: string }
      }>
    },
    onSuccess: data => invalidateTeams(qc, data.team.slug)
  })
}

export function useDeclineTeamInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { invitationId: string }) => {
      const res = await fetch('/api/teams/invitations/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      if (!res.ok) await parseError(res, 'No se pudo rechazar')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc)
  })
}

export function useLeaveTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/teams/leave', { method: 'POST' })
      if (!res.ok) await parseError(res, 'No se pudo salir del equipo')
      return res.json()
    },
    onSuccess: () => {
      invalidateTeams(qc)
      void qc.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

export function useUpdateTeamMemberRole(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      role: 'co_captain' | 'member'
    }) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/members/${encodeURIComponent(input.userId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: input.role })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo actualizar el rol')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useRemoveTeamMember(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) await parseError(res, 'No se pudo quitar al miembro')
      return res.json()
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}

export function useUpdateTeamFeaturedDeck(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (decklistId: string | null) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/featured-deck`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decklistId })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo guardar el mazo destacado')
      return res.json() as Promise<{
        ok: true
        featuredDecklistId: string | null
      }>
    },
    onSuccess: () => invalidateTeams(qc, slug)
  })
}
