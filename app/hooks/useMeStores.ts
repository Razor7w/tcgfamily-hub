'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

export type MeStoreRow = {
  id: string
  name: string
  slug: string
  logoUrl: string
  role?: 'owner' | 'store_admin'
}

export type MeStoresResponse = { stores: MeStoreRow[] }

/** Clave por usuario: evita servir caché de otra sesión con el mismo prefijo. */
export function meStoresQueryKey(userId: string) {
  return ['me', 'stores', userId] as const
}

/** GET /api/me/stores — compartido por TanStack Query para una sola red por sesión (salvo stale). */
export async function fetchMeStores(): Promise<MeStoresResponse> {
  const res = await fetch('/api/me/stores')
  if (!res.ok) {
    throw new Error('Error al cargar tiendas')
  }
  return res.json()
}

export function useMeStores() {
  const { data: session, status } = useSession()
  const uid = session?.user?.id ? String(session.user.id) : ''

  return useQuery({
    queryKey: meStoresQueryKey(uid || 'none'),
    queryFn: fetchMeStores,
    enabled: status === 'authenticated' && uid.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000
  })
}
