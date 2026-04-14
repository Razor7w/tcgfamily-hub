'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import GoogleIcon from '@mui/icons-material/Google'
import Header from '@/components/Header'
import EmailPasswordSignInForm from '@/components/auth/EmailPasswordSignInForm'
import { signIn } from 'next-auth/react'

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

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])

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
          <Typography
            component="h1"
            variant="h4"
            fontWeight={600}
            color="primary"
            textAlign="center"
          >
            TCGFamily HUB
          </Typography>
          <Suspense fallback={null}>
            <LoginAlerts />
          </Suspense>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Accede con tu correo o elige otra opción más abajo.
          </Typography>
          <EmailPasswordSignInForm />
          <Divider sx={{ my: 1 }}>Otras opciones para iniciar sesión</Divider>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
          >
            Iniciar sesión con Google
          </Button>
        </Paper>
      </Box>
    </Box>
  )
}
