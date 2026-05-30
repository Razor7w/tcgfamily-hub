'use client'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
const STEPS = [
  {
    n: 1,
    title: 'Cargar TDF',
    detail: 'Archivo exportado desde TOM al terminar el torneo.'
  },
  {
    n: 2,
    title: 'Preinscribir',
    detail: 'Opcional si ya tenías lista en la pestaña anterior.'
  },
  {
    n: 3,
    title: 'Clasificación',
    detail: 'Unificar categorías y revisar puestos con OWP/OOWP.'
  },
  {
    n: 4,
    title: 'Guardar',
    detail: 'Guardar Sénior o subir torneo completo para cerrar.'
  }
] as const

export default function AdminEventTdfWorkflowGuide() {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main'
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        Pasos recomendados
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)'
          },
          gap: 1.25
        }}
      >
        {STEPS.map(step => (
          <Stack
            key={step.n}
            direction="row"
            spacing={1.25}
            alignItems="flex-start"
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 13,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {step.n}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} lineHeight={1.3}>
                {step.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.35, lineHeight: 1.45 }}
              >
                {step.detail}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </Paper>
  )
}
