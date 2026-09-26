'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CardBinderDTO, CardSingleDTO } from '@/lib/card-single-dto'

const bindersKey = ['me', 'binders'] as const
const binderSinglesKey = (id: string) =>
  ['me', 'binders', id, 'singles'] as const

export function useCardBindersList() {
  return useQuery({
    queryKey: bindersKey,
    queryFn: async (): Promise<CardBinderDTO[]> => {
      const res = await fetch('/api/me/binders')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'Error al cargar carpetas'
        )
      }
      return (j.binders as CardBinderDTO[]) ?? []
    }
  })
}

export function useCreateCardBinder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      slug?: string
      description?: string
    }) => {
      const res = await fetch('/api/me/binders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo crear'
        )
      }
      return j.binder as CardBinderDTO
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bindersKey })
    }
  })
}

export function useDeleteCardBinder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/me/binders/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo eliminar'
        )
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bindersKey })
    }
  })
}

export function useBinderSingles(binderId: string | null) {
  return useQuery({
    queryKey: binderId ? binderSinglesKey(binderId) : ['me', 'binders', 'none'],
    enabled: Boolean(binderId),
    queryFn: async (): Promise<{
      binder: CardBinderDTO
      singles: CardSingleDTO[]
    }> => {
      const id = binderId!
      const [bRes, sRes] = await Promise.all([
        fetch(`/api/me/binders/${encodeURIComponent(id)}`),
        fetch(`/api/me/binders/${encodeURIComponent(id)}/singles`)
      ])
      const bj = await bRes.json().catch(() => ({}))
      const sj = await sRes.json().catch(() => ({}))
      if (!bRes.ok) {
        throw new Error(
          typeof bj.error === 'string' ? bj.error : 'Carpeta no encontrada'
        )
      }
      if (!sRes.ok) {
        throw new Error(
          typeof sj.error === 'string' ? sj.error : 'Error al cargar singles'
        )
      }
      return {
        binder: bj.binder as CardBinderDTO,
        singles: (sj.singles as CardSingleDTO[]) ?? []
      }
    }
  })
}

export function useCreateBinderSingle(binderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/me/binders/${encodeURIComponent(binderId)}/singles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo agregar'
        )
      }
      return j.single as CardSingleDTO
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: binderSinglesKey(binderId) })
      void qc.invalidateQueries({ queryKey: bindersKey })
    }
  })
}

export function usePatchCardSingle(binderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: Record<string, unknown>
    }) => {
      const res = await fetch(
        `/api/me/singles/${encodeURIComponent(input.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.patch)
        }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo actualizar'
        ) as Error & { code?: string }
        if (typeof j.code === 'string') err.code = j.code
        throw err
      }
      return j.single as CardSingleDTO
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: binderSinglesKey(binderId) })
      void qc.invalidateQueries({ queryKey: bindersKey })
    }
  })
}

export function useDeleteCardSingle(binderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/me/singles/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo eliminar'
        )
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: binderSinglesKey(binderId) })
      void qc.invalidateQueries({ queryKey: bindersKey })
    }
  })
}

export function usePatchCardBinder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: { name?: string; slug?: string; description?: string }
    }) => {
      const res = await fetch(
        `/api/me/binders/${encodeURIComponent(input.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.patch)
        }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo actualizar'
        )
      }
      return j.binder as CardBinderDTO
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: bindersKey })
      void qc.invalidateQueries({ queryKey: binderSinglesKey(vars.id) })
    }
  })
}
