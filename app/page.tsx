'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resolveAuthCallbackUrl } from '@/lib/auth-callback-url'
import { useEffect, Suspense } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import GoogleIcon from '@mui/icons-material/Google'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import { alpha } from '@mui/material/styles'
import AppVersion from '@/components/AppVersion'
import BrandLogo from '@/components/brand/BrandLogo'
import BrandMarkSvg from '@/components/brand/BrandMarkSvg'
import Header from '@/components/Header'
import EmailPasswordSignInForm from '@/components/auth/EmailPasswordSignInForm'
import { signIn } from 'next-auth/react'
import {
  MUST_CHANGE_PASSWORD_PATH,
  sessionRequiresPasswordChange
} from '@/lib/must-change-password-path'

const LOGIN_NOVEDADES = [
  {
    index: '02',
    title: 'Puntos de contribución',
    body: 'Reputación por tienda: torneos, mazo, bitácora y correo.'
  },
  {
    index: '03',
    title: 'Hub por tienda activa',
    body: 'Eventos, retiro y ranking.'
  }
] as const

function LoginAlerts() {
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered')

  if (registered !== '1') return null
  return (
    <Alert severity="success" sx={{ width: '100%' }}>
      Cuenta creada. Inicia sesión con tu correo y contraseña.
    </Alert>
  )
}

/** Card tipo ticket de correo: borde discontinuo + perforación lateral. */
function GuestMailTicketCard() {
  return (
    <Box
      component={Link}
      href="/correo/invitado"
      aria-label="Registrar correo como invitado, sin cuenta"
      sx={t => {
        const paper = t.palette.background.paper
        return {
          position: 'relative',
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          borderRadius: 2.5,
          overflow: 'visible',
          isolation: 'isolate',
          // Fondo con “mordidas” laterales (muestran el panel detrás)
          background: `
            radial-gradient(circle at 0 52%, transparent 9px, ${paper} 9.5px) left / 18px 100% no-repeat,
            radial-gradient(circle at 100% 52%, transparent 9px, ${paper} 9.5px) right / 18px 100% no-repeat,
            linear-gradient(${paper}, ${paper}) center / calc(100% - 34px) 100% no-repeat
          `,
          boxShadow: `
            0 1px 0 ${alpha(t.palette.common.white, 0.65)} inset,
            0 28px 50px -32px ${alpha(t.palette.primary.dark, 0.55)}
          `,
          transition:
            'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease',
          willChange: 'transform',
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none'
          },
          '&:hover': {
            transform: 'translateY(-4px) rotate(-0.45deg)',
            boxShadow: `
              0 1px 0 ${alpha(t.palette.common.white, 0.7)} inset,
              0 36px 58px -28px ${alpha(t.palette.primary.dark, 0.62)}
            `
          },
          '&:active': {
            transform: 'translateY(-1px) scale(0.995)'
          },
          '&:focus-visible': {
            outline: `2px solid ${t.palette.primary.main}`,
            outlineOffset: 4
          }
        }
      }}
    >
      <Box
        sx={t => ({
          mx: '10px',
          borderRadius: 2,
          overflow: 'hidden'
        })}
      >
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1.15 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'primary.main',
                  mb: 0.75
                }}
              >
                01 · Sin cuenta
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.05,
                  fontSize: { xs: '1.45rem', sm: '1.65rem' },
                  maxWidth: '11ch',
                  textWrap: 'balance'
                }}
              >
                Correo de invitado
              </Typography>
            </Box>
            <Box
              sx={t => ({
                width: 42,
                height: 42,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(t.palette.primary.main, 0.12),
                color: 'primary.main',
                flexShrink: 0
              })}
            >
              <ArrowOutwardIcon fontSize="small" />
            </Box>
          </Stack>
        </Box>

        <Box
          sx={t => ({
            mx: 2,
            borderTop: `1px dashed ${alpha(t.palette.primary.main, 0.28)}`
          })}
        />

        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.75 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.55,
              maxWidth: '34ch',
              textWrap: 'pretty',
              mb: 1.5
            }}
          >
            Genera el código con tu RUT, sácale captura y mándasela a quien
            retire en tienda.
          </Typography>
          <Typography
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'primary.main',
              letterSpacing: '-0.01em'
            }}
          >
            Registrar ahora
            <Box
              component="span"
              aria-hidden
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                opacity: 0.7
              }}
            >
              → CODE
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function LoginNovedadesPanel() {
  return (
    <Box
      component="aside"
      aria-label="Novedades"
      sx={t => ({
        position: 'relative',
        height: '100%',
        minHeight: { md: '100%' },
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: { xs: 'flex-start', md: 'center' },
        px: { xs: 2.5, sm: 3.5, md: 5, lg: 7 },
        pt: { xs: 3.5, md: 6 },
        pb: { xs: 4.5, md: 7 },
        bgcolor: alpha(t.palette.primary.main, 0.06),
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 0% 0%, ${alpha(t.palette.primary.main, 0.28)}, transparent 58%),
          radial-gradient(ellipse 50% 40% at 100% 90%, ${alpha(t.palette.primary.light, 0.18)}, transparent 55%),
          linear-gradient(155deg, ${alpha(t.palette.primary.dark, 0.08)} 0%, transparent 45%)
        `,
        // Corte diagonal suave hacia el login
        clipPath: {
          xs: 'none',
          md: 'polygon(0 0, 100% 0, 94% 100%, 0 100%)'
        }
      })}
    >
      {/* Marca de agua */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: { md: '-6%', lg: '-2%' },
          bottom: { md: '-4%', lg: '2%' },
          opacity: 0.07,
          transform: 'rotate(-12deg) scale(1.15)',
          pointerEvents: 'none',
          display: { xs: 'none', md: 'block' },
          color: 'primary.dark'
        }}
      >
        <BrandMarkSvg size={340} />
      </Box>

      {/* Número tipográfico decorativo */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          top: { md: 24, lg: 32 },
          right: { md: '12%', lg: '16%' },
          fontWeight: 800,
          fontSize: { md: '7rem', lg: '8.5rem' },
          lineHeight: 0.85,
          letterSpacing: '-0.06em',
          color: 'primary.main',
          opacity: 0.08,
          pointerEvents: 'none',
          display: { xs: 'none', md: 'block' },
          userSelect: 'none'
        }}
      >
        01
      </Typography>

      <Stack
        spacing={3.5}
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 480,
          width: '100%',
          '@keyframes loginIn': {
            from: { opacity: 0, transform: 'translateY(18px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          },
          '& > *': {
            animation: 'loginIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
          },
          '& > *:nth-of-type(1)': { animationDelay: '0.05s' },
          '& > *:nth-of-type(2)': { animationDelay: '0.14s' },
          '& > *:nth-of-type(3)': { animationDelay: '0.24s' }
        }}
      >
        <Box>
          <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
            <BrandLogo variant="wordmark" size="md" href="/" />
          </Box>
          <Typography
            component="p"
            sx={{
              m: 0,
              mb: 1.25,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'primary.main'
            }}
          >
            Novedades
          </Typography>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 0.98,
              fontSize: { xs: '2.15rem', sm: '2.55rem', md: '2.85rem' },
              maxWidth: '9ch',
              textWrap: 'balance'
            }}
          >
            Entra o manda correo
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mt: 1.5,
              lineHeight: 1.55,
              maxWidth: '32ch',
              textWrap: 'pretty',
              fontSize: '0.98rem'
            }}
          >
            Sin cuenta también puedes registrar un envío. Con cuenta gestionas
            todo desde el hub.
          </Typography>
        </Box>

        <GuestMailTicketCard />

        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {LOGIN_NOVEDADES.map((item, i) => (
            <Box
              component="li"
              key={item.index}
              sx={t => ({
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                columnGap: 2,
                py: 1.85,
                borderTop:
                  i === 0
                    ? `1px solid ${alpha(t.palette.primary.main, 0.18)}`
                    : undefined,
                borderBottom: `1px solid ${alpha(t.palette.primary.main, 0.18)}`
              })}
            >
              <Typography
                sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'primary.main',
                  pt: 0.2,
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {item.index}
              </Typography>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    mb: 0.35
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.5, maxWidth: '38ch', textWrap: 'pretty' }}
                >
                  {item.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Stack>
    </Box>
  )
}

function LoginFormColumn({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Box
      component="main"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2.25, sm: 3.5, md: 4, lg: 6 },
        pt: { xs: 3, md: 5 },
        pb: { xs: 3.5, md: 5.5 },
        position: 'relative'
      }}
    >
      <Box
        aria-hidden
        sx={t => ({
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 80% 20%, ${alpha(t.palette.primary.main, 0.06)}, transparent 60%),
            ${t.palette.background.default}
          `,
          pointerEvents: 'none'
        })}
      />

      <Box
        sx={t => ({
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          p: { xs: 2.5, sm: 3.25 },
          borderRadius: 4,
          bgcolor: alpha(t.palette.background.paper, 0.92),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${alpha(t.palette.common.white, 0.55)}`,
          boxShadow: `
            inset 0 1px 0 ${alpha(t.palette.common.white, 0.75)},
            0 28px 64px -40px ${alpha(t.palette.primary.dark, 0.4)}
          `,
          animation: 'loginIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
          '@keyframes loginIn': {
            from: { opacity: 0, transform: 'translateY(14px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        })}
      >
        <Box
          component="h1"
          sx={{
            display: 'flex',
            justifyContent: { xs: 'center', md: 'flex-start' },
            m: 0
          }}
        >
          <BrandLogo variant="wordmark" size="lg" href="/" />
        </Box>

        <Suspense fallback={null}>
          <LoginAlerts />
        </Suspense>

        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              fontSize: { xs: '1.55rem', sm: '1.7rem' },
              mb: 0.6,
              textAlign: { xs: 'center', md: 'left' }
            }}
          >
            Tu acceso
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: { xs: 'center', md: 'left' },
              lineHeight: 1.5,
              maxWidth: { md: '30ch' }
            }}
          >
            Correo y contraseña, o Google. Mazos, eventos y correos en un solo
            lugar.
          </Typography>
        </Box>

        <EmailPasswordSignInForm callbackUrl={callbackUrl} />

        <Divider
          sx={{
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            '&::before, &::after': { borderColor: 'divider' }
          }}
        >
          o
        </Divider>

        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={() => signIn('google', { callbackUrl })}
          sx={{
            py: 1.3,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2.5,
            borderWidth: 1.5,
            '&:hover': { borderWidth: 1.5 },
            '&:active': { transform: 'scale(0.985)' },
            transition: 'transform 0.15s ease'
          }}
        >
          Continuar con Google
        </Button>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1, mt: 2.5 }}>
        <AppVersion />
      </Box>
    </Box>
  )
}

function LoginPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = resolveAuthCallbackUrl(searchParams.get('callbackUrl'))

  useEffect(() => {
    if (status !== 'authenticated') return
    if (sessionRequiresPasswordChange(session)) {
      router.replace(MUST_CHANGE_PASSWORD_PATH)
      return
    }
    router.replace(callbackUrl)
  }, [status, session, router, callbackUrl])

  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default'
        }}
      >
        <Header />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    )
  }

  if (status === 'authenticated') {
    return null
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Header />
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 1.2fr) minmax(340px, 0.8fr)'
          },
          alignItems: 'stretch',
          minHeight: 0
        }}
      >
        <Box sx={{ order: { xs: 2, md: 1 } }}>
          <LoginNovedadesPanel />
        </Box>
        <Box sx={{ order: { xs: 1, md: 2 } }}>
          <LoginFormColumn callbackUrl={callbackUrl} />
        </Box>
      </Box>
    </Box>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default'
          }}
        >
          <Header />
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CircularProgress />
          </Box>
        </Box>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
