'use client'

import { Box, Typography } from '@mui/material'
import R2UppyImageDashboard from '@/components/r2/R2UppyImageDashboard'

export default function R2DemoPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 2 }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}
      >
        Demo: subida de imágenes a Cloudflare R2
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Esta pantalla sirve para probar el módulo con Uppy. Necesitas sesión
        iniciada para generar URLs firmadas.
      </Typography>
      <R2UppyImageDashboard />
    </Box>
  )
}
