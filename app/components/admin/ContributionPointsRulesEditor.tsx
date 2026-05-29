'use client'

import { useMemo, useState } from 'react'
import NextLink from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { alpha, type Theme } from '@mui/material/styles'
import { useUpdateContributionPointsSettings } from '@/hooks/useDashboardModules'
import type { ContributionPointsAdminSettings } from '@/lib/dashboard-module-config'
import { validateContributionPointsAdmin } from '@/lib/contribution-points-admin-settings'
import {
  CONTRIBUTION_ACTION_LABELS,
  CONTRIBUTION_CATEGORY_LABELS,
  type ContributionPointAction,
  type ContributionPointCategory
} from '@/lib/contribution-points/types'

const RULE_GROUPS: {
  category: ContributionPointCategory
  actions: ContributionPointAction[]
}[] = [
  {
    category: 'tournament',
    actions: ['tournament_pre_registered', 'tournament_participated']
  },
  {
    category: 'tournament_deck',
    actions: ['own_deck_reported', 'decklist_ref']
  },
  {
    category: 'tournament_log',
    actions: ['opponent_sprites', 'round_complete']
  },
  {
    category: 'mail',
    actions: ['mail_received_in_store', 'mail_withdrawn_in_store']
  }
]

export default function ContributionPointsRulesEditor({
  initial
}: {
  initial: ContributionPointsAdminSettings
}) {
  const update = useUpdateContributionPointsSettings()
  const [settings, setSettings] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initial),
    [initial, settings]
  )

  const handleSave = () => {
    const validationError = validateContributionPointsAdmin(settings)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    update.mutate({ ...settings, enabled: initial.enabled })
  }

  const setThreshold = (index: 0 | 1 | 2, raw: string) => {
    const n = Math.round(Number(raw))
    if (!Number.isFinite(n)) return
    setSettings(s => {
      const next: [number, number, number] = [...s.tierThresholds]
      next[index] = n
      return { ...s, tierThresholds: next }
    })
  }

  const setLabel = (index: 0 | 1 | 2, raw: string) => {
    setSettings(s => {
      const next: [string, string, string] = [...s.tierLabels]
      next[index] = raw
      return { ...s, tierLabels: next }
    })
  }

  const setRule = (action: ContributionPointAction, raw: string) => {
    const n = Math.round(Number(raw))
    if (!Number.isFinite(n)) return
    setSettings(s => ({
      ...s,
      pointRules: {
        ...s.pointRules,
        [action]: Math.min(999, Math.max(0, n))
      }
    }))
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
        {!initial.enabled ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            El módulo está desactivado. Actívalo en{' '}
            <Link
              component={NextLink}
              href="/admin/configuracion"
              fontWeight={600}
            >
              Configuración
            </Link>{' '}
            para que los jugadores vean sus puntos en el hub.
          </Alert>
        ) : null}

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Niveles (umbrales y nombres)
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {([0, 1, 2] as const).map(i => (
            <Stack
              key={i}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
            >
              <TextField
                label={`Umbral tier ${i + 1}`}
                type="number"
                size="small"
                value={settings.tierThresholds[i]}
                onChange={e => setThreshold(i, e.target.value)}
                inputProps={{ min: 1, max: 999_999 }}
                sx={{ width: { sm: 160 } }}
              />
              <TextField
                label="Nombre del nivel"
                size="small"
                fullWidth
                value={settings.tierLabels[i]}
                onChange={e => setLabel(i, e.target.value)}
                inputProps={{ maxLength: 60 }}
              />
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
          Puntos por acción
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cada tienda define cuánto suma cada acción (0 = no otorga puntos). Los
          torneos custom no aplican a reportes de mazo ni bitácora.
        </Typography>

        <Stack spacing={2.5} sx={{ mb: 2 }}>
          {RULE_GROUPS.map(group => (
            <Box key={group.category}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontWeight: 800 }}
              >
                {CONTRIBUTION_CATEGORY_LABELS[group.category]}
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {group.actions.map(action => (
                  <Stack
                    key={action}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ flex: 1, minWidth: 0, lineHeight: 1.45 }}
                    >
                      {CONTRIBUTION_ACTION_LABELS[action]}
                    </Typography>
                    <TextField
                      label="Puntos"
                      type="number"
                      size="small"
                      value={settings.pointRules[action]}
                      onChange={e => setRule(action, e.target.value)}
                      inputProps={{ min: 0, max: 999 }}
                      sx={{ width: { sm: 120 }, flexShrink: 0 }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>

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

        {update.isSuccess && !dirty ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Cambios guardados.
          </Alert>
        ) : null}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => {
              setSettings(initial)
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
