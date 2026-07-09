'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

/** Amarillo legible para empates (vs naranjo `warning` del theme). */
const DUEL_TIE_COLOR = '#EAB308'
const DUEL_TIE_COLOR_DARK = '#854D0E'
import {
  useAcceptTeamFriendlyMatch,
  useCancelTeamFriendlyMatch,
  useDeclineTeamFriendlyMatch,
  useDeleteTeamFriendlyMatch,
  useReplaceFriendlyLineupSlot,
  useReportTeamFriendlyDuel,
  useRequestTeamFriendlyMatch,
  useResetTeamFriendlyMatch,
  useTeamFriendlyMatchDetail,
  useTeamFriendlyMatches,
  type FriendlyLineupInput
} from '@/hooks/useTeamFriendlyMatches'
import { usePublicTeamsDirectory } from '@/hooks/useTeams'
import type { TeamManageMember } from '@/hooks/useTeams'
import type { TeamFriendlyMatchListItemDTO } from '@/lib/teams/friendly-match/types'
import type {
  FriendlyDuelDTO,
  TeamFriendlyMatchDetailDTO
} from '@/lib/teams/friendly-match/types'
import {
  TEAM_FRIENDLY_DUEL_REPORT_LABELS,
  TEAM_FRIENDLY_DUEL_STATUS_LABELS,
  TEAM_FRIENDLY_INTRAMURAL_MIN_MEMBERS,
  TEAM_FRIENDLY_LINEUP_SIZE,
  TEAM_FRIENDLY_POINTS_PER_TIE,
  TEAM_FRIENDLY_POINTS_PER_WIN,
  type TeamFriendlyDuelReport
} from '@/lib/teams/friendly-match/constants'

type VersusViewMode = 'mine' | 'team'

type Props = {
  teamSlug: string
  teamName: string
  members: TeamManageMember[]
  canManage: boolean
  isCaptain: boolean
  viewerUserId: string
}

type ModerationAction = 'reset' | 'delete'

type ModerationTarget = {
  action: ModerationAction
  matchId: string
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
    case 'completed':
      return 'success' as const
    case 'disputed':
      return 'error' as const
    default:
      return 'default' as const
  }
}

type RequestVersusMode = 'external' | 'intramural'

function LineupPicker({
  members,
  slots,
  onChange,
  excludeUserIds = []
}: {
  members: TeamManageMember[]
  slots: (string | '')[]
  onChange: (slots: (string | '')[]) => void
  excludeUserIds?: string[]
}) {
  return (
    <Stack spacing={1.5}>
      {[0, 1, 2].map(slot => (
        <FormControl key={slot} fullWidth size="small">
          <InputLabel id={`lineup-slot-${slot}`}>Slot {slot + 1}</InputLabel>
          <Select
            labelId={`lineup-slot-${slot}`}
            label={`Slot ${slot + 1}`}
            value={slots[slot] ?? ''}
            onChange={e => {
              const next = [...slots] as (string | '')[]
              next[slot] = e.target.value
              onChange(next)
            }}
          >
            <MenuItem value="">
              <em>Elegir jugador</em>
            </MenuItem>
            {members.map(member => (
              <MenuItem
                key={member.userId}
                value={member.userId}
                disabled={
                  excludeUserIds.includes(member.userId) ||
                  slots.some((id, idx) => idx !== slot && id === member.userId)
                }
              >
                {member.displayName} · {member.roleLabel}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
    </Stack>
  )
}

function slotsToLineup(slots: (string | '')[]): FriendlyLineupInput[] | null {
  if (slots.some(id => !id)) return null
  return slots.map((userId, slot) => ({ userId: userId as string, slot }))
}

function matchIncludesViewer(
  match: TeamFriendlyMatchListItemDTO,
  userId: string
) {
  return [...match.challenger.lineup, ...match.opponent.lineup].some(
    player => !player.vacant && player.userId === userId
  )
}

function duelIncludesViewer(duel: FriendlyDuelDTO, viewerUserId: string) {
  return (
    duel.challengerPlayer.userId === viewerUserId ||
    duel.opponentPlayer.userId === viewerUserId
  )
}

function filterDuelsForView(
  duels: FriendlyDuelDTO[],
  viewMode: VersusViewMode,
  viewerUserId: string
) {
  if (viewMode === 'team') {
    return duels.filter(duel => !duelIncludesViewer(duel, viewerUserId))
  }
  return duels.filter(duel => duelIncludesViewer(duel, viewerUserId))
}

function reportLabel(
  report: TeamFriendlyDuelReport | null,
  playerName: string
) {
  if (!report) return '—'
  if (report === 'tie') return `${playerName} reportó empate`
  return `${playerName} ${TEAM_FRIENDLY_DUEL_REPORT_LABELS[report]}`
}

type DuelViewerOutcome = 'win' | 'loss' | 'tie' | null

function duelOutcomeForViewer(
  duel: FriendlyDuelDTO,
  viewerUserId: string,
  viewerSide: 'challenger' | 'opponent' | null
): DuelViewerOutcome {
  if (duel.status !== 'confirmed') return null

  if (duel.isDraw) return 'tie'

  if (!duel.winnerUserId) return null

  if (duelIncludesViewer(duel, viewerUserId)) {
    return duel.winnerUserId === viewerUserId ? 'win' : 'loss'
  }

  if (!viewerSide) return null

  const ourPlayerId =
    viewerSide === 'challenger'
      ? duel.challengerPlayer.userId
      : duel.opponentPlayer.userId

  return duel.winnerUserId === ourPlayerId ? 'win' : 'loss'
}

function duelCardSx(outcome: DuelViewerOutcome) {
  if (!outcome) {
    return { p: 1.5, borderRadius: 2 }
  }

  if (outcome === 'tie') {
    return {
      p: 1.5,
      borderRadius: 2,
      bgcolor: alpha(DUEL_TIE_COLOR, 0.16),
      borderColor: alpha(DUEL_TIE_COLOR, 0.42)
    }
  }

  const paletteKey = outcome === 'win' ? 'success' : 'error'

  return {
    p: 1.5,
    borderRadius: 2,
    bgcolor: (t: Theme) => alpha(t.palette[paletteKey].main, 0.12),
    borderColor: (t: Theme) => alpha(t.palette[paletteKey].main, 0.38)
  }
}

function tieChipSx() {
  return {
    bgcolor: alpha(DUEL_TIE_COLOR, 0.2),
    color: DUEL_TIE_COLOR_DARK,
    borderColor: alpha(DUEL_TIE_COLOR, 0.45),
    fontWeight: 700
  }
}

function tieButtonSx(selected: boolean) {
  if (selected) {
    return {
      bgcolor: DUEL_TIE_COLOR,
      color: '#422006',
      '&:hover': { bgcolor: '#CA8A04' }
    }
  }
  return {
    borderColor: DUEL_TIE_COLOR,
    color: DUEL_TIE_COLOR_DARK,
    '&:hover': {
      borderColor: DUEL_TIE_COLOR_DARK,
      bgcolor: alpha(DUEL_TIE_COLOR, 0.1)
    }
  }
}

function duelStatusChip(
  duel: FriendlyDuelDTO,
  outcome: DuelViewerOutcome
): {
  label: string
  color?: 'success' | 'error' | 'default'
  chipSx?: Record<string, unknown>
} {
  if (duel.isDraw) {
    return { label: 'Empate', chipSx: tieChipSx() }
  }
  if (duel.status === 'confirmed') {
    if (outcome === 'win') return { label: 'Victoria', color: 'success' }
    if (outcome === 'loss') return { label: 'Derrota', color: 'error' }
    return { label: 'Confirmado', color: 'success' }
  }
  if (duel.status === 'disputed') {
    return { label: TEAM_FRIENDLY_DUEL_STATUS_LABELS.disputed, color: 'error' }
  }
  return {
    label: TEAM_FRIENDLY_DUEL_STATUS_LABELS.pending_reports,
    color: 'default'
  }
}

function canReportDuel(
  match: TeamFriendlyMatchDetailDTO,
  duel: FriendlyDuelDTO
) {
  return (
    duel.viewerCanReport &&
    duel.status !== 'confirmed' &&
    (match.status === 'in_progress' || match.status === 'disputed')
  )
}

function FriendlyLineupVacancyPanel({
  label,
  side,
  team,
  teamSlug,
  matchId,
  members,
  canManageSide,
  assignedUserIds
}: {
  label: string
  side: 'challenger' | 'opponent'
  team: TeamFriendlyMatchDetailDTO['challenger']
  teamSlug: string
  matchId: string
  members: TeamManageMember[]
  canManageSide: boolean
  assignedUserIds: string[]
}) {
  const replace = useReplaceFriendlyLineupSlot(teamSlug, matchId)
  const vacantSlots = team.lineup.filter(p => p.vacant)

  if (vacantSlots.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
      <Typography variant="subtitle2" fontWeight={800} gutterBottom>
        {label} · cupos vacantes
      </Typography>
      <Stack spacing={1.5}>
        {vacantSlots.map(slot => (
          <Stack
            key={`${side}-${slot.slot}`}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
          >
            <Typography variant="body2" sx={{ minWidth: 88 }}>
              Slot {slot.slot + 1}
            </Typography>
            {canManageSide ? (
              <FormControl fullWidth size="small">
                <InputLabel id={`replace-${side}-${slot.slot}`}>
                  Asignar jugador
                </InputLabel>
                <Select
                  labelId={`replace-${side}-${slot.slot}`}
                  label="Asignar jugador"
                  defaultValue=""
                  disabled={replace.isPending}
                  onChange={e => {
                    const userId = e.target.value
                    if (!userId) return
                    void replace.mutateAsync({ side, slot: slot.slot, userId })
                  }}
                >
                  <MenuItem value="">
                    <em>Elegir reemplazo</em>
                  </MenuItem>
                  {members.map(member => (
                    <MenuItem
                      key={member.userId}
                      value={member.userId}
                      disabled={assignedUserIds.includes(member.userId)}
                    >
                      {member.displayName} · {member.roleLabel}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Pendiente de reemplazo por el staff del equipo
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

function FriendlyMatchDetailPanel({
  matchId,
  teamSlug,
  members,
  canManage,
  viewerUserId,
  isCaptain,
  onModerate,
  onClose
}: {
  matchId: string
  teamSlug: string
  members: TeamManageMember[]
  canManage: boolean
  viewerUserId: string
  isCaptain: boolean
  onModerate: (target: ModerationTarget) => void
  onClose: () => void
}) {
  const [detailTab, setDetailTab] = useState<VersusViewMode>('mine')
  const { data, isPending, isError, error, refetch } =
    useTeamFriendlyMatchDetail(matchId)
  const reportDuel = useReportTeamFriendlyDuel(teamSlug, matchId)
  const match = data?.match

  if (isPending) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (isError || !match) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      >
        {error instanceof Error ? error.message : 'Error'}
      </Alert>
    )
  }

  const ourTeam =
    match.viewerSide === 'challenger' ? match.challenger : match.opponent
  const theirTeam =
    match.viewerSide === 'challenger' ? match.opponent : match.challenger
  const myDuels = filterDuelsForView(match.duels, 'mine', viewerUserId)
  const teamDuels = filterDuelsForView(match.duels, 'team', viewerUserId)
  const visibleDuels = detailTab === 'mine' ? myDuels : teamDuels
  const showDuelTabs = match.duels.length > 0
  const assignedUserIds = [...match.challenger.lineup, ...match.opponent.lineup]
    .filter(p => !p.vacant && p.userId)
    .map(p => p.userId as string)
  const canManageChallenger = canManage && match.challenger.slug === teamSlug
  const canManageOpponent = canManage && match.opponent.slug === teamSlug
  const hasVacancies =
    match.challenger.lineup.some(p => p.vacant) ||
    match.opponent.lineup.some(p => p.vacant)

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {match.challenger.name} vs {match.opponent.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {match.statusLabel} · {match.pointsPerWin} pts por victoria ·{' '}
            {TEAM_FRIENDLY_POINTS_PER_TIE} pt por empate · sin ranking global
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            label={`${ourTeam?.name ?? 'Tu equipo'} ${ourTeam?.points ?? 0} – ${theirTeam?.points ?? 0} ${theirTeam?.name ?? 'Rival'}`}
            color={statusChipColor(match.status)}
            variant="outlined"
          />
          {isCaptain && match.captainCanModerate ? (
            <Button
              size="small"
              color="inherit"
              onClick={() => onModerate({ action: 'reset', matchId: match.id })}
            >
              Reiniciar
            </Button>
          ) : null}
          {isCaptain && match.captainCanModerate ? (
            <Button
              size="small"
              color="error"
              onClick={() =>
                onModerate({ action: 'delete', matchId: match.id })
              }
            >
              Eliminar
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {match.status === 'completed' && match.isIntramural ? (
        <Alert severity="success">
          {match.challenger.points > match.opponent.points
            ? `Ganador: ${match.challenger.name}`
            : match.opponent.points > match.challenger.points
              ? `Ganador: ${match.opponent.name}`
              : 'Empate entre escuadras'}
        </Alert>
      ) : null}

      {match.status === 'completed' &&
      !match.isIntramural &&
      match.winnerTeamId ? (
        <Alert severity="success">
          Ganador:{' '}
          {match.winnerTeamId === match.challenger.teamId
            ? match.challenger.name
            : match.opponent.name}
        </Alert>
      ) : null}

      {match.status === 'disputed' ? (
        <Alert severity="warning">
          Hay rondas en conflicto. Cada duelo se confirma cuando un jugador
          reporta victoria y el rival derrota, o cuando ambos reportan empate.
          Corrige tus reportes hasta que coincidan.
        </Alert>
      ) : null}

      {hasVacancies ? (
        <Stack spacing={1.5}>
          <FriendlyLineupVacancyPanel
            label={match.challenger.name}
            side="challenger"
            team={match.challenger}
            teamSlug={teamSlug}
            matchId={match.id}
            members={members}
            canManageSide={canManageChallenger}
            assignedUserIds={assignedUserIds}
          />
          <FriendlyLineupVacancyPanel
            label={match.opponent.name}
            side="opponent"
            team={match.opponent}
            teamSlug={teamSlug}
            matchId={match.id}
            members={members}
            canManageSide={canManageOpponent}
            assignedUserIds={assignedUserIds}
          />
        </Stack>
      ) : null}

      {showDuelTabs ? (
        <Tabs
          value={detailTab}
          onChange={(_, value: VersusViewMode) => setDetailTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 40,
              fontWeight: 600,
              textTransform: 'none'
            }
          }}
        >
          <Tab value="mine" label={`Mis matchs (${myDuels.length})`} />
          <Tab value="team" label={`Match del equipo (${teamDuels.length})`} />
        </Tabs>
      ) : null}

      {visibleDuels.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {detailTab === 'mine'
              ? 'No tienes rondas asignadas en este versus.'
              : 'No hay otras rondas del equipo en este versus.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {visibleDuels.map(duel => {
            const outcome = duelOutcomeForViewer(
              duel,
              viewerUserId,
              match.viewerSide
            )
            const statusChip = duelStatusChip(duel, outcome)

            return (
              <Paper key={duel.id} variant="outlined" sx={duelCardSx(outcome)}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
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
                      Reportes:{' '}
                      {reportLabel(
                        duel.challengerReport,
                        duel.challengerPlayer.displayName
                      )}{' '}
                      /{' '}
                      {reportLabel(
                        duel.opponentReport,
                        duel.opponentPlayer.displayName
                      )}
                    </Typography>
                    {duel.status === 'disputed' ? (
                      <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ display: 'block', mt: 0.25 }}
                      >
                        Los reportes no coinciden. Ajusten hasta que uno gane y
                        el otro pierda, o ambos marquen empate.
                      </Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={statusChip.label}
                      color={statusChip.color}
                      variant={statusChip.chipSx ? 'outlined' : 'filled'}
                      sx={statusChip.chipSx}
                    />
                    {canReportDuel(match, duel) ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        <Button
                          size="small"
                          variant={
                            duel.viewerReport === 'win'
                              ? 'contained'
                              : 'outlined'
                          }
                          color="success"
                          disabled={reportDuel.isPending}
                          onClick={() =>
                            void reportDuel.mutateAsync({
                              duelId: duel.id,
                              report: 'win'
                            })
                          }
                        >
                          Gané
                        </Button>
                        <Button
                          size="small"
                          variant={
                            duel.viewerReport === 'tie'
                              ? 'contained'
                              : 'outlined'
                          }
                          disabled={reportDuel.isPending}
                          sx={tieButtonSx(duel.viewerReport === 'tie')}
                          onClick={() =>
                            void reportDuel.mutateAsync({
                              duelId: duel.id,
                              report: 'tie'
                            })
                          }
                        >
                          Empate
                        </Button>
                        <Button
                          size="small"
                          variant={
                            duel.viewerReport === 'loss'
                              ? 'contained'
                              : 'outlined'
                          }
                          color="error"
                          disabled={reportDuel.isPending}
                          onClick={() =>
                            void reportDuel.mutateAsync({
                              duelId: duel.id,
                              report: 'loss'
                            })
                          }
                        >
                          Perdí
                        </Button>
                      </Stack>
                    ) : null}
                  </Stack>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}

      <Button
        color="inherit"
        onClick={onClose}
        sx={{ alignSelf: 'flex-start' }}
      >
        Volver al listado
      </Button>
    </Stack>
  )
}

export default function TeamFriendlyMatchesSection({
  teamSlug,
  teamName,
  members,
  canManage,
  isCaptain,
  viewerUserId
}: Props) {
  const { data, isPending, isError, error } = useTeamFriendlyMatches(teamSlug)
  const { data: directory, isPending: directoryPending } =
    usePublicTeamsDirectory(48)
  const requestMatch = useRequestTeamFriendlyMatch(teamSlug)
  const acceptMatch = useAcceptTeamFriendlyMatch(teamSlug)
  const declineMatch = useDeclineTeamFriendlyMatch(teamSlug)
  const cancelMatch = useCancelTeamFriendlyMatch(teamSlug)
  const resetMatch = useResetTeamFriendlyMatch(teamSlug)
  const deleteMatch = useDeleteTeamFriendlyMatch(teamSlug)

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [moderation, setModeration] = useState<ModerationTarget | null>(null)
  const [moderationErr, setModerationErr] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestMode, setRequestMode] = useState<RequestVersusMode>('external')
  const [acceptMatchId, setAcceptMatchId] = useState<string | null>(null)
  const [opponentSlug, setOpponentSlug] = useState('')
  const [lineupSlots, setLineupSlots] = useState<(string | '')[]>(['', '', ''])
  const [intramuralOpponentSlots, setIntramuralOpponentSlots] = useState<
    (string | '')[]
  >(['', '', ''])
  const [formErr, setFormErr] = useState<string | null>(null)

  const opponentOptions = useMemo(
    () =>
      (directory?.teams ?? []).filter(
        t => t.slug !== teamSlug && t.memberCount >= TEAM_FRIENDLY_LINEUP_SIZE
      ),
    [directory?.teams, teamSlug]
  )

  const undersizedOpponents = useMemo(
    () =>
      (directory?.teams ?? []).filter(
        t => t.slug !== teamSlug && t.memberCount < TEAM_FRIENDLY_LINEUP_SIZE
      ),
    [directory?.teams, teamSlug]
  )

  const directoryStats = useMemo(() => {
    const others = (directory?.teams ?? []).filter(t => t.slug !== teamSlug)
    const undersized = others.filter(
      t => t.memberCount < TEAM_FRIENDLY_LINEUP_SIZE
    )
    return {
      otherTeams: others.length,
      undersizedTeams: undersized.length,
      eligibleTeams: opponentOptions.length
    }
  }, [directory?.teams, opponentOptions.length, teamSlug])

  const matches = data?.matches ?? []
  const canFieldLineup = members.length >= TEAM_FRIENDLY_LINEUP_SIZE
  const canIntramural = members.length >= TEAM_FRIENDLY_INTRAMURAL_MIN_MEMBERS
  const challengerLineupIds = lineupSlots.filter(Boolean) as string[]
  const canRequestExternal =
    canFieldLineup &&
    !directoryPending &&
    opponentOptions.length > 0 &&
    Boolean(opponentSlug)
  const canRequestIntramural =
    canIntramural &&
    Boolean(slotsToLineup(lineupSlots)) &&
    Boolean(slotsToLineup(intramuralOpponentSlots))

  function resetRequestForm() {
    setOpponentSlug('')
    setLineupSlots(['', '', ''])
    setIntramuralOpponentSlots(['', '', ''])
    setFormErr(null)
  }

  function openRequestDialog(mode: RequestVersusMode) {
    setRequestMode(mode)
    resetRequestForm()
    setRequestOpen(true)
  }

  async function handleRequest() {
    setFormErr(null)
    if (requestMode === 'intramural') {
      const lineup = slotsToLineup(lineupSlots)
      const opponentLineup = slotsToLineup(intramuralOpponentSlots)
      if (!lineup || !opponentLineup) {
        setFormErr('Debes elegir 3 jugadores distintos en cada escuadra')
        return
      }
      try {
        const result = await requestMatch.mutateAsync({
          intramural: true,
          lineup,
          opponentLineup
        })
        setRequestOpen(false)
        resetRequestForm()
        setSelectedMatchId(result.match.id)
      } catch (e) {
        setFormErr(
          e instanceof Error ? e.message : 'Error al crear versus interno'
        )
      }
      return
    }

    const lineup = slotsToLineup(lineupSlots)
    if (!opponentSlug) {
      setFormErr('Elige un equipo rival')
      return
    }
    if (!lineup) {
      setFormErr('Debes elegir 3 jugadores en slots distintos')
      return
    }
    try {
      const result = await requestMatch.mutateAsync({
        opponentTeamSlug: opponentSlug,
        lineup
      })
      setRequestOpen(false)
      resetRequestForm()
      setSelectedMatchId(result.match.id)
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Error al solicitar')
    }
  }

  async function handleAccept() {
    if (!acceptMatchId) return
    setFormErr(null)
    const lineup = slotsToLineup(lineupSlots)
    if (!lineup) {
      setFormErr('Debes elegir 3 jugadores en slots distintos')
      return
    }
    try {
      const result = await acceptMatch.mutateAsync({
        matchId: acceptMatchId,
        lineup
      })
      setAcceptMatchId(null)
      setLineupSlots(['', '', ''])
      setSelectedMatchId(result.match.id)
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Error al aceptar')
    }
  }

  async function handleModerationConfirm() {
    if (!moderation) return
    setModerationErr(null)
    try {
      if (moderation.action === 'reset') {
        await resetMatch.mutateAsync(moderation.matchId)
      } else {
        await deleteMatch.mutateAsync(moderation.matchId)
        if (selectedMatchId === moderation.matchId) {
          setSelectedMatchId(null)
        }
      }
      setModeration(null)
    } catch (e) {
      setModerationErr(
        e instanceof Error ? e.message : 'No se pudo completar la acción'
      )
    }
  }

  function renderCaptainModerationButtons(
    matchId: string,
    captainCanModerate: boolean
  ) {
    if (!isCaptain || !captainCanModerate) return null

    return (
      <>
        <Button
          size="small"
          color="inherit"
          disabled={resetMatch.isPending || deleteMatch.isPending}
          onClick={() => {
            setModerationErr(null)
            setModeration({ action: 'reset', matchId })
          }}
        >
          Reiniciar
        </Button>
        <Button
          size="small"
          color="error"
          disabled={resetMatch.isPending || deleteMatch.isPending}
          onClick={() => {
            setModerationErr(null)
            setModeration({ action: 'delete', matchId })
          }}
        >
          Eliminar
        </Button>
      </>
    )
  }

  function renderMatchActions(match: TeamFriendlyMatchListItemDTO) {
    const viewerPlays = matchIncludesViewer(match, viewerUserId)

    if (
      canManage &&
      match.status === 'pending' &&
      match.viewerSide === 'challenger'
    ) {
      return (
        <Button
          size="small"
          color="inherit"
          disabled={cancelMatch.isPending}
          onClick={() => void cancelMatch.mutateAsync(match.id)}
        >
          Cancelar solicitud
        </Button>
      )
    }

    if (
      canManage &&
      match.status === 'pending' &&
      match.viewerSide === 'opponent'
    ) {
      return (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setAcceptMatchId(match.id)
              setLineupSlots(['', '', ''])
              setFormErr(null)
            }}
          >
            Aceptar
          </Button>
          <Button
            size="small"
            color="inherit"
            disabled={declineMatch.isPending}
            onClick={() => void declineMatch.mutateAsync(match.id)}
          >
            Rechazar
          </Button>
        </Stack>
      )
    }

    if (match.status !== 'pending' || viewerPlays) {
      return (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button size="small" onClick={() => setSelectedMatchId(match.id)}>
            {viewerPlays && match.status === 'in_progress'
              ? 'Reportar rondas'
              : 'Ver detalle'}
          </Button>
          {renderCaptainModerationButtons(match.id, match.captainCanModerate)}
        </Stack>
      )
    }

    return null
  }

  function renderModerationDialog() {
    const pending = resetMatch.isPending || deleteMatch.isPending
    const isReset = moderation?.action === 'reset'

    return (
      <Dialog
        open={Boolean(moderation)}
        onClose={() => !pending && setModeration(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isReset ? '¿Reiniciar versus?' : '¿Eliminar versus?'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {isReset
                ? 'Se borrarán todos los reportes y el marcador volverá a 0. Las mismas rondas quedarán pendientes.'
                : 'Se eliminará el versus y todas sus rondas. Esta acción no se puede deshacer.'}
            </Typography>
            {moderationErr ? (
              <Alert severity="error">{moderationErr}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={() => setModeration(null)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={isReset ? 'primary' : 'error'}
            disabled={pending}
            onClick={() => void handleModerationConfirm()}
          >
            {pending ? 'Procesando…' : isReset ? 'Reiniciar' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  if (selectedMatchId) {
    return (
      <>
        <FriendlyMatchDetailPanel
          matchId={selectedMatchId}
          teamSlug={teamSlug}
          members={members}
          canManage={canManage}
          viewerUserId={viewerUserId}
          isCaptain={isCaptain}
          onModerate={target => {
            setModerationErr(null)
            setModeration(target)
          }}
          onClose={() => setSelectedMatchId(null)}
        />
        {renderModerationDialog()}
      </>
    )
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <SportsKabaddiIcon color="primary" />
            <Typography variant="h6" fontWeight={800}>
              Versus amistosos
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Nivel A: sin puntuación global. 3 jugadores por equipo, 9 rondas
            cruzadas, {TEAM_FRIENDLY_POINTS_PER_WIN} puntos por victoria y{' '}
            {TEAM_FRIENDLY_POINTS_PER_TIE} punto por empate confirmado.
          </Typography>
        </Box>
        {canManage && canFieldLineup ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              onClick={() => openRequestDialog('external')}
            >
              Solicitar match
            </Button>
            {canIntramural ? (
              <Button
                variant="outlined"
                onClick={() => openRequestDialog('intramural')}
              >
                Versus interno
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Stack>

      {!canFieldLineup ? (
        <Alert severity="info">
          Necesitas al menos {TEAM_FRIENDLY_LINEUP_SIZE} miembros activos para
          jugar un versus amistoso.
        </Alert>
      ) : null}

      {canFieldLineup && !canIntramural ? (
        <Alert severity="info">
          Con {TEAM_FRIENDLY_INTRAMURAL_MIN_MEMBERS} o más miembros puedes armar
          un versus interno (dos escuadras de 3 del mismo equipo).
        </Alert>
      ) : null}

      {isPending ? (
        <CircularProgress sx={{ alignSelf: 'center' }} />
      ) : isError ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Error'}
        </Alert>
      ) : matches.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography color="text.secondary">
            {teamName} aún no tiene versus registrados.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.25}>
          {matches.map(match => {
            const displayLeft = match.challenger
            const displayRight = match.opponent

            return (
              <Paper
                key={match.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  borderColor: t => alpha(t.palette.primary.main, 0.16)
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={displayLeft.logoUrl || undefined}>
                        {displayLeft.name.slice(0, 1)}
                      </Avatar>
                      <Typography fontWeight={800}>
                        {displayLeft.name}
                      </Typography>
                      <Typography color="text.secondary">vs</Typography>
                      <Avatar src={displayRight.logoUrl || undefined}>
                        {displayRight.name.slice(0, 1)}
                      </Avatar>
                      <Typography fontWeight={800}>
                        {displayRight.name}
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip
                        size="small"
                        label={match.statusLabel}
                        color={statusChipColor(match.status)}
                      />
                      {match.isIntramural ? (
                        <Chip
                          size="small"
                          label="Interno"
                          variant="outlined"
                          color="secondary"
                        />
                      ) : null}
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatWhen(match.createdAt)}
                    {match.status !== 'pending'
                      ? ` · Marcador ${displayLeft.points}–${displayRight.points} · ${match.confirmedDuels}/${match.totalDuels} duelos confirmados`
                      : match.expiresAt
                        ? ` · expira ${formatWhen(match.expiresAt)}`
                        : ''}
                  </Typography>
                  {renderMatchActions(match)}
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}

      <Dialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {requestMode === 'intramural'
            ? 'Versus interno'
            : 'Solicitar versus amistoso'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {requestMode === 'intramural' ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Elige dos escuadras de 3 jugadores distintos. El match inicia
                  de inmediato con 9 duelos cruzados.
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  Escuadra A
                </Typography>
                <LineupPicker
                  members={members}
                  slots={lineupSlots}
                  onChange={setLineupSlots}
                  excludeUserIds={
                    intramuralOpponentSlots.filter(Boolean) as string[]
                  }
                />
                <Typography variant="subtitle2" fontWeight={700}>
                  Escuadra B
                </Typography>
                <LineupPicker
                  members={members}
                  slots={intramuralOpponentSlots}
                  onChange={setIntramuralOpponentSlots}
                  excludeUserIds={challengerLineupIds}
                />
              </>
            ) : directoryPending ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <CircularProgress size={24} sx={{ mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Buscando equipos disponibles…
                </Typography>
              </Paper>
            ) : opponentOptions.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  bgcolor: t => alpha(t.palette.primary.main, 0.04)
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    mx: 'auto',
                    mb: 1.5,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: t => alpha(t.palette.primary.main, 0.1),
                    color: 'primary.main'
                  }}
                >
                  <GroupsOutlinedIcon />
                </Box>
                <Typography fontWeight={700} gutterBottom>
                  Aún no hay rivales disponibles
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6, maxWidth: 360, mx: 'auto' }}
                >
                  {directoryStats.otherTeams === 0
                    ? 'Solo tu equipo está publicado. Necesitas al menos otro equipo aprobado en la comunidad.'
                    : directoryStats.undersizedTeams > 0 &&
                        directoryStats.eligibleTeams === 0
                      ? `Hay ${directoryStats.otherTeams} equipo${directoryStats.otherTeams === 1 ? '' : 's'} publicado${directoryStats.otherTeams === 1 ? '' : 's'}, pero ninguno con al menos ${TEAM_FRIENDLY_LINEUP_SIZE} miembros para jugar un versus.`
                      : 'No hay equipos elegibles en este momento. Cada rival necesita al menos 3 miembros activos.'}
                </Typography>
                {undersizedOpponents.length > 0 ? (
                  <Stack spacing={1} sx={{ mt: 2.5, textAlign: 'left' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                    >
                      Equipos en formación
                    </Typography>
                    <Stack spacing={0.75}>
                      {undersizedOpponents.map(team => (
                        <Button
                          key={team.id}
                          component={Link}
                          href={`/equipos/${team.slug}`}
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            justifyContent: 'space-between',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 0.75
                          }}
                        >
                          <Box component="span" sx={{ textAlign: 'left' }}>
                            {team.name}
                          </Box>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1, flexShrink: 0 }}
                          >
                            {team.memberCount}/{TEAM_FRIENDLY_LINEUP_SIZE}{' '}
                            miembros
                          </Typography>
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                ) : null}
              </Paper>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel id="opponent-team-label">Equipo rival</InputLabel>
                <Select
                  labelId="opponent-team-label"
                  label="Equipo rival"
                  value={opponentSlug}
                  onChange={e => setOpponentSlug(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Elige un equipo</em>
                  </MenuItem>
                  {opponentOptions.map(team => (
                    <MenuItem key={team.id} value={team.slug}>
                      {team.name} · {team.memberCount} miembros
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {opponentOptions.length > 0 ? (
              <>
                <Typography variant="subtitle2" fontWeight={700}>
                  Tu alineación (3 jugadores)
                </Typography>
                <LineupPicker
                  members={members}
                  slots={lineupSlots}
                  onChange={setLineupSlots}
                />
              </>
            ) : null}
            {formErr ? <Alert severity="error">{formErr}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              requestMatch.isPending ||
              (requestMode === 'intramural'
                ? !canRequestIntramural
                : !canRequestExternal)
            }
            onClick={() => void handleRequest()}
          >
            {requestMode === 'intramural'
              ? 'Iniciar versus interno'
              : 'Enviar solicitud'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(acceptMatchId)}
        onClose={() => setAcceptMatchId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Aceptar versus amistoso</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Elige a los 3 jugadores que representarán a {teamName}. Se
              generarán 9 duelos cruzados automáticamente.
            </Typography>
            <LineupPicker
              members={members}
              slots={lineupSlots}
              onChange={setLineupSlots}
            />
            {formErr ? <Alert severity="error">{formErr}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptMatchId(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={acceptMatch.isPending}
            onClick={() => void handleAccept()}
          >
            Aceptar y crear rondas
          </Button>
        </DialogActions>
      </Dialog>

      {renderModerationDialog()}
    </Stack>
  )
}
