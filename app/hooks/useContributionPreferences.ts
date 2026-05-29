'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type ContributionPreferencesData = {
  hideBadge: boolean
}

export function useContributionPreferences(options?: { enabled?: boolean }) {
  const want = options?.enabled !== false

  return useQuery<ContributionPreferencesData>({
    queryKey: ['me', 'contribution-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/me/contribution-preferences')
      if (!res.ok) {
        throw new Error('No se pudieron cargar las preferencias')
      }
      return res.json() as Promise<ContributionPreferencesData>
    },
    enabled: want,
    staleTime: 60_000
  })
}

export function useUpdateContributionPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (hideBadge: boolean) => {
      const res = await fetch('/api/me/contribution-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideBadge })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string'
            ? err.error
            : 'Error al guardar preferencias'
        )
      }
      return res.json() as Promise<ContributionPreferencesData>
    },
    onSuccess: data => {
      queryClient.setQueryData(['me', 'contribution-preferences'], data)
    }
  })
}
