'use client'

import Typography from '@mui/material/Typography'
import { APP_VERSION } from '@/lib/app-version'

type AppVersionProps = {
  align?: 'left' | 'center'
}

/**
 * Muestra la versión actual (la de `package.json` al construir el bundle).
 * Tras subir versión y desplegar, los usuarios verán el número nuevo.
 */
export default function AppVersion({ align = 'center' }: AppVersionProps) {
  return (
    <Typography
      component="p"
      variant="caption"
      color="text.secondary"
      sx={{
        opacity: 0.85,
        m: 0,
        textAlign: align
      }}
    >
      Versión {APP_VERSION}
    </Typography>
  )
}
