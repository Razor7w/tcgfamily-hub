'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined'
import Storefront from '@mui/icons-material/Storefront'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useSession } from 'next-auth/react'
import ReportCustomTournamentDialog from '@/components/events/ReportCustomTournamentDialog'
import RegisterMailDialog from '@/components/mails/RegisterMailDialog'
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions'
import RecentPublicDecklistsHomeCard from '@/components/dashboard/RecentPublicDecklistsHomeCard'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useStoreHubHref } from '@/hooks/useStoreHubHref'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const storeHubHref = useStoreHubHref()
  const name = session?.user?.name?.trim() || 'jugador'
  const { shortcuts } = useDashboardModulesFromLayout()

  const [registerMailOpen, setRegisterMailOpen] = useState(false)
  const [customTournamentOpen, setCustomTournamentOpen] = useState(false)
  const [weekAnchor] = useState(() => new Date())

  const showQuickActions =
    shortcuts.createMail ||
    shortcuts.createTournament ||
    shortcuts.playPokemonDecklistPdf

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          Inicio
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
          Hola, {name}.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: showQuickActions ? 2 : 3, lineHeight: 1.7, maxWidth: 640 }}
        >
          {showQuickActions ? (
            <>
              Aquí están los accesos directos a lo que hagas más a menudo. Podés{' '}
              seguir en Tiendas o en tu espacio personal.
            </>
          ) : (
            <>
              Elige si seguir en Tiendas con la tienda activa de la barra
              superior o en Mi cuenta como jugador.
            </>
          )}
        </Typography>

        <Stack spacing={3}>
          {showQuickActions ? (
            <Box sx={{ maxWidth: { xs: '100%', sm: 960 } }}>
              <DashboardQuickActions
                shortcuts={shortcuts}
                subtitle="Toman la tienda seleccionada en la barra superior. Los bloques están en Tiendas."
                onRegisterMail={() => setRegisterMailOpen(true)}
                onCreateCustomTournament={() => setCustomTournamentOpen(true)}
                onPlayPokemonDecklistPdf={() =>
                  router.push('/dashboard/decklist-pdf-torneo')
                }
              />
            </Box>
          ) : null}

          <Box sx={{ maxWidth: { xs: '100%', sm: 960 } }}>
            <RecentPublicDecklistsHomeCard />
          </Box>

          <Typography
            variant="overline"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'block',
              maxWidth: { xs: '100%', sm: 960 },
              pt: 0.5
            }}
          >
            Continuar en el panel
          </Typography>

          <Stack spacing={2} sx={{ maxWidth: { xs: '100%', sm: 960 } }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
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
              <CardActionArea component={Link} href="/dashboard/mi-cuenta">
                <CardContent
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 2.5
                  }}
                >
                  <AccountCircleOutlined
                    color="primary"
                    sx={{ fontSize: 40 }}
                  />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Mi cuenta
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
        <ReportCustomTournamentDialog
          open={customTournamentOpen}
          onClose={() => setCustomTournamentOpen(false)}
          weekAnchor={weekAnchor}
          onCreated={eventId => {
            setCustomTournamentOpen(false)
            router.push(`/dashboard/torneos-semana/${eventId}`)
          }}
        />
      </Container>
    </Box>
  )
}
