import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Hooks para la API de mails (TanStack Query).
 * Ver ejemplos completos en ./MAILS_USAGE.md
 */

export interface Mail {
  _id: string
  code?: string
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
  /**
   * `onlyReceptor`: mismo flujo que un usuario (emisor = sesión, solo `toRut`).
   * Necesario si el emisor es admin para no exigir `fromUserId`/`toUserId`.
   * `all`: reservado para creación completa (no se usa en el hook de registro).
   */
  mode?: 'onlyReceptor' | 'all'
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
  return useQuery<{ mails: Mail[] }>({
    queryKey: ['mails'],
    queryFn: async () => {
      const response = await fetch('/api/mail')
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
  limit?: number
}

// Hook para obtener mails del usuario actual (receptor / toUserId)
export function useMyMails(options?: UseMyMailsOptions) {
  const pendingOnly = options?.pendingOnly ?? false
  const inStoreOnly = options?.inStoreOnly ?? false
  const limit = options?.limit

  return useQuery<{ mails: Mail[] }>({
    queryKey: ['mails', 'me', { pendingOnly, inStoreOnly, limit }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (limit !== undefined) params.set('limit', String(limit))
      if (pendingOnly) params.set('pending', '1')
      if (inStoreOnly) params.set('inStore', '1')
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
    onSuccess: (updatedMail, variables) => {
      queryClient.setQueryData<{ mails: Mail[] }>(['mails'], old => {
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
      queryClient.removeQueries({ queryKey: ['mails', mailId] })
    }
  })
}
