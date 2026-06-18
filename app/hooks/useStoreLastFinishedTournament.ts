import { useQuery } from '@tanstack/react-query'

export type StoreLastFinishedTournamentPayload = {
  store: { name: string }
  tournament: {
    _id: string
    title: string
    startsAt: string
    standingsTopByCategory: {
      categoryIndex: number
      rows: { place: number; displayName: string }[]
    }[]
    standingsUnified?: boolean
  } | null
}

export function useStoreLastFinishedTournament(storeSlug: string) {
  const slug = storeSlug.trim().toLowerCase()
  return useQuery<StoreLastFinishedTournamentPayload>({
    queryKey: ['store-last-finished-tournament', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug de tienda requerido')
      const res = await fetch(
        `/api/stores/${encodeURIComponent(slug)}/last-finished-tournament`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar el torneo'
        )
      }
      return data as StoreLastFinishedTournamentPayload
    },
    enabled: Boolean(slug)
  })
}
