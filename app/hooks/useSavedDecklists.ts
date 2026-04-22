import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type SavedDecklistSummary = {
  id: string
  name: string
  pokemonSlugs: string[]
  variants: { id: string; label: string }[]
  principalVariantId: string | null
  updatedAt: string
  createdAt: string
}

export function useSavedDecklistsList() {
  return useQuery({
    queryKey: ['decklists'],
    queryFn: async (): Promise<SavedDecklistSummary[]> => {
      const res = await fetch('/api/decklists')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(
          typeof j.error === 'string'
            ? j.error
            : 'No se pudieron cargar los mazos'
        )
      }
      const data = (await res.json()) as { decklists: SavedDecklistSummary[] }
      return data.decklists
    }
  })
}

export function useDeleteSavedDecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/decklists/${id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo eliminar el mazo'
        )
      }
      return j as { ok: boolean }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['decklists'] })
    }
  })
}

export function useCreateSavedDecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string
      deckText: string
      /** Uno o dos slugs (mínimo el primero). */
      pokemon: string[]
    }) => {
      const res = await fetch('/api/decklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          deckText: payload.deckText,
          pokemon: payload.pokemon
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo guardar el mazo'
        )
      }
      return j as {
        id: string
        name: string
        pokemonSlugs: string[]
        updatedAt: string
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['decklists'] })
    }
  })
}
