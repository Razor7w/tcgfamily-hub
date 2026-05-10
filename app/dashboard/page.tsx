'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import MuiLink from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'
import DashboardHomeContent from '@/components/dashboard/DashboardHomeContent'
import { alpha } from '@mui/material/styles'

export default function DashboardPage() {
  const { data: session } = useSession()
  const activeId = session?.user?.activeStoreId?.trim() ?? ''
  const [resolvedStoreName, setResolvedStoreName] = useState<{
    storeId: string
    name: string
  } | null>(null)

  const activeStoreLine =
    activeId &&
    resolvedStoreName?.storeId === activeId &&
    resolvedStoreName.name
      ? resolvedStoreName.name
      : ''

  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/stores')
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          stores?: Array<{ id?: string; name?: string }>
        }
        const rows = Array.isArray(data.stores) ? data.stores : []
        const hit = rows.find(r => String(r.id) === activeId)
        const n = typeof hit?.name === 'string' ? hit.name : ''
        if (!cancelled) {
          setResolvedStoreName({ storeId: activeId, name: n })
        }
      } catch {
        if (!cancelled) {
          setResolvedStoreName({ storeId: activeId, name: '' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeId])

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Inicio
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            Hola {session?.user?.name ?? ''}
            {activeStoreLine ? ` · ${activeStoreLine}` : ''}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 640 }}
          >
            Calendario, correos en tienda, puntos y accesos rápidos ligados al
            contexto de tu tienda activa. Tu actividad como jugador está en{' '}
            <MuiLink
              component={Link}
              href="/dashboard/mi-cuenta"
              fontWeight={700}
              underline="always"
            >
              Mi cuenta
            </MuiLink>
            .
          </Typography>
        </Box>

        <DashboardHomeContent variant="inicio" />
      </Container>
    </Box>
  )
}
