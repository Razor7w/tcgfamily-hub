'use client'

import { signIn } from 'next-auth/react'
import Button from '@mui/material/Button'
import GoogleIcon from '@mui/icons-material/Google'

export default function SignInButton() {
  return (
    <Button
      variant="contained"
      size="large"
      fullWidth
      startIcon={<GoogleIcon />}
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      sx={{ mt: 1, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
    >
      Iniciar sesión con Google
    </Button>
  )
}
