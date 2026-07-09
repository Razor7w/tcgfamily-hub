'use client'

import { useQuery } from '@tanstack/react-query'
import type { NotificationsPayload } from '@/lib/teams/notifications'

export const notificationsQueryKey = ['me', 'notifications'] as const

async function parseError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => ({}))
  throw new Error(typeof j.error === 'string' ? j.error : fallback)
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async (): Promise<NotificationsPayload> => {
      const res = await fetch('/api/me/notifications')
      if (!res.ok)
        await parseError(res, 'No se pudieron cargar las notificaciones')
      return res.json()
    },
    staleTime: 30_000,
    refetchInterval: 60_000
  })
}
