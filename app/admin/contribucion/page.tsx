'use client'

import { useMemo } from 'react'
import NextLink from 'next/link'
import { ArrowBack, WorkspacePremium } from '@mui/icons-material'
import {
  Alert,
  alpha,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Stack,
  Typography
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import ContributionPointsRulesEditor from '@/components/admin/ContributionPointsRulesEditor'
import { useAdminConfiguracion } from '@/hooks/useDashboardModules'
import { useMeStores } from '@/hooks/useMeStores'
import { mergeDashboardSettings } from '@/lib/dashboard-module-config'

export default function AdminContribucionPage() {
  const { data: session } = useSession()
  const { data: meStoresForLabel } = useMeStores()
  const activeStoreId = session?.user?.activeStoreId?.trim()

  const activeStoreDisplayName = useMemo(() => {
    if (!activeStoreId) return null
    const rows = meStoresForLabel?.stores ?? []
    const hit = rows.find(r => String(r.id) === activeStoreId)
    const name = hit && typeof hit.name === 'string' ? hit.name.trim() : ''
    return name || null
  }, [activeStoreId, meStoresForLabel?.stores])

  const { data, dataUpdatedAt, isPending, isError, error, refetch } =
    useAdminConfiguracion()

  const contributionInitial =
    data?.contributionPoints ??
    mergeDashboardSettings(data?.settings ?? null).contributionPoints ??
    mergeDashboardSettings(null).contributionPoints

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Button
            component={NextLink}
            href="/admin/configuracion"
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Configuración
          </Button>

          <Stack
            spacing={2.5}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: { xs: 3, sm: 4 },
              border: '1px solid',
              borderColor: t => alpha(t.palette.text.primary, 0.08),
              bgcolor: 'background.paper',
              boxShadow: '0 20px 40px -24px rgba(24, 24, 27, 0.12)'
            }}
          >
            <AdminStorePageHeading showActiveStoreAvatar>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    flexShrink: 0,
                    color: 'secondary.main',
                    border: '1px solid',
                    borderColor: t => alpha(t.palette.secondary.main, 0.2)
                  }}
                >
                  <WorkspacePremium aria-hidden />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15
                    }}
                  >
                    Contribución
                  </Typography>
                  {activeStoreDisplayName ? (
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ mt: 0.75, fontWeight: 700 }}
                    >
                      Tienda activa: {activeStoreDisplayName}
                    </Typography>
                  ) : null}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, maxWidth: 620, lineHeight: 1.6 }}
                  >
                    Niveles de reputación (histórico) y puntos por acción para
                    esta tienda. El total acumulado y los niveles no se
                    reinician; el ranking del mes usa el calendario de Chile.
                    Activar o desactivar el módulo en{' '}
                    <Link
                      component={NextLink}
                      href="/admin/configuracion"
                      fontWeight={600}
                    >
                      Configuración
                    </Link>
                    .
                  </Typography>
                </Box>
              </Stack>
            </AdminStorePageHeading>
          </Stack>

          {isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            >
              {error instanceof Error ? error.message : 'Error al cargar'}
            </Alert>
          ) : (
            <ContributionPointsRulesEditor
              key={`contrib-rules-${dataUpdatedAt}`}
              initial={contributionInitial}
            />
          )}
        </Stack>
      </Container>
    </Box>
  )
}
