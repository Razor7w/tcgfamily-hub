import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface User {
  id: string
  name?: string
  email?: string
  image?: string
  role: 'user' | 'admin'
  phone?: string
  rut?: string
  popid?: string
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate: string | null
}

export interface CreateUserData {
  name?: string
  email?: string
  role?: 'user' | 'admin'
  phone?: string
  rut?: string
  popid?: string
}

// Hook para obtener todos los usuarios
export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Error al cargar usuarios')
      }
      return response.json()
    }
  })
}

// Hook para obtener un usuario por ID
export function useUser(userId: string | null) {
  return useQuery<User>({
    queryKey: ['users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) {
        throw new Error('Error al cargar usuario')
      }
      return response.json()
    },
    enabled: !!userId // Solo ejecutar si userId existe
  })
}

// Hook para crear un usuario
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear usuario')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar y refetch la lista de usuarios
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

// Hook para actualizar un usuario
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      data
    }: {
      userId: string
      data: Partial<CreateUserData>
    }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar usuario')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidar tanto la lista como el usuario específico
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId] })
    }
  })
}

// Hook para eliminar un usuario
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar usuario')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

// Hook para carga masiva de usuarios desde CSV
export function useBulkUploadUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al procesar el archivo')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}
