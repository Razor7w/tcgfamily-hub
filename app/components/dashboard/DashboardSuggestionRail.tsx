'use client'

import { useState } from 'react'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  useSubmitUserSuggestion,
  useUserSuggestion
} from '@/hooks/useUserSuggestion'
import { USER_SUGGESTION_MAX_LEN } from '@/lib/user-suggestion-text'

export default function DashboardSuggestionRail() {
  const { data, isPending, isError, error, refetch } = useUserSuggestion()
  const submit = useSubmitUserSuggestion()
  const [draft, setDraft] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const hasSubmitted = Boolean(data?.hasSubmitted && data.suggestion)
  const suggestion = data?.suggestion ?? null

  const handleSubmit = () => {
    setSubmitError(null)
    const text = draft.trim()
    if (!text) {
      setSubmitError('Escribe tu sugerencia antes de enviar.')
      return
    }
    submit.mutate(text, {
      onSuccess: () => setDraft(''),
      onError: e => {
        setSubmitError(
          e instanceof Error ? e.message : 'No se pudo enviar la sugerencia'
        )
      }
    })
  }

  return (
    <Card
      variant="outlined"
      data-tour="dashboard-suggestion-rail"
      sx={{
        borderRadius: 3,
        borderColor: t => alpha(t.palette.text.primary, 0.1),
        minHeight: { lg: 320 }
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main'
            }}
          >
            <LightbulbOutlinedIcon fontSize="small" aria-hidden />
          </Box>
        }
        title="¿Tienes una sugerencia?"
        slotProps={{
          title: { variant: 'subtitle1', sx: { fontWeight: 800 } },
          subheader: { sx: { lineHeight: 1.45 } }
        }}
      />
      <CardContent sx={{ pt: 0 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {error instanceof Error ? error.message : 'No se pudo cargar'}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => refetch()}>
              Reintentar
            </Button>
          </Stack>
        ) : hasSubmitted && suggestion ? (
          <Stack spacing={2}>
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ borderRadius: 2 }}
            >
              Gracias, ya recibimos tu sugerencia.
            </Alert>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: t => alpha(t.palette.text.primary, 0.02)
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 0.06, lineHeight: 1.3 }}
              >
                Tu comentario
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.75,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  wordBreak: 'break-word'
                }}
              >
                {suggestion.text}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.25, fontWeight: 600 }}
              >
                Enviado el{' '}
                {new Date(suggestion.createdAt).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ lineHeight: 1.5 }}
            >
              No puedes enviar otra sugerencia con esta cuenta. Si necesitas
              ampliar algo, contáctanos por los canales de la tienda.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              Cuéntanos qué te gustaría ver en la plataforma. Revisamos todas
              las ideas; solo puedes enviar una vez.
            </Typography>
            <TextField
              label="Tu sugerencia"
              placeholder="Ej.: torneos online con chat por mesa, más filtros en mazos públicos…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              multiline
              minRows={4}
              maxRows={8}
              fullWidth
              disabled={submit.isPending}
              inputProps={{ maxLength: USER_SUGGESTION_MAX_LEN }}
              helperText={`${draft.length}/${USER_SUGGESTION_MAX_LEN}`}
            />
            {submitError ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {submitError}
              </Alert>
            ) : null}
            <Button
              variant="contained"
              fullWidth
              disabled={submit.isPending || !draft.trim()}
              onClick={handleSubmit}
              sx={{ fontWeight: 700 }}
            >
              {submit.isPending ? 'Enviando…' : 'Enviar sugerencia'}
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
