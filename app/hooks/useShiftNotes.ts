'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDashboardStoreQueryKey } from '@/hooks/use-dashboard-store-key'
import type { ShiftNoteDto } from '@/lib/shift-note'

export function shiftNotesQueryKey(storeId: string) {
  return ['admin', 'shift-notes', storeId] as const
}

async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  throw new Error(typeof body?.error === 'string' ? body.error : fallback)
}

export type ShiftNotesResponse = {
  open: ShiftNoteDto[]
  done: ShiftNoteDto[]
}

export function useShiftNotes(enabled: boolean) {
  const storeId = useDashboardStoreQueryKey()
  return useQuery({
    queryKey: shiftNotesQueryKey(storeId),
    queryFn: async () => {
      const res = await fetch('/api/admin/shift-notes')
      if (!res.ok) await readError(res, 'No se pudieron cargar las notas')
      return res.json() as Promise<ShiftNotesResponse>
    },
    enabled: enabled && storeId !== 'none'
  })
}

export function useCreateShiftNote() {
  const storeId = useDashboardStoreQueryKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { body: string; imageUrl?: string | null }) => {
      const res = await fetch('/api/admin/shift-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) await readError(res, 'No se pudo guardar la nota')
      return res.json() as Promise<{ note: ShiftNoteDto }>
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shiftNotesQueryKey(storeId)
      })
    }
  })
}

export function useUpdateShiftNote() {
  const storeId = useDashboardStoreQueryKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; resolved: boolean }) => {
      const res = await fetch(`/api/admin/shift-notes/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: input.resolved })
      })
      if (!res.ok) await readError(res, 'No se pudo actualizar la nota')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shiftNotesQueryKey(storeId)
      })
    }
  })
}

export function useDeleteShiftNote() {
  const storeId = useDashboardStoreQueryKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/shift-notes/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) await readError(res, 'No se pudo eliminar la nota')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shiftNotesQueryKey(storeId)
      })
    }
  })
}
