'use client'

import { signOut } from 'next-auth/react'
import Button from '@mui/material/Button'

export default function SignOutButton() {
  return (
    <Button
      variant="contained"
      size="large"
      fullWidth
      onClick={() => signOut({ callbackUrl: '/' })}
      sx={{ mt: 1, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
    >
      Cerrar sesión
    </Button>
  )
}
