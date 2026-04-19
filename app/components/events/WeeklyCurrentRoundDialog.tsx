'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { formatWlt } from '@/components/events/weeklyEventsSectionUtils'
import {
  useEventCurrentRound,
  type EventCurrentRoundResponse
} from '@/hooks/useWeeklyEvents'

type CurrentRoundQuery = ReturnType<typeof useEventCurrentRound>

function WeeklyCurrentRoundDialogContent({
  query
}: {
  query: CurrentRoundQuery
}) {
  if (query.isPending) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress size={36} aria-label="Cargando ronda" />
      </Stack>
    )
  }

  if (query.isError) {
    return (
      <Alert severity="error" variant="outlined">
        {query.error instanceof Error
          ? query.error.message
          : 'No se pudo cargar la ronda'}
      </Alert>
    )
  }

  const data = query.data as EventCurrentRoundResponse | undefined
  if (!data) return null

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Ronda <strong>{data.roundNum}</strong>
        {data.syncedAt
          ? ` · Publicada ${new Date(data.syncedAt).toLocaleString('es-CL')}`
          : null}
      </Typography>
      {data.roundNum === 0 || !data.hasSnapshot ? (
        <Alert severity="info" variant="outlined">
          {data.roundNum === 0
            ? 'Todavía no hay una ronda en curso publicada para este torneo.'
            : 'La tienda aún no ha publicado los emparejamientos de esta ronda. Vuelve a intentar más tarde.'}
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 2,
            maxHeight: { xs: 360, sm: 480 }
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Mesa</TableCell>
                <TableCell>Jugador 1</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  W / L / T
                </TableCell>
                <TableCell>Jugador 2</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  W / L / T
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.pairings.map((row, idx) => (
                <TableRow key={`${row.tableNumber}-${idx}`}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {row.tableNumber || '—'}
                  </TableCell>
                  <TableCell>
                    {row.player1Name?.trim() || '—'}
                    {row.isBye ? (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5 }}
                      >
                        (bye)
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="center">
                    {formatWlt(row.player1Record)}
                  </TableCell>
                  <TableCell>
                    {row.isBye ? '—' : row.player2Name?.trim() || '—'}
                  </TableCell>
                  <TableCell align="center">
                    {row.isBye ? '—' : formatWlt(row.player2Record)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {data.skipped.length > 0 ? (
        <Alert severity="warning" variant="outlined">
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Mesas no aplicadas en el sistema
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.5}>
            {data.skipped.map((s, i) => (
              <Typography
                component="li"
                key={`${s.tableNumber}-${i}`}
                variant="body2"
              >
                Mesa {s.tableNumber}: {s.reason}
              </Typography>
            ))}
          </Stack>
        </Alert>
      ) : null}
    </Stack>
  )
}

export default function WeeklyCurrentRoundDialog({
  open,
  onClose,
  eventTitle,
  currentRoundQuery
}: {
  open: boolean
  onClose: () => void
  eventTitle: string
  currentRoundQuery: CurrentRoundQuery
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      aria-labelledby="current-round-dialog-title"
    >
      <DialogTitle id="current-round-dialog-title">Ronda en curso</DialogTitle>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ px: 3, pb: 0, mt: -1 }}
      >
        {eventTitle}
      </Typography>
      <DialogContent dividers sx={{ pt: 2 }}>
        <WeeklyCurrentRoundDialogContent query={currentRoundQuery} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button variant="contained" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
