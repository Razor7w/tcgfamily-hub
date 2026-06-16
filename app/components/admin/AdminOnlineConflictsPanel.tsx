'use client'

import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import GavelIcon from '@mui/icons-material/Gavel'
import FlagIcon from '@mui/icons-material/Flag'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import MatchChatPanel from '@/components/events/MatchChatPanel'
import OnlineRoundTimer from '@/components/events/OnlineRoundTimer'
import { buildOnlineRoundTimerForRound } from '@/lib/online-round-timer'
import {
  useAdminOnlineTableReports,
  useAdvanceOnlineRound,
  useCloseOnlineTournament,
  useLaunchOnlineRound1
} from '@/hooks/useAdminOnlineTableReports'
import type { WeeklyEventState } from '@/models/WeeklyEvent'
import type { AdminOnlineTableReportRow } from '@/lib/online-table-conflicts-admin'

function statusLabel(status: AdminOnlineTableReportRow['status']): string {
  if (status === 'conflict') return 'Conflicto'
  if (status === 'verifying') return 'Verificando'
  if (status === 'verified') return 'Confirmado'
  return 'Sin reporte'
}

function statusColor(
  status: AdminOnlineTableReportRow['status']
): 'error' | 'warning' | 'success' | 'default' {
  if (status === 'conflict') return 'error'
  if (status === 'verifying') return 'warning'
  if (status === 'verified') return 'success'
  return 'default'
}

function winnerName(
  popId: string | null,
  row: AdminOnlineTableReportRow
): string | null {
  if (!popId) return null
  if (popId === row.player1.popId) return row.player1.displayName
  if (popId === row.player2.popId) return row.player2.displayName
  return popId
}

function reportSummary(row: AdminOnlineTableReportRow): string {
  const r1 = winnerName(row.player1ReportedWinnerPopId, row)
  const r2 = winnerName(row.player2ReportedWinnerPopId, row)
  if (row.status === 'verified' && row.winnerPopId) {
    return `Ganador: ${winnerName(row.winnerPopId, row) ?? row.winnerPopId}`
  }
  if (row.status === 'conflict' && r1 && r2) {
    return `J1 → ${r1} · J2 → ${r2}`
  }
  if (r1 || r2) {
    const parts: string[] = []
    if (r1) parts.push(`J1 → ${r1}`)
    if (r2) parts.push(`J2 → ${r2}`)
    return parts.join(' · ')
  }
  return 'Sin reportes aún'
}

export default function AdminOnlineConflictsPanel({
  eventId,
  activeRoundNum,
  eventState
}: {
  eventId: string
  activeRoundNum: number
  eventState: WeeklyEventState
}) {
  const theme = useTheme()
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const { data, isPending, isError, error, refetch } =
    useAdminOnlineTableReports({
      eventId,
      enabled: Boolean(eventId)
    })
  const launchRound1 = useLaunchOnlineRound1(eventId)
  const advanceRound = useAdvanceOnlineRound(eventId)
  const closeTournament = useCloseOnlineTournament(eventId)
  const advanceStatus = data?.advanceStatus
  const launchRound1Status = data?.launchRound1Status
  const tournamentClosed = eventState === 'close'

  const operationalRoundNum = data?.roundNum ?? activeRoundNum

  const roundOptions = useMemo(() => {
    const nums = new Set<number>()
    for (const r of data?.reports ?? []) nums.add(r.roundNum)
    return [...nums].sort((a, b) => a - b)
  }, [data?.reports])

  const defaultRound = useMemo(() => {
    const conflictRound = data?.conflictsByRound[0]?.roundNum
    if (conflictRound) return conflictRound
    if (operationalRoundNum > 0) return operationalRoundNum
    return roundOptions[0] ?? 0
  }, [data?.conflictsByRound, operationalRoundNum, roundOptions])

  const [roundOverride, setRoundOverride] = useState<number | null>(null)
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null)

  const roundFilter = roundOverride ?? defaultRound

  const roundTimerForView =
    data?.timerContext && roundFilter >= 1
      ? buildOnlineRoundTimerForRound({
          tournamentMode: 'online',
          state: data.timerContext.state,
          onlineRoundTimeMinutes: data.timerContext.onlineRoundTimeMinutes,
          roundSnapshots: data.timerContext.roundSnapshots,
          roundNum: roundFilter
        })
      : null

  const rowsForRound =
    !data?.reports.length || roundFilter < 1
      ? []
      : data.reports.filter(r => r.roundNum === roundFilter)

  const defaultSelectedKey = (() => {
    const conflict = rowsForRound.find(r => r.status === 'conflict')
    if (conflict) return `${conflict.roundNum}:${conflict.tableNumber}`
    if (rowsForRound[0]) {
      return `${rowsForRound[0].roundNum}:${rowsForRound[0].tableNumber}`
    }
    return null
  })()

  const selectedKey = selectedOverride ?? defaultSelectedKey

  const selected =
    selectedKey && data?.reports
      ? (data.reports.find(
          r => `${r.roundNum}:${r.tableNumber}` === selectedKey
        ) ?? null)
      : null

  if (isPending) {
    return (
      <Typography variant="body2" color="text.secondary">
        Cargando mesas online…
      </Typography>
    )
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      >
        {error instanceof Error ? error.message : 'Error al cargar'}
      </Alert>
    )
  }

  if (!data?.reports.length) {
    if (tournamentClosed) {
      return (
        <Alert severity="info" variant="outlined">
          Torneo finalizado. No hay mesas activas.
        </Alert>
      )
    }

    if (launchRound1Status?.canLaunchRound1) {
      return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={700}>
              Torneo programado — sin ronda publicada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {launchRound1Status.eligiblePlayers} jugador
              {launchRound1Status.eligiblePlayers === 1
                ? ' confirmado'
                : 'es confirmados'}{' '}
              con POP entran al torneo. La ronda 1 empareja al azar (bye si hay
              cantidad impar).
              {launchRound1Status.preregisteredWithPop > 0
                ? ` ${launchRound1Status.preregisteredWithPop} preinscrito${
                    launchRound1Status.preregisteredWithPop === 1 ? '' : 's'
                  } sin confirmar queda${
                    launchRound1Status.preregisteredWithPop === 1 ? '' : 'n'
                  } fuera.`
                : ''}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              disabled={launchRound1.isPending}
              onClick={() => launchRound1.mutate()}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                fontWeight: 700
              }}
            >
              {launchRound1.isPending ? 'Emparejando…' : 'Lanzar ronda 1'}
            </Button>
            {launchRound1.isError ? (
              <Alert severity="error" variant="outlined">
                {launchRound1.error instanceof Error
                  ? launchRound1.error.message
                  : 'Error al lanzar'}
              </Alert>
            ) : null}
            {launchRound1.isSuccess ? (
              <Alert severity="success" variant="outlined">
                Ronda 1 publicada ({launchRound1.data.pairingsCount} mesas).
                Torneo en curso.
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      )
    }

    return (
      <Alert severity="info" variant="outlined">
        {launchRound1Status?.blockReason ??
          'No hay mesas publicadas en rondas online. Publicá una ronda primero.'}
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      {roundTimerForView ? (
        <OnlineRoundTimer timer={roundTimerForView} variant="compact" />
      ) : null}

      {(data.conflictCount ?? 0) > 0 ? (
        <Alert severity="warning" icon={<GavelIcon />} variant="outlined">
          <Typography variant="body2" fontWeight={600}>
            {data.conflictCount} conflicto
            {data.conflictCount === 1 ? '' : 's'} en{' '}
            {data.conflictsByRound
              .map(c => `ronda ${c.roundNum} (${c.count})`)
              .join(', ')}
          </Typography>
        </Alert>
      ) : (
        <Alert severity="success" variant="outlined">
          Sin conflictos pendientes. Podés revisar chat y reportes por mesa.
        </Alert>
      )}

      {tournamentClosed ? (
        <Alert severity="info" variant="outlined">
          Torneo finalizado. Los jugadores verán clasificación y resultados
          cerrados.
        </Alert>
      ) : null}

      {advanceStatus &&
      advanceStatus.currentRoundNum > 0 &&
      !tournamentClosed ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Ronda {advanceStatus.currentRoundNum}:{' '}
                {advanceStatus.verifiedTables}/{advanceStatus.totalTables} mesas
                confirmadas
              </Typography>
              {advanceStatus.canAdvanceRound ? (
                <Typography variant="caption" color="text.secondary">
                  Todas las mesas listas. Podés publicar la siguiente ronda o
                  finalizar el torneo.
                </Typography>
              ) : advanceStatus.canCloseTournament ? (
                <Typography variant="caption" color="text.secondary">
                  Todas las mesas listas. Podés finalizar el torneo.
                </Typography>
              ) : advanceStatus.blockReason ? (
                <Typography variant="caption" color="text.secondary">
                  {advanceStatus.blockReason}
                </Typography>
              ) : null}
            </Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ flexShrink: 0 }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                disabled={
                  !advanceStatus.canAdvanceRound || advanceRound.isPending
                }
                onClick={() => {
                  advanceRound.mutate(undefined, {
                    onSuccess: () => {
                      setRoundOverride(null)
                      setSelectedOverride(null)
                    }
                  })
                }}
                sx={{ fontWeight: 700 }}
              >
                {advanceRound.isPending
                  ? 'Generando…'
                  : `Lanzar ronda ${advanceStatus.nextRoundNum}`}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FlagIcon />}
                disabled={
                  !advanceStatus.canCloseTournament || closeTournament.isPending
                }
                onClick={() => setCloseDialogOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                {closeTournament.isPending ? 'Cerrando…' : 'Finalizar torneo'}
              </Button>
            </Stack>
          </Stack>
          {advanceRound.isError ? (
            <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }}>
              {advanceRound.error instanceof Error
                ? advanceRound.error.message
                : 'Error al avanzar'}
            </Alert>
          ) : null}
          {advanceRound.isSuccess ? (
            <Alert severity="success" variant="outlined" sx={{ mt: 1.5 }}>
              Ronda {advanceRound.data.roundNum} publicada (
              {advanceRound.data.pairingsCount} mesas, emparejamiento Swiss).
            </Alert>
          ) : null}
          {closeTournament.isError ? (
            <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }}>
              {closeTournament.error instanceof Error
                ? closeTournament.error.message
                : 'Error al finalizar'}
            </Alert>
          ) : null}
          {closeTournament.isSuccess ? (
            <Alert severity="success" variant="outlined" sx={{ mt: 1.5 }}>
              Torneo finalizado. Clasificación publicada y puntos de
              participación otorgados.
            </Alert>
          ) : null}
        </Paper>
      ) : null}

      <Dialog
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        aria-labelledby="close-online-tournament-title"
      >
        <DialogTitle id="close-online-tournament-title">
          Finalizar torneo
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Cerrar el torneo online? Los jugadores ya no podrán reportar
            resultados ni chatear en mesa. Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={closeTournament.isPending}
            onClick={() => {
              closeTournament.mutate(undefined, {
                onSuccess: () => setCloseDialogOpen(false)
              })
            }}
          >
            {closeTournament.isPending ? 'Cerrando…' : 'Finalizar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="admin-online-round-filter">Ronda</InputLabel>
          <Select
            labelId="admin-online-round-filter"
            label="Ronda"
            value={roundFilter > 0 ? roundFilter : ''}
            onChange={e => {
              const n = Number(e.target.value)
              setRoundOverride(n)
              setSelectedOverride(null)
            }}
          >
            {roundOptions.map(n => {
              const conflicts =
                data.conflictsByRound.find(c => c.roundNum === n)?.count ?? 0
              return (
                <MenuItem key={n} value={n}>
                  Ronda {n}
                  {conflicts > 0 ? ` · ${conflicts} conflicto(s)` : ''}
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <Button size="small" variant="outlined" onClick={() => refetch()}>
          Actualizar
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 1fr) minmax(0, 1.1fr)'
          },
          gap: 2,
          alignItems: 'start'
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Mesas — ronda {roundFilter}
          </Typography>
          {rowsForRound.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin mesas en esta ronda.
            </Typography>
          ) : (
            rowsForRound.map(row => {
              const key = `${row.roundNum}:${row.tableNumber}`
              const active = selectedKey === key
              return (
                <Paper
                  key={key}
                  variant="outlined"
                  onClick={() => setSelectedOverride(key)}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: 2,
                    borderColor: active
                      ? 'primary.main'
                      : row.status === 'conflict'
                        ? 'error.main'
                        : 'divider',
                    bgcolor: active
                      ? alpha(theme.palette.primary.main, 0.06)
                      : row.status === 'conflict'
                        ? alpha(theme.palette.error.main, 0.04)
                        : 'background.paper'
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Mesa {row.tableNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {row.player1.displayName} vs {row.player2.displayName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {reportSummary(row)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={statusLabel(row.status)}
                      color={statusColor(row.status)}
                      variant={
                        row.status === 'conflict' ? 'filled' : 'outlined'
                      }
                    />
                  </Stack>
                </Paper>
              )
            })
          )}
        </Stack>

        <Box>
          {selected ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                Ronda {selected.roundNum} · Mesa {selected.tableNumber}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  {selected.player1.displayName} vs{' '}
                  {selected.player2.displayName}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {reportSummary(selected)}
                </Typography>
                <Chip
                  size="small"
                  label={statusLabel(selected.status)}
                  color={statusColor(selected.status)}
                  variant={
                    selected.status === 'conflict' ? 'filled' : 'outlined'
                  }
                  sx={{ mt: 1 }}
                />
              </Paper>
              {tournamentClosed ? null : (
                <>
                  {selected.status === 'conflict' ? (
                    <Alert severity="error" variant="outlined">
                      Conflicto entre reportes. Elegí el ganador abajo.
                    </Alert>
                  ) : null}
                  <MatchChatPanel
                    eventId={eventId}
                    roundNum={selected.roundNum}
                    tableNumber={selected.tableNumber}
                    opponentName={`${selected.player1.displayName} vs ${selected.player2.displayName}`}
                    enabled
                    showReportBar
                  />
                </>
              )}
            </Stack>
          ) : (
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 2, borderStyle: 'dashed' }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                {tournamentClosed
                  ? 'Elegí una mesa para ver el resultado.'
                  : 'Elegí una mesa para ver el chat y resolver el reporte.'}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Stack>
  )
}
