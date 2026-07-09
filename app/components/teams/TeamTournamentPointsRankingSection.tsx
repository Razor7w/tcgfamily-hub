'use client'

import { useState } from 'react'
import Link from 'next/link'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useTeamTournamentPointsRanking } from '@/hooks/useTeamTournamentPointsRanking'
import type { TeamTournamentPointsRankingPeriod } from '@/lib/teams/tournament-points-ranking'

type TeamTournamentPointsRankingSectionProps = {
  highlightTeamSlug?: string | null
  showIntro?: boolean
}

function rankAccent(rank: number) {
  if (rank === 1) return '#C9A227'
  if (rank === 2) return '#9CA3AF'
  if (rank === 3) return '#B87333'
  return undefined
}

export default function TeamTournamentPointsRankingSection({
  highlightTeamSlug,
  showIntro = true
}: TeamTournamentPointsRankingSectionProps) {
  const [period, setPeriod] =
    useState<TeamTournamentPointsRankingPeriod>('month')
  const { data, isPending, isError, error, refetch } =
    useTeamTournamentPointsRanking({ period })

  const periodLabel = data?.periodLabel ?? (period === 'all' ? 'Histórico' : '')

  return (
    <Stack spacing={2}>
      {showIntro ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
              Ranking de equipos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Suma de los 3 mejores jugadores por puntos en torneos oficiales (3
              por victoria, 1 por empate). Independiente de la tienda activa.
            </Typography>
          </Box>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, value: TeamTournamentPointsRankingPeriod | null) => {
              if (value) setPeriod(value)
            }}
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="month">Este mes</ToggleButton>
            <ToggleButton value="all">Histórico</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      ) : (
        <Stack direction="row" justifyContent="flex-end">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, value: TeamTournamentPointsRankingPeriod | null) => {
              if (value) setPeriod(value)
            }}
          >
            <ToggleButton value="month">Este mes</ToggleButton>
            <ToggleButton value="all">Histórico</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      )}

      {isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : isError ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
            {error instanceof Error ? error.message : 'Error al cargar ranking'}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void refetch()}
          >
            Reintentar
          </Button>
        </Paper>
      ) : data && data.rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Aún no hay resultados en torneos oficiales
            {period === 'month' && periodLabel ? ` en ${periodLabel}` : ''}.
          </Typography>
        </Paper>
      ) : data ? (
        <Stack spacing={1.25}>
          {periodLabel ? (
            <Typography variant="caption" color="text.secondary">
              Período: {periodLabel}
            </Typography>
          ) : null}
          {data.rows.map(row => {
            const highlighted =
              highlightTeamSlug != null && row.slug === highlightTeamSlug
            const accent = rankAccent(row.rank)

            return (
              <Paper
                key={row.teamId}
                variant="outlined"
                sx={{
                  p: { xs: 1.75, sm: 2 },
                  borderRadius: 3,
                  borderColor: t =>
                    highlighted
                      ? t.palette.primary.main
                      : alpha(t.palette.text.primary, 0.1),
                  bgcolor: t =>
                    highlighted
                      ? alpha(t.palette.primary.main, 0.04)
                      : 'transparent'
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 800,
                          fontSize: 14,
                          flexShrink: 0,
                          color: accent ? 'common.white' : 'text.secondary',
                          bgcolor: t =>
                            accent ?? alpha(t.palette.text.primary, 0.08)
                        }}
                      >
                        {row.rank <= 3 ? (
                          <EmojiEventsOutlinedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          row.rank
                        )}
                      </Box>
                      <Avatar
                        src={row.logoUrl || undefined}
                        alt=""
                        sx={{ width: 40, height: 40 }}
                      >
                        {row.name.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={800} noWrap>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.memberCount}{' '}
                          {row.memberCount === 1 ? 'miembro' : 'miembros'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack
                      alignItems="flex-end"
                      spacing={0.25}
                      sx={{ flexShrink: 0 }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1
                        }}
                      >
                        {row.totalPoints.toLocaleString('es-CL')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        pts top 3
                      </Typography>
                    </Stack>
                  </Stack>

                  {row.topMembers.length > 0 ? (
                    <Stack spacing={0.5} sx={{ pl: { xs: 0, sm: 6.5 } }}>
                      {row.topMembers.map((member, index) => (
                        <Stack
                          key={member.userId}
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {index + 1}. {member.displayName}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {member.points.toLocaleString('es-CL')} pts
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  ) : null}

                  <Box sx={{ pl: { xs: 0, sm: 6.5 } }}>
                    <Button
                      component={Link}
                      href={`/equipos/${row.slug}`}
                      size="small"
                      endIcon={<OpenInNewIcon />}
                      sx={{ px: 0, minWidth: 0 }}
                    >
                      Ver equipo
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      ) : null}
    </Stack>
  )
}
