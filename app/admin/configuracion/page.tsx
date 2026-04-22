'use client'

import { useMemo, useState } from 'react'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined'
import SportsEsports from '@mui/icons-material/SportsEsports'
import MarkunreadMailbox from '@mui/icons-material/MarkunreadMailbox'
import PictureAsPdf from '@mui/icons-material/PictureAsPdf'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Container from '@mui/material/Container'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import { alpha, type Theme } from '@mui/material/styles'
import NextLink from 'next/link'
import {
  useAdminConfiguracion,
  useUpdateDashboardModuleSettings,
  useUpdateDashboardShortcuts,
  useUpdateMailRegisterDailyLimit,
  useUpdateResendPickupNotifySettings
} from '@/hooks/useDashboardModules'
import {
  DASHBOARD_MODULE_IDS,
  mergeDashboardSettings,
  type DashboardModuleId,
  type DashboardModuleSettingsDTO,
  type DashboardShortcutsVisibility
} from '@/lib/dashboard-module-config'
import {
  MAIL_REGISTER_DAILY_LIMIT,
  MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX
} from '@/lib/mail-register-constants'

const LABELS: Record<DashboardModuleId, string> = {
  weeklyEvents: 'Eventos de la semana (calendario y preinscripción)',
  myTournaments:
    'Mis torneos (resumen de participaciones, rondas y torneos custom)',
  statistics:
    'Estadísticas (récord y win rate por mazo, rivales en el detalle)',
  mail: 'Correo (últimos correos y registro)',
  storePoints: 'Crédito de tienda (puntos)'
}

function moveOrder(
  order: DashboardModuleId[],
  index: number,
  dir: -1 | 1
): DashboardModuleId[] {
  const j = index + dir
  if (j < 0 || j >= order.length) return order
  const next = [...order]
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

function DashboardModulesEditor({
  initial
}: {
  initial: DashboardModuleSettingsDTO
}) {
  const update = useUpdateDashboardModuleSettings()
  const [visibility, setVisibility] = useState(initial.visibility)
  const [order, setOrder] = useState<DashboardModuleId[]>(initial.order)

  const dirty = useMemo(
    () =>
      JSON.stringify(visibility) !== JSON.stringify(initial.visibility) ||
      JSON.stringify(order) !== JSON.stringify(initial.order),
    [initial, visibility, order]
  )

  const handleSave = () => {
    const payload: DashboardModuleSettingsDTO = {
      visibility,
      order,
      shortcuts: initial.shortcuts
    }
    update.mutate(payload)
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08)
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: '0.12em' }}
        >
          Visibilidad
        </Typography>
        <Stack sx={{ mt: 1.5, mb: 3 }} spacing={0.5}>
          {DASHBOARD_MODULE_IDS.map(id => (
            <FormControlLabel
              key={id}
              control={
                <Checkbox
                  checked={visibility[id]}
                  onChange={e =>
                    setVisibility(v => ({ ...v, [id]: e.target.checked }))
                  }
                />
              }
              label={LABELS[id]}
            />
          ))}
        </Stack>

        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: '0.12em' }}
        >
          Orden en la página
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, mb: 1.5 }}
        >
          El primero de la lista queda arriba del todo en el dashboard.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.1)
          }}
        >
          <Stack divider={<Divider flexItem />}>
            {order.map((id, index) => (
              <Stack
                key={id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.02)
                }}
              >
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                  {LABELS[id]}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Subir"
                  disabled={index === 0}
                  onClick={() => setOrder(o => moveOrder(o, index, -1))}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Bajar"
                  disabled={index === order.length - 1}
                  onClick={() => setOrder(o => moveOrder(o, index, 1))}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Paper>

        {update.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {update.error instanceof Error
              ? update.error.message
              : 'Error al guardar'}
          </Alert>
        ) : null}

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3 }}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            onClick={() => {
              setVisibility(initial.visibility)
              setOrder(initial.order)
            }}
            disabled={!dirty || update.isPending}
          >
            Deshacer
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave()}
            disabled={!dirty || update.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function DashboardShortcutsEditor({
  initial
}: {
  initial: DashboardShortcutsVisibility
}) {
  const update = useUpdateDashboardShortcuts()
  const [createMail, setCreateMail] = useState(initial.createMail)
  const [createTournament, setCreateTournament] = useState(
    initial.createTournament
  )
  const [playPokemonDecklistPdf, setPlayPokemonDecklistPdf] = useState(
    initial.playPokemonDecklistPdf
  )

  const dirty = useMemo(
    () =>
      createMail !== initial.createMail ||
      createTournament !== initial.createTournament ||
      playPokemonDecklistPdf !== initial.playPokemonDecklistPdf,
    [initial, createMail, createTournament, playPokemonDecklistPdf]
  )

  const handleSave = () => {
    update.mutate({ createMail, createTournament, playPokemonDecklistPdf })
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08)
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              color: 'primary.main',
              // bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.1),
              border: '1px solid',
              borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.2)
            }}
          >
            <SportsEsports aria-hidden />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              Accesos rápidos en el inicio
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.6 }}
            >
              Botones en la parte superior de{' '}
              <Link href="/dashboard" component={NextLink} fontWeight={600}>
                /dashboard
              </Link>{' '}
              para registrar un correo, crear un torneo custom o abrir el
              generador de PDF de listas. Puedes ocultar cada uno sin desactivar
              el bloque completo de correo o «Mis torneos».
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1.5}>
          <FormControlLabel
            control={
              <Switch
                checked={createMail}
                onChange={(_, v) => setCreateMail(v)}
                color="primary"
              />
            }
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <MarkunreadMailbox fontSize="small" color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Acceso «Registrar correo»
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Abre el mismo diálogo que el botón dentro del bloque de
                    correos.
                  </Typography>
                </Box>
              </Stack>
            }
            sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={createTournament}
                onChange={(_, v) => setCreateTournament(v)}
                color="primary"
              />
            }
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <SportsEsports fontSize="small" color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Acceso «Crear torneo custom»
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Abre el formulario de torneo personal (no ligado al
                    calendario de la tienda).
                  </Typography>
                </Box>
              </Stack>
            }
            sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={playPokemonDecklistPdf}
                onChange={(_, v) => setPlayPokemonDecklistPdf(v)}
                color="primary"
              />
            }
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <PictureAsPdf fontSize="small" color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Acceso «PDF de listas (Play! Pokémon)»
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Enlaza a la página de generación de hoja de listas (texto o
                    mazo guardado).
                  </Typography>
                </Box>
              </Stack>
            }
            sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5 }}
          />
        </Stack>

        {update.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {update.error instanceof Error
              ? update.error.message
              : 'Error al guardar'}
          </Alert>
        ) : null}

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3 }}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            onClick={() => {
              setCreateMail(initial.createMail)
              setCreateTournament(initial.createTournament)
              setPlayPokemonDecklistPdf(initial.playPokemonDecklistPdf)
            }}
            disabled={!dirty || update.isPending}
          >
            Deshacer
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave()}
            disabled={!dirty || update.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function MailRegisterDailyLimitCard({
  initialLimit
}: {
  initialLimit: number
}) {
  const update = useUpdateMailRegisterDailyLimit()
  const [value, setValue] = useState(String(initialLimit))

  const dirty = useMemo(() => {
    const n = Math.round(Number(value))
    if (!Number.isFinite(n)) return true
    return n !== initialLimit
  }, [value, initialLimit])

  const clamp = (n: number) =>
    Math.min(MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX, Math.max(1, Math.round(n)))

  const handleSave = () => {
    update.mutate(clamp(Number(value)))
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08)
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              color: 'primary.main',
              border: '1px solid',
              borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.2)
            }}
          >
            <MarkunreadMailbox aria-hidden />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              Registro de correos por usuario
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.6 }}
            >
              Cuántos correos puede registrar cada jugador por día (zona horaria
              Chile), desde el diálogo «Registrar correo» o la carga múltiple en{' '}
              <Link
                href="/dashboard/mail/registrar-multiples"
                component={NextLink}
                fontWeight={600}
              >
                /dashboard/mail/registrar-multiples
              </Link>
              . El servidor rechaza registros por encima de este límite.
            </Typography>
          </Box>
        </Stack>

        <TextField
          label="Máximo por día y usuario"
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={() => {
            const n = clamp(Number(value))
            setValue(String(n))
          }}
          size="small"
          slotProps={{
            htmlInput: {
              min: 1,
              max: MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX,
              step: 1
            }
          }}
          sx={{ maxWidth: 280 }}
          helperText={`Entre 1 y ${MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX}. Por defecto ${MAIL_REGISTER_DAILY_LIMIT}.`}
        />

        {update.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {update.error instanceof Error
              ? update.error.message
              : 'Error al guardar'}
          </Alert>
        ) : null}

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3 }}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            onClick={() => setValue(String(initialLimit))}
            disabled={!dirty || update.isPending}
          >
            Deshacer
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave()}
            disabled={!dirty || update.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function ResendPickupEmailCard({
  initialEnabled
}: {
  initialEnabled: boolean
}) {
  const update = useUpdateResendPickupNotifySettings()
  const [enabled, setEnabled] = useState(initialEnabled)

  const dirty = enabled !== initialEnabled

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08)
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              color: 'primary.main',
              bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.1),
              border: '1px solid',
              borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.2)
            }}
          >
            <MarkEmailReadOutlined aria-hidden />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              Correo (Resend)
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.6 }}
            >
              Cuando marcas un envío como{' '}
              <strong>recepcionado en tienda</strong>, el sistema puede enviar
              un correo al usuario con el código de retiro. Requiere{' '}
              <code style={{ fontSize: '0.9em' }}>RESEND_API_KEY</code> y
              remitente verificado (ver{' '}
              <code style={{ fontSize: '0.9em' }}>.env.example</code>).
            </Typography>
          </Box>
        </Stack>

        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(_, v) => setEnabled(v)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Enviar correo al recepcionar en tienda
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Si está desactivado, el registro en base de datos sigue igual;
                solo se omite Resend.
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5 }}
        />

        {update.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {update.error instanceof Error
              ? update.error.message
              : 'Error al guardar'}
          </Alert>
        ) : null}

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3 }}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            onClick={() => setEnabled(initialEnabled)}
            disabled={!dirty || update.isPending}
          >
            Deshacer
          </Button>
          <Button
            variant="contained"
            onClick={() => update.mutate(enabled)}
            disabled={!dirty || update.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function AdminConfiguracionPage() {
  const { data, dataUpdatedAt, isPending, isError, error, refetch } =
    useAdminConfiguracion()

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="lg">
        <Stack
          spacing={2.5}
          sx={{
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            borderRadius: { xs: 3, sm: 4 },
            border: '1px solid',
            borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
            bgcolor: 'background.paper',
            boxShadow: '0 20px 40px -24px rgba(24, 24, 27, 0.12)'
          }}
        >
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
              Configuración
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 620, lineHeight: 1.6 }}
            >
              Bloques del panel de jugadores en{' '}
              <Link href="/dashboard" component={NextLink} fontWeight={600}>
                /dashboard
              </Link>{' '}
              , límite diario de registro de correos por jugador y avisos por
              correo (Resend) cuando un envío queda listo para retiro en tienda.
            </Typography>
          </Box>
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
        ) : data ? (
          <Stack spacing={3}>
            <DashboardModulesEditor
              key={`dash-${dataUpdatedAt}`}
              initial={mergeDashboardSettings(data.settings)}
            />
            <DashboardShortcutsEditor
              key={`shortcuts-${dataUpdatedAt}`}
              initial={mergeDashboardSettings(data.settings).shortcuts}
            />
            <MailRegisterDailyLimitCard
              key={`mail-limit-${dataUpdatedAt}`}
              initialLimit={data.mailRegisterDailyLimit}
            />
            <ResendPickupEmailCard
              key={`email-${dataUpdatedAt}`}
              initialEnabled={data.resendNotifyPickupInStoreEnabled}
            />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <DashboardModulesEditor
              key="defaults"
              initial={mergeDashboardSettings(null)}
            />
            <DashboardShortcutsEditor
              key="shortcuts-defaults"
              initial={mergeDashboardSettings(null).shortcuts}
            />
            <MailRegisterDailyLimitCard
              key="mail-limit-defaults"
              initialLimit={MAIL_REGISTER_DAILY_LIMIT}
            />
            <ResendPickupEmailCard key="email-defaults" initialEnabled />
          </Stack>
        )}
      </Container>
    </Box>
  )
}
