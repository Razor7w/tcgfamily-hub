'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { invalidateStoreScopedDashboardQueries } from '@/lib/invalidate-store-scoped-queries'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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

  const [stores, setStores] = useState<StoreOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (status !== 'authenticated') return
      try {
        const res = await fetch('/api/me/stores')
        if (!res.ok) {
          throw new Error('No se pudieron cargar tiendas.')
        }
        const data = await res.json()
        const rows = Array.isArray(data.stores)
          ? (data.stores as StoreOption[])
          : []
        if (!cancelled) setStores(rows)
      } catch (e: unknown) {
        if (!cancelled) setError(String(e instanceof Error ? e.message : e))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [status])

  async function choose(id: string) {
    setWorking(id)
    setError(null)
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
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setWorking(null)
    }
  }

  if (status === 'loading') return null

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
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
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
          {stores.length === 0 && status === 'authenticated' ? (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Sin tiendas configuradas para tu cuenta en este servidor.
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  )
}
