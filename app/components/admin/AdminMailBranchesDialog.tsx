'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useQueryClient } from '@tanstack/react-query'
import {
  adminMailBranchesQueryKey,
  useAdminMailBranches
} from '@/hooks/useMails'
import { useDashboardStoreQueryKey } from '@/hooks/use-dashboard-store-key'
import type { StoreBranchRow } from '@/lib/store-branch'

export type AdminMailBranchesDialogProps = {
  open: boolean
  onClose: () => void
}

export function AdminMailBranchesDialog({
  open,
  onClose
}: AdminMailBranchesDialogProps) {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()
  const { data, isLoading, isError, error, refetch } = useAdminMailBranches(
    open
  )
  const branches = data?.branches ?? []

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: adminMailBranchesQueryKey(storeKey)
    })
    void queryClient.invalidateQueries({ queryKey: ['mail-branches'] })
  }

  const handleCreate = async () => {
    setBusy(true)
    setLocalError(null)
    try {
      const res = await fetch('/api/admin/mail-branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined
        })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'No se pudo crear'
        )
      }
      setName('')
      setAddress('')
      invalidate()
      await refetch()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (b: StoreBranchRow) => {
    setBusy(true)
    setLocalError(null)
    try {
      const res = await fetch(`/api/admin/mail-branches/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !b.isActive })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'No se pudo actualizar'
        )
      }
      invalidate()
      await refetch()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (b: StoreBranchRow) => {
    if (
      !window.confirm(
        `¿Eliminar o desactivar «${b.name}»? Si ya tiene correos, solo se desactiva.`
      )
    ) {
      return
    }
    setBusy(true)
    setLocalError(null)
    try {
      const res = await fetch(`/api/admin/mail-branches/${b.id}`, {
        method: 'DELETE'
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'No se pudo eliminar'
        )
      }
      invalidate()
      await refetch()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => (!busy ? onClose() : undefined)}
      fullWidth
      maxWidth="sm"
      aria-labelledby="admin-mail-branches-title"
    >
      <DialogTitle id="admin-mail-branches-title">Sucursales</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Puntos de retiro de esta tienda. Si hay al menos una activa, al
          registrar correo será obligatorio elegir sucursal y el listado se
          podrá filtrar por ella.
        </Typography>

        {localError ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
            {localError}
          </Alert>
        ) : null}
        {isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error instanceof Error ? error.message : 'Error al cargar'}
          </Alert>
        ) : null}

        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          <TextField
            label="Nombre de la sucursal"
            size="small"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={busy}
            fullWidth
            placeholder="Ej. Local centro"
          />
          <TextField
            label="Dirección (opcional)"
            size="small"
            value={address}
            onChange={e => setAddress(e.target.value)}
            disabled={busy}
            fullWidth
          />
          <Button
            variant="contained"
            disabled={busy || !name.trim()}
            onClick={() => void handleCreate()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Agregar sucursal
          </Button>
        </Stack>

        {isLoading ? (
          <Typography color="text.secondary">Cargando…</Typography>
        ) : branches.length === 0 ? (
          <Typography color="text.secondary">
            Sin sucursales. Los correos seguirán sin separar por local.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {branches.map(b => (
              <Box
                key={b.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1,
                  px: 1.25,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  opacity: b.isActive ? 1 : 0.65
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {b.name}
                    {!b.isActive ? ' · inactiva' : ''}
                  </Typography>
                  {b.address ? (
                    <Typography variant="caption" color="text.secondary">
                      {b.address}
                    </Typography>
                  ) : null}
                </Box>
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => void handleToggle(b)}
                >
                  {b.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  aria-label={`Eliminar ${b.name}`}
                  onClick={() => void handleDelete(b)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
