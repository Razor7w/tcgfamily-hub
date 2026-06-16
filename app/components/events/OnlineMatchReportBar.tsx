'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { useOnlineMatchReport } from '@/hooks/useOnlineMatchReport'

function winnerLabel(
  popId: string | null | undefined,
  player1: { popId: string; displayName: string },
  player2: { popId: string; displayName: string }
): string | null {
  if (!popId) return null
  if (popId === player1.popId) return player1.displayName
  if (popId === player2.popId) return player2.displayName
  return popId
}

function statusMessage(args: {
  status: string
  opponentReported: boolean
  countdownSec: number | null
  winnerIsMe: boolean | null
  isStaff: boolean
  myReportedWinnerPopId: string | null
  opponentReportedWinnerPopId: string | null
  player1: { popId: string; displayName: string }
  player2: { popId: string; displayName: string }
}): string {
  if (args.status === 'verified') {
    if (args.winnerIsMe === true) return 'Victoria confirmada.'
    if (args.winnerIsMe === false) return 'Derrota confirmada.'
    return 'Resultado confirmado.'
  }
  if (args.isStaff && args.status !== 'verified') {
    if (args.status === 'conflict') {
      return 'Conflicto entre jugadores. Asigná quién ganó.'
    }
    return 'Asigná quién ganó la partida (staff).'
  }
  if (args.status === 'conflict') {
    const mine = winnerLabel(
      args.myReportedWinnerPopId,
      args.player1,
      args.player2
    )
    const theirs = winnerLabel(
      args.opponentReportedWinnerPopId,
      args.player1,
      args.player2
    )
    if (mine && theirs) {
      return `Conflicto: vos reportaste a ${mine}, tu rival a ${theirs}. El staff debe resolver.`
    }
    return 'Conflicto entre reportes. El staff debe resolver el resultado.'
  }
  if (args.status === 'verifying') {
    const countdown =
      args.countdownSec != null && args.countdownSec > 0
        ? `0:${String(args.countdownSec).padStart(2, '0')}`
        : null
    if (!args.myReportedWinnerPopId && args.opponentReported) {
      return countdown
        ? `Tu rival ya reportó. Tenés ${countdown} para indicar quién ganó.`
        : 'Tu rival ya reportó. Indicá quién ganó la partida.'
    }
    if (args.myReportedWinnerPopId && !args.opponentReported) {
      return countdown
        ? `Esperando al rival (${countdown} para confirmación automática).`
        : 'Esperando reporte del rival…'
    }
    if (countdown) {
      return `Confirmación automática en ${countdown} si el rival no responde.`
    }
    return 'Confirmando resultado…'
  }
  return 'Indiquen quién ganó la partida.'
}

function WinnerButtons({
  player1,
  player2,
  selectedPopId,
  disabled,
  onPick,
  prefix
}: {
  player1: { popId: string; displayName: string }
  player2: { popId: string; displayName: string }
  selectedPopId: string | null
  disabled: boolean
  onPick: (popId: string) => void
  prefix: string
}) {
  return (
    <Stack direction="row" spacing={1}>
      {[player1, player2].map(p => (
        <Button
          key={p.popId}
          variant={selectedPopId === p.popId ? 'contained' : 'outlined'}
          color="primary"
          size="small"
          disabled={disabled}
          onClick={() => onPick(p.popId)}
          sx={{ flex: 1 }}
        >
          {prefix}
          {p.displayName}
        </Button>
      ))}
    </Stack>
  )
}

export default function OnlineMatchReportBar({
  eventId,
  roundNum,
  tableNumber,
  enabled
}: {
  eventId: string
  roundNum: number
  tableNumber: string
  enabled: boolean
}) {
  const theme = useTheme()
  const {
    report,
    isLoading,
    loadError,
    submitWinner,
    staffResolve,
    isSubmitting,
    submitError,
    countdownSec
  } = useOnlineMatchReport({
    eventId,
    roundNum,
    tableNumber,
    enabled
  })

  if (!enabled) return null

  const status = report?.status ?? 'open'
  const verified = status === 'verified'
  const conflict = status === 'conflict'
  const player1 = report?.player1 ?? { popId: '', displayName: 'Jugador 1' }
  const player2 = report?.player2 ?? { popId: '', displayName: 'Jugador 2' }

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.secondary.main, 0.04)
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        Reporte de partida
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        {isLoading
          ? 'Cargando…'
          : statusMessage({
              status,
              opponentReported: Boolean(report?.opponentReported),
              countdownSec,
              winnerIsMe: report?.winnerIsMe ?? null,
              isStaff: Boolean(report?.isStaff),
              myReportedWinnerPopId: report?.myReportedWinnerPopId ?? null,
              opponentReportedWinnerPopId:
                report?.opponentReportedWinnerPopId ?? null,
              player1,
              player2
            })}
      </Typography>

      {loadError ? (
        <Alert severity="error" variant="outlined" sx={{ mb: 1 }}>
          {loadError}
        </Alert>
      ) : null}

      {report?.canSubmit ? (
        <WinnerButtons
          player1={player1}
          player2={player2}
          selectedPopId={report.myReportedWinnerPopId}
          disabled={isSubmitting}
          onPick={submitWinner}
          prefix="Ganó "
        />
      ) : null}

      {report?.canStaffResolve ? (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.75, display: 'block' }}
          >
            Asignar resultado (staff)
          </Typography>
          <WinnerButtons
            player1={player1}
            player2={player2}
            selectedPopId={null}
            disabled={isSubmitting}
            onPick={staffResolve}
            prefix="Ganó "
          />
        </Box>
      ) : null}

      {verified ? (
        <Alert
          severity="success"
          variant="outlined"
          sx={{ mt: report?.canSubmit || report?.canStaffResolve ? 1 : 0 }}
        >
          Resultado registrado en el torneo.
        </Alert>
      ) : null}

      {conflict && !report?.canStaffResolve ? (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
          No podés cambiar tu reporte mientras haya conflicto. Contactá al staff
          del torneo.
        </Alert>
      ) : null}

      {submitError ? (
        <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
          {submitError}
        </Alert>
      ) : null}
    </Box>
  )
}
