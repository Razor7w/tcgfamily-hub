'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

export type MeProfile = {
  id: string
  name: string
  email: string
  image: string
  imageKey?: string
  rut: string
  popid: string
  phone: string
  hasPassword: boolean
  defaultStoreId: string | null
}

/** Clave por usuario: evita servir caché de otra sesión. */
export function meProfileQueryKey(userId: string) {
  return ['me', 'profile', userId] as const
}

/** GET /api/me — una sola petición deduplicada (re-montajes, Strict Mode). */
export async function fetchMeProfile(): Promise<MeProfile> {
  const res = await fetch('/api/me')
  if (!res.ok) {
    throw new Error('No se pudo cargar el perfil')
  }
  return res.json()
}

export function useMe() {
  const { data: session, status } = useSession()
  const uid = session?.user?.id ? String(session.user.id) : ''

  return useQuery({
    queryKey: meProfileQueryKey(uid || 'none'),
    queryFn: fetchMeProfile,
    enabled: status === 'authenticated' && uid.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000
  })
}
