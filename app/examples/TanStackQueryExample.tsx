'use client'

/**
 * EJEMPLO DE USO DE TANSTACK QUERY
 *
 * Este componente muestra diferentes patrones de uso de TanStack Query:
 * - useQuery: Para obtener datos
 * - useMutation: Para crear/actualizar/eliminar
 * - Optimistic updates
 * - Invalidación de caché
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { useMails, useCreateMail, type Mail } from '@/hooks/useMails'

export default function TanStackQueryExample() {
  const [showExample, setShowExample] = useState(false)

  if (!showExample) {
    return (
      <Box sx={{ p: 2 }}>
        <Button variant="contained" onClick={() => setShowExample(true)}>
          Ver Ejemplo de TanStack Query
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Ejemplos de TanStack Query
      </Typography>

      {/* Ejemplo 1: useQuery básico */}
      <Example1BasicQuery />

      {/* Ejemplo 2: useMutation */}
      <Example2Mutation />

      {/* Ejemplo 3: Optimistic Updates */}
      <Example3OptimisticUpdates />
    </Box>
  )
}

// ============================================
// Ejemplo 1: useQuery básico
// ============================================
function Example1BasicQuery() {
  const { data, isLoading, error, refetch, isFetching } = useMails()

  return (
    <Box sx={{ mb: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        1. useQuery básico - Obtener mails
      </Typography>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">Error: {error.message}</Alert>}

      {data && (
        <Box>
          <Typography variant="body2" color="text.secondary">
            Total de mails: {data.mails.length}
            {isFetching && ' (actualizando...)'}
          </Typography>
          <Button onClick={() => refetch()} size="small" sx={{ mt: 1 }}>
            Refetch Manual
          </Button>
          <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
            {data.mails.slice(0, 3).map(mail => (
              <Box key={mail._id} sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2">
                  De: {mail.fromUserId.name} ({mail.fromUserId.rut})
                </Typography>
                <Typography variant="body2">
                  Para:{' '}
                  {mail.toUserId
                    ? `${mail.toUserId.name ?? '—'} (${mail.toUserId.rut ?? '—'})`
                    : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ============================================
// Ejemplo 2: useMutation
// ============================================
function Example2Mutation() {
  const createMail = useCreateMail()
  const [formData, setFormData] = useState({
    fromUserId: '',
    toUserId: '',
    observations: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMail.mutateAsync({
        fromUserId: formData.fromUserId,
        toUserId: formData.toUserId,
        observations: formData.observations
      })
      alert('Mail creado exitosamente!')
      setFormData({ fromUserId: '', toUserId: '', observations: '' })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <Box sx={{ mb: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        2. useMutation - Crear mail
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input
            type="text"
            placeholder="From User ID"
            value={formData.fromUserId}
            onChange={e =>
              setFormData({ ...formData, fromUserId: e.target.value })
            }
            style={{ padding: '8px' }}
          />
          <input
            type="text"
            placeholder="To User ID"
            value={formData.toUserId}
            onChange={e =>
              setFormData({ ...formData, toUserId: e.target.value })
            }
            style={{ padding: '8px' }}
          />
          <input
            type="text"
            placeholder="Observaciones"
            value={formData.observations}
            onChange={e =>
              setFormData({ ...formData, observations: e.target.value })
            }
            style={{ padding: '8px' }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={createMail.isPending}
          >
            {createMail.isPending ? 'Creando...' : 'Crear Mail'}
          </Button>
        </Box>
      </form>

      {createMail.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error: {createMail.error?.message}
        </Alert>
      )}
    </Box>
  )
}

// ============================================
// Ejemplo 3: Optimistic Updates
// ============================================
function Example3OptimisticUpdates() {
  const queryClient = useQueryClient()
  const { data } = useMails()

  // Ejemplo de actualización optimista
  const optimisticUpdate = useMutation({
    mutationFn: async (mailId: string) => {
      // Simular llamada API
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    // ANTES de que la mutación se complete, actualizamos el caché
    onMutate: async mailId => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['mails'] })

      // Snapshot del valor anterior
      const previousMails = queryClient.getQueryData<{ mails: Mail[] }>([
        'mails'
      ])

      // Actualización optimista
      if (previousMails) {
        queryClient.setQueryData<{ mails: Mail[] }>(['mails'], {
          mails: previousMails.mails.map(mail =>
            mail._id === mailId ? { ...mail, isRecived: !mail.isRecived } : mail
          )
        })
      }

      return { previousMails }
    },
    // Si falla, revertir al snapshot anterior
    onError: (err, mailId, context) => {
      if (context?.previousMails) {
        queryClient.setQueryData(['mails'], context.previousMails)
      }
    },
    // Siempre refetch después de éxito o error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mails'] })
    }
  })

  return (
    <Box sx={{ mb: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        3. Optimistic Updates - Actualización inmediata en UI
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        La UI se actualiza inmediatamente, y si falla, se revierte
        automáticamente.
      </Typography>

      {data?.mails.slice(0, 2).map(mail => (
        <Box key={mail._id} sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5' }}>
          <Typography variant="body2">
            Mail ID: {mail._id}
            <br />
            Recibido: {mail.isRecived ? 'Sí' : 'No'}
          </Typography>
          <Button
            size="small"
            onClick={() => optimisticUpdate.mutate(mail._id)}
            disabled={optimisticUpdate.isPending}
            sx={{ mt: 1 }}
          >
            Toggle Recibido (Optimistic)
          </Button>
        </Box>
      ))}
    </Box>
  )
}
