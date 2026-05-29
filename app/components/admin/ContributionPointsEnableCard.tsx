'use client'

import { useMemo, useState } from 'react'
import NextLink from 'next/link'
import WorkspacePremium from '@mui/icons-material/WorkspacePremium'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha, type Theme } from '@mui/material/styles'
import { useUpdateContributionPointsSettings } from '@/hooks/useDashboardModules'
import type { ContributionPointsAdminSettings } from '@/lib/dashboard-module-config'

export default function ContributionPointsEnableCard({
  initial
}: {
  initial: ContributionPointsAdminSettings
}) {
  const update = useUpdateContributionPointsSettings()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(
    () => enabled !== initial.enabled,
    [enabled, initial.enabled]
  )

  const handleSave = () => {
    setError(null)
    update.mutate({ ...initial, enabled })
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08)
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              color: 'secondary.main',
              border: '1px solid',
              borderColor: (t: Theme) => alpha(t.palette.secondary.main, 0.2)
            }}
          >
            <WorkspacePremium aria-hidden />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              Puntos de contribución
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.6 }}
            >
              Activa o desactiva la reputación por participación en el hub de
              esta tienda. Los niveles y cuánto suma cada acción se configuran
              en{' '}
              <Link
                component={NextLink}
                href="/admin/contribucion"
                fontWeight={600}
              >
                Contribución
              </Link>
              .
            </Typography>
          </Box>
        </Stack>

        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(_, v) => {
                setError(null)
                setEnabled(v)
              }}
              color="secondary"
            />
          }
          label={
            <Typography variant="body2" fontWeight={600}>
              Activar puntos de contribución en el hub de esta tienda
            </Typography>
          }
          sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5, mb: 2 }}
        />

        {error ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {update.isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {update.error instanceof Error
              ? update.error.message
              : 'Error al guardar'}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => {
              setEnabled(initial.enabled)
              setError(null)
            }}
            disabled={!dirty || update.isPending}
          >
            Deshacer
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSave}
            disabled={!dirty || update.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
