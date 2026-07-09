'use client'

import { useState } from 'react'
import Link from 'next/link'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  usePublicTeamActiveFriendlyMatches,
  usePublicTeamFriendlyMatchDetail
} from '@/hooks/useTeamFriendlyMatches'
import {
  TEAM_FRIENDLY_DUEL_STATUS_LABELS,
  TEAM_FRIENDLY_POINTS_PER_TIE,
  TEAM_FRIENDLY_POINTS_PER_WIN
} from '@/lib/teams/friendly-match/constants'
import type {
  FriendlyDuelDTO,
  TeamFriendlyMatchListItemDTO
} from '@/lib/teams/friendly-match/types'

type Props = {
  teamSlug: string
  teamId: string
  enabled?: boolean
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function statusChipColor(status: string) {
  switch (status) {
    case 'pending':
      return 'warning' as const
    case 'in_progress':
      return 'info' as const
    case 'disputed':
      return 'error' as const
    default:
      return 'default' as const
  }
}

function reportLabel(report: string | null, playerName: string): string {
  if (!report) return `${playerName}: sin reporte`
  if (report === 'win') return `${playerName}: ganó`
  if (report === 'loss') return `${playerName}: perdió`
  if (report === 'tie') return `${playerName}: empate`
  return `${playerName}: ${report}`
}

function PublicDuelRow({ duel }: { duel: FriendlyDuelDTO }) {
  const statusLabel = duel.isDraw
    ? 'Empate'
    : duel.status === 'confirmed'
      ? duel.winnerUserId
        ? 'Confirmado'
        : 'Confirmado'
      : TEAM_FRIENDLY_DUEL_STATUS_LABELS[duel.status]

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: t => alpha(t.palette.background.paper, 0.6)
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Ronda {duel.roundNumber}
          </Typography>
          <Typography fontWeight={700}>
            {duel.challengerPlayer.displayName} vs{' '}
            {duel.opponentPlayer.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {reportLabel(
              duel.challengerReport,
              duel.challengerPlayer.displayName
            )}{' '}
            ·{' '}
            {reportLabel(duel.opponentReport, duel.opponentPlayer.displayName)}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={statusLabel}
          color={
            duel.status === 'confirmed'
              ? 'success'
              : duel.status === 'disputed'
                ? 'error'
                : 'default'
          }
          variant={duel.isDraw ? 'outlined' : 'filled'}
        />
      </Stack>
    </Paper>
  )
}

function TeamVersusLink({
  team,
  isHost
}: {
  team: TeamFriendlyMatchListItemDTO['challenger']
  isHost: boolean
}) {
  return (
    <Stack
      component={Link}
      href={`/equipos/${team.slug}`}
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 2,
        px: 0.5,
        py: 0.25,
        ...(isHost
          ? {
              bgcolor: t => alpha(t.palette.primary.main, 0.08),
              '&:hover': { bgcolor: t => alpha(t.palette.primary.main, 0.14) }
            }
          : {
              '&:hover': { bgcolor: t => alpha(t.palette.text.primary, 0.04) }
            })
      }}
    >
      <Avatar src={team.logoUrl || undefined} sx={{ width: 32, height: 32 }}>
        {team.name.slice(0, 1)}
      </Avatar>
      <Typography fontWeight={isHost ? 800 : 700} noWrap>
        {team.name}
      </Typography>
    </Stack>
  )
}

function ActiveMatchCard({
  match,
  hostTeamId,
  teamSlug
}: {
  match: TeamFriendlyMatchListItemDTO
  hostTeamId: string
  teamSlug: string
}) {
  const [expanded, setExpanded] = useState(false)
  const showDuels = match.status !== 'pending'
  const { data, isPending, isError } = usePublicTeamFriendlyMatchDetail(
    teamSlug,
    match.id,
    expanded && showDuels
  )

  const hostIsChallenger = match.challenger.teamId === hostTeamId
  const hostTeam = hostIsChallenger ? match.challenger : match.opponent
  const rivalTeam = hostIsChallenger ? match.opponent : match.challenger

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        borderColor: t => alpha(t.palette.primary.main, 0.2)
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <TeamVersusLink team={hostTeam} isHost />
            <Typography color="text.secondary" fontWeight={700}>
              vs
            </Typography>
            <TeamVersusLink team={rivalTeam} isHost={false} />
          </Stack>
          <Chip
            size="small"
            label={match.statusLabel}
            color={statusChipColor(match.status)}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {formatWhen(match.createdAt)}
          {match.status !== 'pending'
            ? ` · Marcador ${hostTeam.points}–${rivalTeam.points} · ${match.confirmedDuels}/${match.totalDuels} duelos confirmados`
            : match.expiresAt
              ? ` · expira ${formatWhen(match.expiresAt)}`
              : ''}
        </Typography>

        {match.status === 'pending' ? (
          <Typography variant="body2" color="text.secondary">
            Desafío pendiente de respuesta del rival.
          </Typography>
        ) : null}

        {showDuels ? (
          <>
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded(v => !v)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
            >
              {expanded ? 'Ocultar duelos' : 'Ver duelos'}
            </Button>
            <Collapse in={expanded}>
              {isPending ? (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <CircularProgress size={22} />
                </Box>
              ) : isError || !data?.match ? (
                <Alert severity="error" sx={{ mt: 0.5 }}>
                  No se pudieron cargar los duelos.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    {TEAM_FRIENDLY_POINTS_PER_WIN} pts por victoria ·{' '}
                    {TEAM_FRIENDLY_POINTS_PER_TIE} pt por empate
                  </Typography>
                  {data.match.duels.map(duel => (
                    <PublicDuelRow key={duel.id} duel={duel} />
                  ))}
                </Stack>
              )}
            </Collapse>
          </>
        ) : null}
      </Stack>
    </Paper>
  )
}

export default function TeamPublicActiveMatchesSection({
  teamSlug,
  teamId,
  enabled = true
}: Props) {
  const { data, isPending, isError, error } =
    usePublicTeamActiveFriendlyMatches(teamSlug, enabled)
  const matches = data?.matches ?? []

  if (!enabled) return null

  if (isPending) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08)
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <SportsKabaddiIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Versus activos
          </Typography>
        </Stack>
        <Skeleton variant="rounded" height={96} />
      </Paper>
    )
  }

  if (isError) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Error al cargar versus'}
      </Alert>
    )
  }

  if (matches.length === 0) return null

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: t => alpha(t.palette.primary.main, 0.14),
        bgcolor: t => alpha(t.palette.primary.main, 0.02)
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <SportsKabaddiIcon color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Versus activos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Partidos pendientes, en juego o en disputa.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.25}>
        {matches.map(match => (
          <ActiveMatchCard
            key={match.id}
            match={match}
            hostTeamId={teamId}
            teamSlug={teamSlug}
          />
        ))}
      </Stack>
    </Paper>
  )
}
