'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import GoogleIcon from '@mui/icons-material/Google'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AppVersion from '@/components/AppVersion'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'
import { getAuthErrorContent } from '@/lib/auth-error-messages'

function AuthErrorBody() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const { title, message, hint, code } = getAuthErrorContent(errorCode)

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        maxWidth: 480,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 2.5
      }}
    >
      <Box
        component="h1"
        sx={{ display: 'flex', justifyContent: 'center', m: 0 }}
      >
        <BrandLogo variant="wordmark" size="lg" href="/" />
      </Box>
      <Typography variant="h5" fontWeight={600} color="error.main">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
      {hint ? (
        <Alert severity="info" icon={<OpenInNewIcon fontSize="inherit" />}>
          {hint}
        </Alert>
      ) : null}
      {process.env.NODE_ENV === 'development' && code ? (
        <Typography variant="caption" color="text.disabled">
          Código: {code}
        </Typography>
      ) : null}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<GoogleIcon />}
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        sx={{ py: 1.5, textTransform: 'none' }}
      >
        Reintentar con Google
      </Button>
      <Button
        component={Link}
        href="/"
        variant="outlined"
        size="large"
        fullWidth
        sx={{ textTransform: 'none' }}
      >
        Volver al inicio de sesión
      </Button>
      <Button
        component="a"
        href="https://tcgnexo.cl"
        variant="text"
        size="small"
        fullWidth
        sx={{ textTransform: 'none' }}
      >
        Abrir tcgnexo.cl en el navegador
      </Button>
    </Paper>
  )
}

export default function AuthErrorPage() {
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
        <Suspense fallback={null}>
          <AuthErrorBody />
        </Suspense>
      </Box>
      <Box component="footer" sx={{ py: 2, textAlign: 'center' }}>
        <AppVersion />
      </Box>
    </Box>
  )
}
