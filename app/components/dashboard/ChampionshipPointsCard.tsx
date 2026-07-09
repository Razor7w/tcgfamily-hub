'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined'
import LinkIcon from '@mui/icons-material/Link'
import {
  usePlayPokemonRankVisibility,
  useUpdatePlayPokemonRankVisibility
} from '@/hooks/usePlayPokemonRankVisibility'
import { PLAY_POKEMON_CHILE_LEADERBOARD_PATH } from '@/lib/play-pokemon-leaderboard/constants'
import { useMyChampionshipPoints } from '@/hooks/useMyChampionshipPoints'

const DIVISION_LABELS: Record<string, string> = {
  masters: 'Master',
  seniors: 'Senior',
  juniors: 'Junior'
}

function formatCalculationDate(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatArchivedDate(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

type ChampionshipPointsCardProps = {
  enabled?: boolean
  variant?: 'default' | 'profile'
}

export default function ChampionshipPointsCard({
  enabled = true,
  variant = 'default'
}: ChampionshipPointsCardProps) {
  const { data, isPending, isError, refetch, isFetching } =
    useMyChampionshipPoints({ enabled })
  const showProfileExtras = variant === 'profile'
  const { data: visibility } = usePlayPokemonRankVisibility({
    enabled: showProfileExtras && enabled
  })
  const updateVisibility = useUpdatePlayPokemonRankVisibility()

  if (!enabled) return null
  if (data && !data.enabled) return null

  const updatedLabel = formatCalculationDate(data?.calculationDate)
  const chilePath =
    data?.chileLeaderboardPath ?? PLAY_POKEMON_CHILE_LEADERBOARD_PATH
  const isLinked = data?.source === 'linked' && data.found
  const seasonLabel = data?.seasonLabel
  const history = data?.history ?? []

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        avatar={<EmojiEventsOutlined color="primary" />}
        title="Championship Points"
        subheader={
          isLinked
            ? seasonLabel
              ? `Temporada ${seasonLabel} · vinculado desde Ranking Chile`
              : 'Vinculado desde Ranking Chile'
            : 'Ranking oficial Play! Pokémon (temporada actual)'
        }
        slotProps={{ title: { variant: 'h6' } }}
      />
      <CardContent sx={{ pt: 0 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress
              size={28}
              aria-label="Cargando Championship Points"
            />
          </Box>
        ) : isError ? (
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography color="text.secondary">
              No se pudieron cargar tus Championship Points.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Cargando…' : 'Reintentar'}
            </Button>
          </Stack>
        ) : isLinked ? (
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  variant="h3"
                  component="p"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.05
                  }}
                >
                  {(data.primaryPointTotal ?? 0).toLocaleString('es-CL')}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  #{(data.rank ?? 0).toLocaleString('es-CL')}
                  {data.division
                    ? ` · ${DIVISION_LABELS[data.division] ?? data.division}`
                    : ''}
                  {' · CL'}
                </Typography>
              </Box>
              <Box
                sx={t => ({
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: alpha(t.palette.primary.main, 0.08),
                  minWidth: { sm: 160 }
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Play! Points
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
                >
                  {(data.secondaryPointTotal ?? 0).toLocaleString('es-CL')}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Vinculado como{' '}
              <Box
                component="span"
                sx={{ fontWeight: 700, color: 'text.primary' }}
              >
                {data.displayName ?? data.searchedAs}
              </Box>
              {updatedLabel ? ` · actualizado ${updatedLabel}` : ''}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                component={Link}
                href={chilePath}
                size="small"
                variant="contained"
                startIcon={<LeaderboardOutlinedIcon fontSize="small" />}
                sx={{
                  alignSelf: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 700
                }}
              >
                Ranking Chile
              </Button>
              {data.leaderboardUrl ? (
                <Button
                  component="a"
                  href={data.leaderboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{
                    alignSelf: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 700
                  }}
                >
                  Leaderboard oficial
                </Button>
              ) : null}
            </Stack>

            {showProfileExtras && history.length > 0 ? (
              <>
                <Divider />
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, mb: 1 }}
                  >
                    Historial por temporada
                  </Typography>
                  <Stack spacing={1}>
                    {history.map(entry => {
                      const archived = formatArchivedDate(entry.archivedAt)
                      return (
                        <Box
                          key={`${entry.period}-${entry.archivedAt}-${entry.rank}`}
                          sx={t => ({
                            px: 1.5,
                            py: 1.25,
                            borderRadius: 1.5,
                            bgcolor: alpha(t.palette.text.primary, 0.04),
                            border: '1px solid',
                            borderColor: alpha(t.palette.divider, 0.8)
                          })}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Temporada {entry.seasonLabel}
                            {archived ? ` · archivado ${archived}` : ''}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.championshipPoints.toLocaleString('es-CL')}{' '}
                            CP · #{entry.rank.toLocaleString('es-CL')}
                            {entry.division
                              ? ` · ${DIVISION_LABELS[entry.division] ?? entry.division}`
                              : ''}
                            {' · '}
                            {entry.playPoints.toLocaleString('es-CL')} Play! Pts
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Como {entry.linkedDisplayName}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
              </>
            ) : null}

            {showProfileExtras ? (
              <>
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        visibility?.rankPublic === true ||
                        data.rankPublic === true
                      }
                      disabled={updateVisibility.isPending}
                      onChange={(_, checked) => {
                        updateVisibility.mutate(checked)
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Mostrar mi ranking (#) junto a mi nombre. Al pulsar el
                      chip se ven tus Championship Points.
                    </Typography>
                  }
                />
              </>
            ) : null}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  variant="h3"
                  component="p"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.05,
                    color: 'text.disabled'
                  }}
                >
                  0
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  #0 · — · CL
                </Typography>
              </Box>
              <Box
                sx={t => ({
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: alpha(t.palette.text.primary, 0.06),
                  minWidth: { sm: 160 }
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Play! Points
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'text.disabled'
                  }}
                >
                  0
                </Typography>
              </Box>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              ¿Quieres vincular tus puntos? Búscate en la tabla de{' '}
              <Box
                component={Link}
                href={chilePath}
                sx={{ fontWeight: 700, color: 'text.primary' }}
              >
                Ranking Chile
              </Box>{' '}
              y pulsa <strong>Asignar valores</strong> en tu fila. Quedan
              guardados en tu perfil aunque el leaderboard oficial se reinicie.
            </Typography>

            <Button
              component={Link}
              href={chilePath}
              size="small"
              variant="contained"
              startIcon={<LinkIcon fontSize="small" />}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              Ir a Ranking Chile
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
