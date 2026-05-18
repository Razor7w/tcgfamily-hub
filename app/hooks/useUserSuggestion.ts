import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type UserSuggestionPayload = {
  hasSubmitted: boolean
  suggestion: {
    text: string
    createdAt: string
  } | null
}

export function useUserSuggestion() {
  return useQuery<UserSuggestionPayload>({
    queryKey: ['me', 'suggestion'],
    queryFn: async () => {
      const res = await fetch('/api/me/suggestion', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo cargar tu sugerencia'
        )
      }
      return data as UserSuggestionPayload
    }
  })
}

export function useSubmitUserSuggestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/me/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo enviar la sugerencia'
        )
      }
      return data as UserSuggestionPayload
    },
    onSuccess: data => {
      queryClient.setQueryData(['me', 'suggestion'], data)
    }
  })
}
