'use client'

import { useState } from 'react'
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { Add, Remove } from '@mui/icons-material'
import {
  computeTournamentPointsDistribution,
  defaultTopCount
} from '@/lib/tournament-points-distribution'
import {
  useSaveTournamentPointsAward,
  useTournamentPointsFinishedEvents,
  useTournamentPointsProposal,
  type TournamentPointsFinishedEvent,
  type TournamentPointsProposalRow
} from '@/hooks/useTournamentPoints'

function formatFinishedEventOptionLabel(
  ev: TournamentPointsFinishedEvent
): string {
  const date = new Date(ev.startsAt)
  const dateStr = Number.isFinite(date.getTime())
    ? date.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '—'
  const awarded = ev.hasAward ? ' · ya repartido' : ''
  return `${ev.title} · ${dateStr}${awarded} (${ev.participantCount} jug.)`
}

function applyDistribution(
  ranked: Omit<TournamentPointsProposalRow, 'place' | 'points'>[],
  playerCount: number,
  top: number
): TournamentPointsProposalRow[] {
  const pts = computeTournamentPointsDistribution(playerCount, top)
  return ranked.slice(0, top).map((r, i) => ({
    ...r,
    place: i + 1,
    points: pts[i] ?? 0
  }))
}

export default function TournamentPointsAwardPanel() {
  const eventsQuery = useTournamentPointsFinishedEvents(true)
  const [eventId, setEventId] = useState('')
  const [topCount, setTopCount] = useState(0)
  const [rows, setRows] = useState<TournamentPointsProposalRow[]>([])
  const [rankedAll, setRankedAll] = useState<
    Omit<TournamentPointsProposalRow, 'place' | 'points'>[]
  >([])
  const [initializedFor, setInitializedFor] = useState('')

  const proposalQuery = useTournamentPointsProposal(
    eventId || null,
    topCount > 0 ? topCount : 0
  )
  const save = useSaveTournamentPointsAward(eventId)

  const proposal = proposalQuery.data?.proposal
  const rankedFromQuery = proposalQuery.data?.rankedAll ?? []

  const [prevEventId, setPrevEventId] = useState(eventId)
  if (eventId !== prevEventId) {
    setPrevEventId(eventId)
    if (!eventId) {
      setTopCount(0)
      setRows([])
      setRankedAll([])
      setInitializedFor('')
    }
  }

  if (
    eventId &&
    proposal &&
    !proposalQuery.isFetching &&
    initializedFor !== eventId
  ) {
    setInitializedFor(eventId)
    setRankedAll(rankedFromQuery)
    setRows(proposal.rows)
    setTopCount(proposal.topCount)
  }

  const playerCount = proposal?.playerCount ?? 0
  const pointsSum = rows.reduce((s, r) => s + (Number(r.points) || 0), 0)

  const handleSelectEvent = (id: string) => {
    setEventId(id)
    setInitializedFor('')
    setRankedAll([])
    setRows([])
    const ev = eventsQuery.data?.find(e => e.id === id)
    const n = ev?.participantCount ?? 0
    setTopCount(n > 0 ? defaultTopCount(n) : 0)
  }

  const handleRemoveLast = () => {
    if (topCount <= 1) return
    const nextTop = topCount - 1
    setTopCount(nextTop)
    setRows(applyDistribution(rankedAll, playerCount, nextTop))
  }

  const handleAddOne = () => {
    if (topCount >= playerCount) return
    const nextTop = topCount + 1
    setTopCount(nextTop)
    setRows(applyDistribution(rankedAll, playerCount, nextTop))
  }

  const handleRecalculate = () => {
    setRows(applyDistribution(rankedAll, playerCount, topCount))
  }

  const existingAward = proposalQuery.data?.existingAward

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Reparte puntos de tienda según el torneo: hay{' '}
        <strong>1 punto por jugador inscrito</strong> (ej. 16 jugadores → 16
        puntos entre el top 8). Orden sugerido: 5, 3, 2, 2 y luego 1 por puesto.
        Puedes ajustar puestos y valores antes de aplicar al saldo.
      </Typography>

      <FormControl fullWidth size="small">
        <InputLabel id="tp-event-select">Torneo finalizado</InputLabel>
        <Select
          labelId="tp-event-select"
          label="Torneo finalizado"
          value={eventId}
          onChange={e => handleSelectEvent(e.target.value)}
          disabled={eventsQuery.isLoading || save.isPending}
          renderValue={selected => {
            if (!selected) {
              return <em>Selecciona un torneo</em>
            }
            const ev = eventsQuery.data?.find(e => e.id === selected)
            return ev ? formatFinishedEventOptionLabel(ev) : selected
          }}
        >
          <MenuItem value="">
            <em>Selecciona un torneo</em>
          </MenuItem>
          {(eventsQuery.data ?? []).map(ev => (
            <MenuItem key={ev.id} value={ev.id}>
              {formatFinishedEventOptionLabel(ev)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {eventsQuery.isError ? (
        <Alert severity="error">
          {eventsQuery.error instanceof Error
            ? eventsQuery.error.message
            : 'Error al cargar torneos'}
        </Alert>
      ) : null}

      {eventId && proposalQuery.isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Cargando clasificación…
        </Typography>
      ) : null}

      {existingAward ? (
        <Alert severity="info">
          Este torneo ya tiene puntos asignados (
          {new Date(
            (existingAward as { createdAt?: string }).createdAt ?? ''
          ).toLocaleString('es-CL') || 'fecha desconocida'}
          ). No se puede volver a aplicar desde aquí; edítalos en «Gestión y
          auditoría» más abajo.
        </Alert>
      ) : null}

      {eventId && rows.length > 0 && !existingAward ? (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              <strong>{playerCount}</strong> jugadores · top{' '}
              <strong>{topCount}</strong> · suma puntos:{' '}
              <strong>{pointsSum}</strong>
              {pointsSum !== playerCount ? (
                <Typography
                  component="span"
                  variant="body2"
                  color="warning.main"
                  sx={{ ml: 0.5 }}
                >
                  (esperado {playerCount})
                </Typography>
              ) : null}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<Remove />}
                disabled={topCount <= 1 || save.isPending}
                onClick={handleRemoveLast}
              >
                Quitar último
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                disabled={topCount >= playerCount || save.isPending}
                onClick={handleAddOne}
              >
                Agregar 1 más
              </Button>
              <Button
                size="small"
                variant="text"
                disabled={save.isPending}
                onClick={handleRecalculate}
              >
                Recalcular tabla
              </Button>
            </Stack>
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={64}>Puesto</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell width={120}>POP</TableCell>
                  <TableCell align="center" width={100}>
                    W/L/T
                  </TableCell>
                  <TableCell align="center" width={88}>
                    Puntos
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.popId}-${idx}`}>
                    <TableCell sx={{ fontWeight: 700 }}>{row.place}</TableCell>
                    <TableCell>{row.displayName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {row.popId}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {row.wins}-{row.losses}-{row.ties}
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={row.points}
                        onChange={e => {
                          const v = Math.max(
                            0,
                            Math.min(
                              99999,
                              Math.round(Number(e.target.value) || 0)
                            )
                          )
                          setRows(prev =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, points: v } : r
                            )
                          )
                        }}
                        inputProps={{ min: 0, style: { textAlign: 'center' } }}
                        sx={{ width: 72 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            variant="contained"
            disabled={save.isPending || rows.length === 0}
            onClick={() => {
              void save.mutateAsync(
                rows.map(r => ({
                  place: r.place,
                  popId: r.popId,
                  displayName: r.displayName,
                  userId: r.userId,
                  points: r.points
                }))
              )
            }}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            {save.isPending ? 'Aplicando…' : 'Aplicar puntos al saldo'}
          </Button>

          {save.isError ? (
            <Alert severity="error">
              {save.error instanceof Error
                ? save.error.message
                : 'Error al guardar'}
            </Alert>
          ) : null}
          {save.isSuccess && save.data ? (
            <Alert severity="success" onClose={() => save.reset()}>
              Puntos aplicados: <strong>{save.data.credited}</strong>{' '}
              jugador(es) , total <strong>{save.data.pointsTotal}</strong> pts.
              {(save.data.skippedNoUser ?? 0) > 0
                ? ` Sin usuario en la app: ${save.data.skippedNoUser}.`
                : ''}
            </Alert>
          ) : null}
        </>
      ) : null}

      {eventId &&
      !proposalQuery.isLoading &&
      rows.length === 0 &&
      !existingAward ? (
        <Alert severity="warning">
          No hay jugadores con POP en este torneo para repartir puntos.
        </Alert>
      ) : null}
    </Stack>
  )
}
