'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TeamPostsScope } from '@/lib/teams/post-payload'
import type { TeamPostCommentDTO, TeamPostDTO } from '@/lib/teams/post-payload'
import type { TeamPostVisibility } from '@/lib/teams/post-constants'

export const teamPostsQueryKey = (
  slug: string,
  scope: TeamPostsScope = 'public'
) => ['teams', slug, 'posts', scope] as const

export const teamPostCommentsQueryKey = (slug: string, postId: string) =>
  ['teams', slug, 'posts', postId, 'comments'] as const

async function parseError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}))
  throw new Error(typeof data?.error === 'string' ? data.error : fallback)
}

export function useTeamPosts(
  slug: string,
  enabled = true,
  scope: TeamPostsScope = 'public'
) {
  return useQuery({
    queryKey: teamPostsQueryKey(slug, scope),
    queryFn: async (): Promise<{
      posts: TeamPostDTO[]
      nextCursor: string | null
    }> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/posts?scope=${scope}`,
        { cache: 'no-store' }
      )
      if (!res.ok)
        await parseError(res, 'No se pudieron cargar las publicaciones')
      return res.json()
    },
    enabled: Boolean(slug) && enabled,
    staleTime: scope === 'members' ? 0 : 30_000
  })
}

export function useTeamPostComments(
  slug: string,
  postId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: teamPostCommentsQueryKey(slug, postId),
    queryFn: async (): Promise<{ comments: TeamPostCommentDTO[] }> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}/comments`
      )
      if (!res.ok)
        await parseError(res, 'No se pudieron cargar los comentarios')
      return res.json()
    },
    enabled: Boolean(slug && postId && enabled),
    staleTime: 15_000
  })
}

export type CreateTeamPostInput = {
  title?: string
  bodyHtml: string
  coverUrl?: string
  coverKey?: string
  decklistId?: string | null
  visibility?: TeamPostVisibility
}

export function useCreateTeamPost(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTeamPostInput) => {
      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      if (!res.ok) await parseError(res, 'No se pudo publicar')
      return res.json() as Promise<{ post: TeamPostDTO }>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', slug, 'posts'] })
    }
  })
}

export type UpdateTeamPostInput = CreateTeamPostInput

function applyUpdatedPostToFeedCache(
  old: { posts: TeamPostDTO[]; nextCursor: string | null } | undefined,
  updated: TeamPostDTO,
  scope: TeamPostsScope
) {
  if (!old) return old

  const without = old.posts.filter(p => p.id !== updated.id)

  if (scope === 'public') {
    if (updated.visibility !== 'public') {
      return { ...old, posts: without }
    }
    const idx = old.posts.findIndex(p => p.id === updated.id)
    if (idx < 0) {
      return { ...old, posts: [updated, ...old.posts] }
    }
    const posts = [...old.posts]
    posts[idx] = updated
    return { ...old, posts }
  }

  const idx = old.posts.findIndex(p => p.id === updated.id)
  if (idx < 0) {
    return { ...old, posts: [updated, ...old.posts] }
  }
  const posts = [...old.posts]
  posts[idx] = updated
  return { ...old, posts }
}

export function useUpdateTeamPost(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      postId,
      ...input
    }: UpdateTeamPostInput & { postId: string }) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo actualizar')
      return res.json() as Promise<{ post: TeamPostDTO }>
    },
    onSuccess: data => {
      const updated = data.post
      for (const scope of ['public', 'members'] as const) {
        qc.setQueryData<{ posts: TeamPostDTO[]; nextCursor: string | null }>(
          teamPostsQueryKey(slug, scope),
          old => applyUpdatedPostToFeedCache(old, updated, scope)
        )
      }
    }
  })
}

export function useDeleteTeamPost(
  slug: string,
  scope: TeamPostsScope = 'members'
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) await parseError(res, 'No se pudo eliminar')
      return res.json()
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teamPostsQueryKey(slug, scope) })
      void qc.invalidateQueries({ queryKey: teamPostsQueryKey(slug, 'public') })
    }
  })
}

export function useTeamPostReaction(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      postId,
      value
    }: {
      postId: string
      value: 1 | -1 | null
    }) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}/reaction`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo reaccionar')
      return res.json() as Promise<{
        likeCount: number
        dislikeCount: number
        viewerReaction: 1 | -1 | null
      }>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', slug, 'posts'] })
    }
  })
}

export function useCreateTeamPostComment(slug: string, postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo comentar')
      return res.json() as Promise<{ comment: TeamPostCommentDTO }>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', slug, 'posts'] })
      void qc.invalidateQueries({
        queryKey: teamPostCommentsQueryKey(slug, postId)
      })
    }
  })
}
