'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PersonSearch from '@mui/icons-material/PersonSearch'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'

type AdminSellerUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  sellerSlug: string
  sellerModuleAccess: boolean
  image: string
  publicPath: string | null
  accessViaAdminRole: boolean
}

async function fetchAdminSellers(mode: 'allowed' | 'search', q = '') {
  const params = new URLSearchParams()
  if (mode === 'search') {
    params.set('mode', 'search')
    params.set('q', q)
  }
  const res = await fetch(`/api/admin/vendedores?${params}`)
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof j.error === 'string' ? j.error : 'No se pudo cargar')
  }
  return (j.users as AdminSellerUser[]) ?? []
}

function UserRow({
  u,
  onToggle,
  pending
}: {
  u: AdminSellerUser
  onToggle: (access: boolean) => void
  pending: boolean
}) {
  const enabled = u.accessViaAdminRole || u.sellerModuleAccess
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Avatar
            src={u.image || undefined}
            alt={u.name}
            sx={{ width: 40, height: 40 }}
          >
            {u.name.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>
              {u.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              {u.email || 'Sin email'}
              {u.sellerSlug ? ` · /${u.sellerSlug}` : ''}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ mt: 0.5 }}
              flexWrap="wrap"
              useFlexGap
            >
              {u.role === 'admin' ? (
                <Chip
                  size="small"
                  label="Admin"
                  color="primary"
                  variant="outlined"
                />
              ) : null}
              {u.accessViaAdminRole ? (
                <Chip
                  size="small"
                  label="Acceso por rol admin"
                  color="success"
                  variant="outlined"
                />
              ) : u.sellerModuleAccess ? (
                <Chip
                  size="small"
                  label="Marcha blanca"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip size="small" label="Sin acceso" variant="outlined" />
              )}
              {u.publicPath ? (
                <Chip
                  size="small"
                  component={Link}
                  href={u.publicPath}
                  clickable
                  label="Ver página"
                  variant="outlined"
                />
              ) : null}
            </Stack>
          </Box>
        </Stack>
        <FormControlLabel
          sx={{ m: 0, flexShrink: 0 }}
          control={
            <Switch
              checked={enabled}
              disabled={pending || u.accessViaAdminRole}
              onChange={(_, checked) => onToggle(checked)}
            />
          }
          label={
            <Typography variant="body2">
              {u.accessViaAdminRole
                ? 'Siempre (admin)'
                : enabled
                  ? 'Autorizado'
                  : 'Sin acceso'}
            </Typography>
          }
        />
      </Stack>
    </Paper>
  )
}

export default function AdminVendedoresPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  const allowed = useQuery({
    queryKey: ['admin', 'vendedores', 'allowed'],
    queryFn: () => fetchAdminSellers('allowed')
  })

  const search = useQuery({
    queryKey: ['admin', 'vendedores', 'search', debouncedQ],
    queryFn: () => fetchAdminSellers('search', debouncedQ),
    enabled: debouncedQ.length >= 2
  })

  const patch = useMutation({
    mutationFn: async (input: { userId: string; access: boolean }) => {
      const res = await fetch('/api/admin/vendedores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo actualizar'
        )
      }
      return j.user as AdminSellerUser
    },
    onSuccess: () => {
      setActionError(null)
      void qc.invalidateQueries({ queryKey: ['admin', 'vendedores'] })
    },
    onError: (e: Error) => setActionError(e.message)
  })

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <AdminStorePageHeading showActiveStoreAvatar={false}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: t => alpha(t.palette.primary.main, 0.1),
                color: 'primary.main',
                flexShrink: 0
              }}
            >
              <StorefrontOutlined />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Vendedores
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Marcha blanca del módulo Carpetas: solo usuarios autorizados (y
                administradores) pueden publicar y gestionar singles.
              </Typography>
            </Box>
          </Stack>
        </AdminStorePageHeading>

        <Alert severity="info">
          Cualquiera puede ver e interactuar en las URLs públicas (
          <Link href="/vendedores">/vendedores</Link>, carpetas). La marcha
          blanca solo restringe <strong>crear y gestionar</strong> carpetas:
          usuarios con rol <strong>admin</strong> o autorizados aquí.
        </Alert>

        {actionError ? (
          <Alert severity="error" onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        ) : null}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Autorizar usuario
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por nombre, email o slug…"
            value={q}
            onChange={e => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <PersonSearch fontSize="small" color="action" sx={{ mr: 1 }} />
              )
            }}
          />
          {debouncedQ.length >= 2 ? (
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {search.isPending ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : search.error ? (
                <Alert severity="error">
                  {search.error instanceof Error
                    ? search.error.message
                    : 'Error'}
                </Alert>
              ) : !(search.data?.length ?? 0) ? (
                <Typography variant="body2" color="text.secondary">
                  Sin resultados.
                </Typography>
              ) : (
                search.data!.map(u => (
                  <UserRow
                    key={u.id}
                    u={u}
                    pending={patch.isPending}
                    onToggle={access =>
                      void patch.mutate({ userId: u.id, access })
                    }
                  />
                ))
              )}
            </Stack>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Escribe al menos 2 caracteres.
            </Typography>
          )}
        </Paper>

        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            Con acceso ({allowed.data?.length ?? '…'})
          </Typography>
          {allowed.isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : allowed.error ? (
            <Alert severity="error">
              {allowed.error instanceof Error
                ? allowed.error.message
                : 'Error al cargar'}
            </Alert>
          ) : !(allowed.data?.length ?? 0) ? (
            <Typography color="text.secondary">
              Aún no hay usuarios en la lista (los admin aparecen aquí
              automáticamente).
            </Typography>
          ) : (
            <Stack spacing={1}>
              {allowed.data!.map(u => (
                <UserRow
                  key={u.id}
                  u={u}
                  pending={patch.isPending}
                  onToggle={access =>
                    void patch.mutate({ userId: u.id, access })
                  }
                />
              ))}
            </Stack>
          )}
        </Box>

        <Button
          component={Link}
          href="/dashboard/carpetas"
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            alignSelf: 'flex-start'
          }}
        >
          Ir a Carpetas (dashboard)
        </Button>
      </Stack>
    </Container>
  )
}
