'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolveAuthCallbackUrl } from '@/lib/auth-callback-url'
import { useEffect, Suspense } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import GoogleIcon from '@mui/icons-material/Google'
import AppVersion from '@/components/AppVersion'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'
import EmailPasswordSignInForm from '@/components/auth/EmailPasswordSignInForm'
import { signIn } from 'next-auth/react'
import {
  MUST_CHANGE_PASSWORD_PATH,
  sessionRequiresPasswordChange
} from '@/lib/must-change-password-path'

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
          minHeight: '100vh',
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
        minHeight: '100vh',
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
          justifyContent: 'center',
          p: 2
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 440,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 3
          }}
        >
          <Box
            component="h1"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              m: 0
            }}
          >
            <BrandLogo variant="wordmark" size="lg" href="/" />
          </Box>
          <Suspense fallback={null}>
            <LoginAlerts />
          </Suspense>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Accede con tu correo o elige otra opción más abajo.
          </Typography>
          <EmailPasswordSignInForm callbackUrl={callbackUrl} />
          <Divider sx={{ my: 1 }}>Otras opciones para iniciar sesión</Divider>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => signIn('google', { callbackUrl })}
            sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
          >
            Iniciar sesión con Google
          </Button>
        </Paper>
      </Box>
      <Box component="footer" sx={{ py: 2, textAlign: 'center' }}>
        <AppVersion />
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
            minHeight: '100vh',
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
