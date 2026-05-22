'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import BrandLogo from '@/components/brand/BrandLogo'
import AppVersion from '@/components/AppVersion'
import { sessionRequiresPasswordChange } from '@/lib/must-change-password-path'

/** MUI TextField + useId: solo cliente para evitar hydration mismatch en ids. */
const ForcePasswordChangeForm = dynamic(
  () => import('@/components/auth/ForcePasswordChangeForm'),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }
)

export default function CambiarContrasenaPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace('/')
      return
    }
    if (status === 'authenticated' && !sessionRequiresPasswordChange(session)) {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  async function handleSuccess() {
    await update({ mustChangePassword: false })
    router.replace('/dashboard')
  }

  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (status !== 'authenticated' || !sessionRequiresPasswordChange(session)) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 4
      }}
    >
      <Box sx={{ mb: 3 }}>
        <BrandLogo size="md" href="/" />
      </Box>
      <ForcePasswordChangeForm onSuccess={handleSuccess} />
      <Box sx={{ mt: 3 }}>
        <AppVersion />
      </Box>
    </Box>
  )
}
