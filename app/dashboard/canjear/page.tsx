'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBack from '@mui/icons-material/ArrowBack'
import { alpha } from '@mui/material/styles'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import StoreHubTournamentPointsCard from '@/components/dashboard/StoreHubTournamentPointsCard'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMeStores } from '@/hooks/useMeStores'

function TournamentPointsCanjearBody() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: meStoresData } = useMeStores()
  const { storeCredit } = useDashboardModulesFromLayout()
  const tournamentEnabled = storeCredit.tournamentPointsEnabled
  const label = storeCredit.tournamentPointsLabel

  const hubHref = useMemo(() => {
    const activeStoreId = session?.user?.activeStoreId?.trim() ?? ''
    if (!activeStoreId) return '/dashboard'
    const hit = (meStoresData?.stores ?? []).find(
      r => String(r.id) === activeStoreId
    )
    const slug =
      typeof hit?.slug === 'string' ? hit.slug.trim().toLowerCase() : ''
    return slug ? `/${encodeURIComponent(slug)}` : '/dashboard'
  }, [session?.user?.activeStoreId, meStoresData?.stores])

  useEffect(() => {
    if (!tournamentEnabled) {
      router.replace(hubHref)
    }
  }, [tournamentEnabled, router, hubHref])

  if (!tournamentEnabled) return null

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Button
            component={Link}
            href={hubHref}
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Volver
          </Button>
          <Stack spacing={0.75}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              Canjear {label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Genera un cupón con tu saldo, sácale captura y muéstralo en la
              tienda dentro de 24 horas.
            </Typography>
          </Stack>
          <StoreHubTournamentPointsCard variant="page" />
        </Stack>
      </Container>
    </Box>
  )
}

export default function DashboardCanjearPage() {
  return (
    <DashboardModuleRouteGate moduleId="storePoints">
      <TournamentPointsCanjearBody />
    </DashboardModuleRouteGate>
  )
}
