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

export type MailListStageFilter = 'all' | 'pending' | 'inStore' | 'retired'
export type MailListElapsedFilter =
  | 'all'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'

export type UseMailsParams = {
  page?: number
  limit?: number
  stage?: MailListStageFilter
  elapsed?: MailListElapsedFilter
  fromUserId?: string | null
  /** IDs resueltos en cliente (texto libre). `[]` = sin matches. */
  fromUserIds?: string[] | null
  toUserId?: string | null
  toUserIds?: string[] | null
  toRut?: string | null
  toRuts?: string[] | null
  q?: string
  fromQ?: string
  toQ?: string
  enabled?: boolean
}

export type MailsListResponse = {
  mails: Mail[]
  page: number
  limit: number
  total: number
  pageCount: number
  hasMore: boolean
  codeSearchExpansion?:
    | {
        kind: 'senderNotInStore'
        fromUserId: string
      }
    | {
        kind: 'recipientInStore'
        toUserId?: string
        toRut?: string
      }
    | null
}

function appendIdList(
  sp: URLSearchParams,
  key: string,
  ids: string[] | null | undefined
) {
  if (ids == null) return
  if (ids.length === 0) {
    // Señal explícita "filtrar pero sin matches" → server devuelve vacío
    sp.set(key, '')
    return
  }
  sp.set(key, ids.join(','))
}

function buildMailsQueryString(params: UseMailsParams = {}): string {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.stage && params.stage !== 'all') sp.set('stage', params.stage)
  if (params.elapsed && params.elapsed !== 'all') {
    sp.set('elapsed', params.elapsed)
  }
  if (params.fromUserId) sp.set('fromUserId', params.fromUserId)
  appendIdList(sp, 'fromUserIds', params.fromUserIds)
  if (params.toUserId) sp.set('toUserId', params.toUserId)
  appendIdList(sp, 'toUserIds', params.toUserIds)
  if (params.toRut) sp.set('toRut', params.toRut)
  appendIdList(sp, 'toRuts', params.toRuts)
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.fromQ?.trim()) sp.set('fromQ', params.fromQ.trim())
  if (params.toQ?.trim()) sp.set('toQ', params.toQ.trim())
  return sp.toString()
}

// Hook para obtener mails paginados (admin)
export function useMails(params: UseMailsParams = {}) {
  const storeKey = useDashboardStoreQueryKey()
  const {
    page = 1,
    limit = 10,
    stage = 'all',
    elapsed = 'all',
    fromUserId = null,
    fromUserIds = null,
    toUserId = null,
    toUserIds = null,
    toRut = null,
    toRuts = null,
    q = '',
    fromQ = '',
    toQ = '',
    enabled = true
  } = params

  return useQuery<MailsListResponse>({
    queryKey: [
      'mails',
      storeKey,
      {
        page,
        limit,
        stage,
        elapsed,
        fromUserId,
        fromUserIds,
        toUserId,
        toUserIds,
        toRut,
        toRuts,
        q,
        fromQ,
        toQ
      }
    ],
    enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: previousData => previousData,
    queryFn: async () => {
      const qs = buildMailsQueryString({
        page,
        limit,
        stage,
        elapsed,
        fromUserId,
        fromUserIds,
        toUserId,
        toUserIds,
        toRut,
        toRuts,
        q,
        fromQ,
        toQ
      })
      const response = await fetch(`/api/mail?${qs}`)
      if (!response.ok) {
        throw new Error('Error al cargar mails')
      }
      return response.json()
    }
  })
}

export type MailFilterOptionsResponse = {
  fromUsers: Array<{ id: string; name: string; rut: string }>
  toRecipients: Array<
    | { kind: 'user'; id: string; name: string; rut: string }
    | { kind: 'toRut'; id: string; rutDisplay: string; rutKey: string }
  >
}

/** Opciones ligeras para autocompletes del admin de correos. */
export function useMailFilterOptions(enabled = true) {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery<MailFilterOptionsResponse>({
    queryKey: ['mails', 'filter-options', storeKey],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch('/api/mail/filter-options')
      if (!response.ok) {
        throw new Error('Error al cargar opciones de filtro')
      }
      return response.json()
    }
  })
}

export type MailBulkTargetIdsParams = {
  stage?: MailListStageFilter
  fromUserId?: string | null
  toUserId?: string | null
  toRut?: string | null
  q?: string
  enabled?: boolean
}

/** IDs lean para acciones masivas (sin populate). */
export function useMailBulkTargetIds(params: MailBulkTargetIdsParams) {
  const storeKey = useDashboardStoreQueryKey()
  const {
    stage = 'all',
    fromUserId = null,
    toUserId = null,
    toRut = null,
    q = '',
    enabled = false
  } = params

  return useQuery<{ ids: string[]; total: number }>({
    queryKey: [
      'mails',
      'bulk-ids',
      storeKey,
      { stage, fromUserId, toUserId, toRut, q }
    ],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const sp = new URLSearchParams()
      sp.set('idsOnly', '1')
      if (stage !== 'all') sp.set('stage', stage)
      if (fromUserId) sp.set('fromUserId', fromUserId)
      if (toUserId) sp.set('toUserId', toUserId)
      if (toRut) sp.set('toRut', toRut)
      if (q.trim()) sp.set('q', q.trim())
      const response = await fetch(`/api/mail?${sp.toString()}`)
      if (!response.ok) {
        throw new Error('Error al cargar IDs de correos')
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
      const previousEntries = queryClient.getQueriesData<{ mails: Mail[] }>({
        queryKey: ['mails', storeKey]
      })

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

      queryClient.setQueriesData<{ mails: Mail[] }>(
        { queryKey: ['mails', storeKey] },
        old => {
          if (!old?.mails) return old
          return {
            ...old,
            mails: old.mails.map(m => (m._id === mailId ? patchMail(m) : m))
          }
        }
      )

      return { previousEntries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEntries) {
        for (const [key, data] of context.previousEntries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSuccess: (updatedMail, variables) => {
      queryClient.setQueriesData<{ mails: Mail[] }>(
        { queryKey: ['mails', storeKey] },
        old => {
          if (!old?.mails) return old
          return {
            ...old,
            mails: old.mails.map(m =>
              m._id === updatedMail._id ? updatedMail : m
            )
          }
        }
      )
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
      queryClient.invalidateQueries({
        queryKey: ['mails', 'filter-options', storeKey]
      })
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
      const previousEntries = queryClient.getQueriesData<{ mails: Mail[] }>({
        queryKey: ['mails', storeKey]
      })
      queryClient.setQueriesData<{ mails: Mail[] }>(
        { queryKey: ['mails', storeKey] },
        old => {
          if (!old?.mails) return old
          return {
            ...old,
            mails: old.mails.map(m =>
              idSet.has(m._id) ? { ...m, isRecived: true } : m
            )
          }
        }
      )
      return { previousEntries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEntries) {
        for (const [key, data] of context.previousEntries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSuccess: (_, mailIds) => {
      const idSet = new Set(mailIds)
      queryClient.setQueriesData<{ mails: Mail[] }>(
        { queryKey: ['mails', storeKey] },
        old => {
          if (!old?.mails) return old
          return {
            ...old,
            mails: old.mails.map(m =>
              idSet.has(m._id) ? { ...m, isRecived: true } : m
            )
          }
        }
      )
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
      const previousEntries = queryClient.getQueriesData<{ mails: Mail[] }>({
        queryKey: ['mails', storeKey]
      })
      queryClient.setQueriesData<{ mails: Mail[] }>(
        { queryKey: ['mails', storeKey] },
        old => {
          if (!old?.mails) return old
          return {
            ...old,
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
        }
      )
      return { previousEntries, receivedInStoreAt }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEntries) {
        for (const [key, data] of context.previousEntries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSuccess: (result, mailIds) => {
      const idSet = new Set(mailIds)
      queryClient.setQueriesData<{ mails: Mail[] }>(
        { queryKey: ['mails', storeKey] },
        old => {
          if (!old?.mails) return old
          return {
            ...old,
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
        }
      )
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
