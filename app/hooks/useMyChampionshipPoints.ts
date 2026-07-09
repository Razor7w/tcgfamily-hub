'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { PlayPokemonChampionshipPointsLookup } from '@/lib/play-pokemon-leaderboard/public'

export function useMyChampionshipPoints(options?: { enabled?: boolean }) {
  const want = options?.enabled !== false
  const { status } = useSession()

  return useQuery<PlayPokemonChampionshipPointsLookup>({
    queryKey: ['me', 'championship-points'],
    queryFn: async () => {
      const res = await fetch('/api/me/championship-points')
      if (!res.ok) {
        throw new Error('No se pudieron cargar tus Championship Points')
      }
      return res.json() as Promise<PlayPokemonChampionshipPointsLookup>
    },
    enabled: want && status === 'authenticated',
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000
  })
}
