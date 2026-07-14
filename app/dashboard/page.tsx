'use client'

import Link from 'next/link'
import { useState } from 'react'
import Insights from '@mui/icons-material/Insights'
import Storefront from '@mui/icons-material/Storefront'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useSession } from 'next-auth/react'
import RegisterMailDialog from '@/components/mails/RegisterMailDialog'
import DashboardHomeDiscoverCard from '@/components/dashboard/DashboardHomeDiscoverCard'
import DashboardHomeTournamentsCard from '@/components/dashboard/DashboardHomeTournamentsCard'
import DashboardInStoreMailsCard from '@/components/dashboard/DashboardInStoreMailsCard'
import DashboardRegisterMailShortcut from '@/components/dashboard/DashboardRegisterMailShortcut'
import RecentPublicDecklistsHomeCard from '@/components/dashboard/RecentPublicDecklistsHomeCard'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useStoreHubHref } from '@/hooks/useStoreHubHref'
import DashboardPlayerTour from '@/components/tour/DashboardPlayerTour'

export default function DashboardPage() {
  const { data: session } = useSession()
  const storeHubHref = useStoreHubHref()
  const name = session?.user?.name?.trim() || 'jugador'
  const { shortcuts } = useDashboardModulesFromLayout()

  const [registerMailOpen, setRegisterMailOpen] = useState(false)

  return (
    <>
      <DashboardPlayerTour />
      <Box
        sx={t => ({
          minHeight: '100dvh',
          background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
          py: 4
        })}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1120,
            mx: 'auto',
            px: { xs: 2, sm: 3 }
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'minmax(0, 1fr) auto'
              },
              gap: { xs: 2, sm: 2.5 },
              alignItems: { sm: 'center' },
              mb: 3
            }}
          >
            <Box>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  textWrap: 'balance'
                }}
              >
                Inicio
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ textWrap: 'pretty', maxWidth: '42ch' }}
              >
                Hola, {name}.
              </Typography>
            </Box>

            {shortcuts.createMail ? (
              <DashboardRegisterMailShortcut
                onRegisterMail={() => setRegisterMailOpen(true)}
              />
            ) : null}
          </Box>

          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))'
                },
                gap: { xs: 2, md: 2.5 },
                alignItems: 'stretch',
                '& > :only-child': {
                  gridColumn: { md: '1 / -1' }
                }
              }}
            >
              <DashboardInStoreMailsCard />
              <DashboardHomeTournamentsCard />
            </Box>

            <DashboardHomeDiscoverCard />

            <RecentPublicDecklistsHomeCard />

            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.08em',
                display: 'block',
                pt: 0.5
              }}
            >
              Continuar en el panel
            </Typography>

            <Stack spacing={2}>
              <Card
                variant="outlined"
                sx={{ borderRadius: 3 }}
                data-tour="dashboard-card-tiendas"
              >
                <CardActionArea component={Link} href={storeHubHref}>
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 2.5
                    }}
                  >
                    <Storefront color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Tiendas
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Eventos de la tienda activa, correo y puntos.
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardActionArea component={Link} href="/dashboard/tu-actividad">
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 2.5
                    }}
                  >
                    <Insights color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Tu actividad
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Torneos, estadísticas y mazos enlazados a tu perfil.
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Stack>
          </Stack>

          <RegisterMailDialog
            open={registerMailOpen}
            onClose={() => setRegisterMailOpen(false)}
          />
        </Box>
      </Box>
    </>
  )
}
