import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDashboardStoreQueryKey } from '@/hooks/use-dashboard-store-key'
import { resolveMailStatusAfterUpdate } from '@/lib/mail-status-transitions'

/**
 * Hooks para la API de mails (TanStack Query).
 * Ver ejemplos completos en ./MAILS_USAGE.md
 */

export type MailStoreRef = {
  id: string
  name: string
  slug: string
}

export interface Mail {
  _id: string
  code?: string
  /** Tienda del envío (presente en GET /api/mail/me con allStores). */
  store?: MailStoreRef | null
  fromUserId: {
    _id: string
    name?: string
    rut?: string
  }
  toUserId: {
    _id: string
    name?: string
    rut?: string
  } | null
  toRut?: string
  isRecived: boolean
  isRecivedInStore?: boolean
  /** ISO cuando la tienda confirmó ingreso en tienda. */
  receivedInStoreAt?: string | null
  observations?: string
  createdAt: string
  updatedAt: string
}

export interface CreateMailData {
  fromUserId: string
  toUserId: string
  toRut?: string
  isRecived?: boolean
  isRecivedInStore?: boolean
  observations?: string
}

export interface RegisterMailData {
  toRut: string
  /** Comentario u observación (opcional). */
  observations?: string
  /** Tienda donde se registra el envío; si falta, usa la activa en sesión. */
  storeId?: string
  /**
   * `onlyReceptor`: mismo flujo que un usuario (emisor = sesión, solo `toRut`).
   * Necesario si el emisor es admin para no exigir `fromUserId`/`toUserId`.
   * `all`: reservado para creación completa (no se usa en el hook de registro).
   */
  mode?: 'onlyReceptor' | 'all'
}

export interface MailRegisterQuota {
  limit: number
  usedToday: number
  remaining: number
}

/** Datos para actualizar un mail (todos opcionales). */
export interface UpdateMailData {
  fromUserId?: string
  toUserId?: string
  toRut?: string
  isRecived?: boolean
  isRecivedInStore?: boolean
  observations?: string
}

// Hook para obtener todos los mails (admin)
export function useMails() {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery<{ mails: Mail[] }>({
    queryKey: ['mails', storeKey],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch('/api/mail?limit=2000')
      if (!response.ok) {
        throw new Error('Error al cargar mails')
      }
      return response.json()
    }
  })
}

export type UseMyMailsOptions = {
  /** Solo correos dirigidos a ti que aún no se han retirado (isRecived: false). */
  pendingOnly?: boolean
  /** Solo correos que ya están recibidos en tienda (isRecivedInStore: true). */
  inStoreOnly?: boolean
  /** Sin filtro por tienda activa; incluye `store` en cada mail. */
  allStores?: boolean
  limit?: number
  enabled?: boolean
}

// Hook para obtener mails del usuario actual (receptor / toUserId)
export function useMyMails(options?: UseMyMailsOptions) {
  const pendingOnly = options?.pendingOnly ?? false
  const inStoreOnly = options?.inStoreOnly ?? false
  const allStores = options?.allStores ?? false
  const limit = options?.limit
  const enabled = options?.enabled !== false
  const storeKey = useDashboardStoreQueryKey()

  return useQuery<{ mails: Mail[] }>({
    queryKey: allStores
      ? ['mails', 'me', 'all-stores', { pendingOnly, inStoreOnly, limit }]
      : ['mails', 'me', storeKey, { pendingOnly, inStoreOnly, limit }],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (limit !== undefined) params.set('limit', String(limit))
      if (pendingOnly) params.set('pending', '1')
      if (inStoreOnly) params.set('inStore', '1')
      if (allStores) params.set('allStores', '1')
      const qs = params.toString()
      const url = qs ? `/api/mail/me?${qs}` : '/api/mail/me'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al cargar mails')
      }
      return response.json()
    }
  })
}

// Hook para crear un mail
export function useCreateMail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMailData) => {
      const response = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear mail')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar y refetch la lista de mails
      queryClient.invalidateQueries({ queryKey: ['mails'] })
      queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
    }
  })
}

/** Cuota de registros de correo del usuario para el día (hora Chile), por tienda. */
export function useMailRegisterQuota(storeId?: string | null) {
  const fallbackKey = useDashboardStoreQueryKey()
  const effectiveStoreId = (storeId ?? '').trim() || fallbackKey
  return useQuery<MailRegisterQuota>({
    queryKey: ['mail-register-quota', effectiveStoreId],
    enabled: effectiveStoreId !== 'none',
    queryFn: async () => {
      const qs =
        (storeId ?? '').trim().length > 0
          ? `?storeId=${encodeURIComponent((storeId ?? '').trim())}`
          : ''
      const response = await fetch(`/api/mail/register-quota${qs}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Error al cargar cuota'
        )
      }
      return response.json()
    }
  })
}

// Hook para que un usuario registre un mail por RUT del receptor
export function useRegisterMail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RegisterMailData) => {
      const response = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al registrar mail')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails'] })
      queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['mail-register-quota'] })
    }
  })
}

// Hook para obtener un mail por ID
export function useGetMailById(mailId: string | null) {
  return useQuery<Mail>({
    queryKey: ['mails', mailId],
    queryFn: async () => {
      const response = await fetch(`/api/mail/${mailId}`)
      if (!response.ok) {
        throw new Error('Error al cargar mail')
      }
      const data = await response.json()
      return data.mail as Mail
    },
    enabled: !!mailId?.trim()
  })
}

// Hook para actualizar un mail por ID
export function useUpdateMail() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async ({
      mailId,
      data
    }: {
      mailId: string
      data: UpdateMailData
    }) => {
      const response = await fetch(`/api/mail/${mailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar mail')
      }

      const res = await response.json()
      return res.mail as Mail
    },
    onMutate: async ({ mailId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['mails', storeKey] })
      const previous = queryClient.getQueryData<{ mails: Mail[] }>([
        'mails',
        storeKey
      ])

      const patchMail = (mail: Mail): Mail => {
        const next: Mail = { ...mail }
        if (
          data.isRecived !== undefined ||
          data.isRecivedInStore !== undefined
        ) {
          const resolved = resolveMailStatusAfterUpdate({
            isRecived: data.isRecived,
            isRecivedInStore: data.isRecivedInStore,
            currentIsRecived: mail.isRecived,
            currentIsRecivedInStore: mail.isRecivedInStore ?? false
          })
          next.isRecived = resolved.isRecived
          next.isRecivedInStore = resolved.isRecivedInStore
          if (resolved.isRecivedInStore && mail.isRecivedInStore !== true) {
            next.receivedInStoreAt = new Date().toISOString()
          } else if (!resolved.isRecivedInStore) {
            next.receivedInStoreAt = null
          }
        }
        if (data.observations !== undefined) {
          next.observations = data.observations ?? ''
        }
        if (data.toRut !== undefined) next.toRut = data.toRut
        return next
      }

      queryClient.setQueryData<{ mails: Mail[] }>(['mails', storeKey], old => {
        if (!old?.mails) return old
        return {
          mails: old.mails.map(m => (m._id === mailId ? patchMail(m) : m))
        }
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mails', storeKey], context.previous)
      }
    },
    onSuccess: (updatedMail, variables) => {
      queryClient.setQueryData<{ mails: Mail[] }>(['mails', storeKey], old => {
        if (!old?.mails) return old
        return {
          mails: old.mails.map(m =>
            m._id === updatedMail._id ? updatedMail : m
          )
        }
      })
      queryClient.setQueryData(['mails', variables.mailId], updatedMail)

      queryClient.setQueriesData(
        {
          predicate: q =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === 'mails' &&
            q.queryKey[1] === 'me'
        },
        (old: unknown) => {
          const data = old as { mails: Mail[] } | undefined
          if (!data?.mails) return old
          const idx = data.mails.findIndex(m => m._id === updatedMail._id)
          if (idx === -1) return old
          const next = [...data.mails]
          next[idx] = updatedMail
          return { mails: next }
        }
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mails', storeKey] })
      queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
    }
  })
}

export interface BulkWithdrawMailsResult {
  updatedCount: number
  matchedCount: number
}

export interface BulkReceiveInStoreMailsResult extends BulkWithdrawMailsResult {
  receivedInStoreAt: string
}

/** Marcar varios correos como retirados en una sola petición (admin). */
export function useBulkWithdrawMails() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (mailIds: string[]) => {
      const response = await fetch('/api/mail/bulk-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailIds })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al marcar correos como retirados')
      }

      return response.json() as Promise<BulkWithdrawMailsResult>
    },
    onMutate: async mailIds => {
      const idSet = new Set(mailIds)
      await queryClient.cancelQueries({ queryKey: ['mails', storeKey] })
      const previous = queryClient.getQueryData<{ mails: Mail[] }>([
        'mails',
        storeKey
      ])
      queryClient.setQueryData<{ mails: Mail[] }>(['mails', storeKey], old => {
        if (!old?.mails) return old
        return {
          mails: old.mails.map(m =>
            idSet.has(m._id) ? { ...m, isRecived: true } : m
          )
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mails', storeKey], context.previous)
      }
    },
    onSuccess: (_, mailIds) => {
      const idSet = new Set(mailIds)
      queryClient.setQueryData<{ mails: Mail[] }>(['mails', storeKey], old => {
        if (!old?.mails) return old
        return {
          mails: old.mails.map(m =>
            idSet.has(m._id) ? { ...m, isRecived: true } : m
          )
        }
      })
      queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mails', storeKey] })
    }
  })
}

/** Marcar varios correos como recibidos en tienda en una sola petición (admin). */
export function useBulkReceiveInStoreMails() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (mailIds: string[]) => {
      const response = await fetch('/api/mail/bulk-receive-in-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailIds })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error || 'Error al marcar correos como recibidos en tienda'
        )
      }

      return response.json() as Promise<BulkReceiveInStoreMailsResult>
    },
    onMutate: async mailIds => {
      const idSet = new Set(mailIds)
      const receivedInStoreAt = new Date().toISOString()
      await queryClient.cancelQueries({ queryKey: ['mails', storeKey] })
      const previous = queryClient.getQueryData<{ mails: Mail[] }>([
        'mails',
        storeKey
      ])
      queryClient.setQueryData<{ mails: Mail[] }>(['mails', storeKey], old => {
        if (!old?.mails) return old
        return {
          mails: old.mails.map(m =>
            idSet.has(m._id)
              ? {
                  ...m,
                  isRecivedInStore: true,
                  receivedInStoreAt
                }
              : m
          )
        }
      })
      return { previous, receivedInStoreAt }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mails', storeKey], context.previous)
      }
    },
    onSuccess: (result, mailIds) => {
      const idSet = new Set(mailIds)
      queryClient.setQueryData<{ mails: Mail[] }>(['mails', storeKey], old => {
        if (!old?.mails) return old
        return {
          mails: old.mails.map(m =>
            idSet.has(m._id)
              ? {
                  ...m,
                  isRecivedInStore: true,
                  receivedInStoreAt: result.receivedInStoreAt
                }
              : m
          )
        }
      })
      queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mails', storeKey] })
    }
  })
}

// Hook para eliminar un mail por ID
export function useDeleteMail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mailId: string) => {
      const response = await fetch(`/api/mail/${mailId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar mail')
      }

      return response.json()
    },
    onSuccess: (_, mailId) => {
      queryClient.invalidateQueries({ queryKey: ['mails'] })
      queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['mail-register-quota'] })
      queryClient.removeQueries({ queryKey: ['mails', mailId] })
    }
  })
}
