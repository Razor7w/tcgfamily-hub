'use client'

import { useQuery } from '@tanstack/react-query'

export type AdminSuggestionRow = {
  id: string
  text: string
  createdAt: string
  updatedAt: string | null
  user: {
    id: string
    name: string
    email: string
    rut: string
    popid: string
  } | null
}

export type AdminSuggestionsResponse = {
  suggestions: AdminSuggestionRow[]
  total: number
}

export function useAdminSuggestions(enabled = true) {
  return useQuery<AdminSuggestionsResponse>({
    queryKey: ['admin', 'suggestions'],
    enabled,
    queryFn: async () => {
      const res = await fetch('/api/admin/suggestions')
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(
          typeof j?.error === 'string' ? j.error : 'Error al cargar sugerencias'
        )
      }
      return res.json() as Promise<AdminSuggestionsResponse>
    },
    staleTime: 30_000
  })
}
