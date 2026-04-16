'use client'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { CircularProgress, Divider, Stack } from '@mui/material'
import { useSession } from 'next-auth/react'
import { InfoOutlined, MarkunreadMailbox, Storefront } from '@mui/icons-material'
import CardMails from '@/components/dashboard/CardMails'
import MailFlowExplainer from '@/components/mails/MailFlowExplainer'
import RegisterMailDialog from '@/components/mails/RegisterMailDialog'
import Link from 'next/link'
import { useStoreCredit } from '@/hooks/useStoreCredit'
import WeeklyEventsSection from '@/components/events/WeeklyEventsSection'

export default function DashboardPage() {
  const { data: session } = useSession()
  const {
    data: credit,
    isPending: creditLoading,
    isError: creditQueryError,
    refetch: refetchCredit,
    isFetching: creditFetching
  } = useStoreCredit()
  const creditError = creditQueryError
    ? 'No se pudieron cargar los puntos'
    : null

  const pointsCurrency =
    credit != null
      ? new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          maximumFractionDigits: 0
        }).format(credit.storePoints)
      : ''
  const [storePointsInfoOpen, setStorePointsInfoOpen] = useState(false)
  const [registerMailOpen, setRegisterMailOpen] = useState(false)

  const expiryLabel =
    credit?.storePointsExpiryDate &&
    new Date(credit.storePointsExpiryDate).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Hola {session && session.user.name}
        </Typography>

        <Stack spacing={3}>
          <WeeklyEventsSection />

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardHeader
              title="Últimos correos"
              slotProps={{ title: { variant: 'h5' } }}
              subheader="Registro reciente y acceso al código en tienda"
              avatar={<MarkunreadMailbox color="primary" />}
              action={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setRegisterMailOpen(true)}
                  >
                    Registrar correo
                  </Button>
                  <Button component={Link} href="/dashboard/mail" size="small" variant="outlined">
                    Ver todos
                  </Button>
                </Stack>
              }
            />
            <CardContent>
              <MailFlowExplainer variant="compact" />
              <CardMails />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardHeader
              avatar={<Storefront color="primary" />}
              title="Crédito de tienda"
              subheader="TCG Family puntos (1 punto ≈ $1 en canje)"
              slotProps={{ title: { variant: 'h6' } }}
              action={
                <IconButton
                  aria-label="Información sobre los puntos de tienda"
                  onClick={() => setStorePointsInfoOpen(true)}
                  size="small"
                  color="primary"
                >
                  <InfoOutlined />
                </IconButton>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {creditLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : creditError ? (
                <Stack spacing={1.5} alignItems="flex-start">
                  <Typography color="text.secondary">{creditError}</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => refetchCredit()}
                    disabled={creditFetching}
                  >
                    {creditFetching ? 'Cargando…' : 'Reintentar'}
                  </Button>
                </Stack>
              ) : credit ? (
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: theme =>
                        alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ letterSpacing: 0.5, display: 'block', mb: 0.5 }}
                    >
                      Saldo actual
                    </Typography>
                    <Typography
                      variant="h3"
                      component="p"
                      sx={{
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.15,
                        mb: 0.5
                      }}
                    >
                      {credit.storePoints.toLocaleString('es-CL')}
                      <Typography
                        component="span"
                        variant="h5"
                        color="text.secondary"
                        sx={{ ml: 1, fontWeight: 600 }}
                      >
                        puntos
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Equivalente aproximado: {pointsCurrency}
                    </Typography>
                  </Box>

                  {credit.storePointsExpiringNext > 0 && (
                    <>
                      <Divider flexItem />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Próximos a vencer
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {credit.storePointsExpiringNext.toLocaleString('es-CL')} puntos
                          {expiryLabel ? ` · fecha de vencimiento: ${expiryLabel}` : ''}
                        </Typography>
                      </Box>
                    </>
                  )}
                  {credit.storePointsExpiringNext === 0 &&
                    credit.storePoints > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay puntos próximos a vencer con fecha informada en el
                        sistema.
                      </Typography>
                    )}
                  {credit.storePoints === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Tu saldo es 0. Los puntos se actualizan cuando el administrador
                      importa el reporte de la tienda.
                    </Typography>
                  )}
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Stack>

        <Dialog
          open={storePointsInfoOpen}
          onClose={() => setStorePointsInfoOpen(false)}
          maxWidth="sm"
          fullWidth
          aria-labelledby="store-points-info-title"
        >
          <DialogTitle id="store-points-info-title">
            TCG Family puntos
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" component="p" sx={{ mb: 2 }}>
              Los TCG Family puntos, tienen equivalencia de $1 cada uno, se
              obtienen al realizar compras por la web (1% del monto de la
              compra), al &quot;sacrificar&quot; cartas en la tienda (solo en
              días de intercambio que son informados previamente) y otros
              métodos informados por los canales de la comunidad.
            </Typography>
            <Typography variant="body2" component="p" sx={{ mb: 2 }}>
              Se debe tener un mínimo de 5000 puntos para poder canjearlos y
              debe hacerse de forma presencial o coordinándolo por mensaje de
              Instagram.
            </Typography>
            <Typography variant="body2" component="p">
              Tienen vigencia de 1 año desde su generación.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setStorePointsInfoOpen(false)} variant="contained">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        <RegisterMailDialog
          open={registerMailOpen}
          onClose={() => setRegisterMailOpen(false)}
        />
      </Container>
    </Box>
  )
}
