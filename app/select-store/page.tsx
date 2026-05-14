'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { invalidateStoreScopedDashboardQueries } from '@/lib/invalidate-store-scoped-queries'
import { useMeStores } from '@/hooks/useMeStores'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material'

type StoreOption = {
  id: string
  name: string
  slug: string
}

export default function SelectStorePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'
  const { status, update } = useSession()
  const {
    data: meStoresPayload,
    isPending,
    isError,
    error: storesQueryError
  } = useMeStores()

  const [working, setWorking] = useState<string | null>(null)
  const [chooseError, setChooseError] = useState<string | null>(null)

  const stores = useMemo((): StoreOption[] => {
    const rows = meStoresPayload?.stores ?? []
    return rows.map(r => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? '')
    }))
  }, [meStoresPayload?.stores])

  async function choose(id: string) {
    setWorking(id)
    setChooseError(null)
    try {
      const res = await fetch('/api/me/active-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: id })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error((j?.error as string) || res.statusText)
      }
      const data = await res.json()
      await update({
        activeStoreId: data.activeStoreId as string
      })
      await invalidateStoreScopedDashboardQueries(queryClient)
      router.replace(nextPath.startsWith('/') ? nextPath : `/${nextPath}`)
    } catch (e: unknown) {
      setChooseError(String(e instanceof Error ? e.message : e))
    } finally {
      setWorking(null)
    }
  }

  if (status === 'loading') return null

  const listError =
    isError && storesQueryError instanceof Error
      ? storesQueryError.message
      : isError
        ? 'No se pudieron cargar tiendas.'
        : null

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: '#0f1115',
        color: '#f7f9fc',
        p: 2
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          bgcolor: '#181c24',
          color: 'inherit'
        }}
      >
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            Elegir tienda
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta elección marca la tienda para el <strong>dashboard</strong>{' '}
            (eventos de la semana, correos físicos y puntos por tienda). El
            panel de admin usa el mismo contexto.
          </Typography>
          {listError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {listError}
            </Alert>
          ) : null}
          {chooseError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {chooseError}
            </Alert>
          ) : null}
          {status === 'authenticated' && isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} sx={{ color: '#f7f9fc' }} />
            </Box>
          ) : (
            <Stack spacing={1}>
              {stores.map(s => (
                <Button
                  key={s.id}
                  variant="outlined"
                  disabled={working !== null}
                  onClick={() => choose(s.id)}
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1.5,
                    textTransform: 'none',
                    color: '#f7f9fc',
                    borderColor: 'rgba(255,255,255,0.25)'
                  }}
                >
                  {working === s.id ? `${s.name}…` : s.name}
                </Button>
              ))}
            </Stack>
          )}
          {stores.length === 0 &&
          status === 'authenticated' &&
          !isPending &&
          !listError ? (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Sin tiendas configuradas para tu cuenta en este servidor.
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  )
}
