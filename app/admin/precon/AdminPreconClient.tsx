'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import CasinoOutlined from '@mui/icons-material/CasinoOutlined'
import ContentCopy from '@mui/icons-material/ContentCopy'
import RestartAlt from '@mui/icons-material/RestartAlt'
import WhatsApp from '@mui/icons-material/WhatsApp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import {
  PRECON_FIELD_SIZE,
  PRECON_KILL_POINTS,
  PRECON_MAX_KILLS,
  PRECON_POINTS_CAP,
  PRECON_ROUND_LIMIT,
  PRECON_TABLE_COUNT,
  PRECON_WIN_POINTS,
  emptyPreconResults,
  isPreconTableResult,
  pairPreconFirstRound,
  pairPreconNextRound,
  preconKillChoices,
  preconMissingWinner,
  preconSeatPoints,
  preconTablePoints,
  withPreconFinished,
  withPreconKills,
  withPreconWinner,
  type PreconRound,
  type PreconTableResult
} from '@/lib/precon-pairing'

const STORAGE_KEY = 'tcgfamily-hub:precon-round1'

type TableFilter = 'all' | 'open' | 'done'

function tableMatches(finished: boolean, filter: TableFilter): boolean {
  if (filter === 'open') return !finished
  if (filter === 'done') return finished
  return true
}

const SAMPLE_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elena',
  'Felipe',
  'Gloria',
  'Hugo',
  'Irene',
  'Jorge',
  'Karen',
  'Luis',
  'Marta',
  'Nico',
  'Olga',
  'Pablo'
]

type SavedPrecon = {
  names: string[]
  rounds: PreconRound[]
}

function emptyNames(): string[] {
  return Array.from({ length: PRECON_FIELD_SIZE }, () => '')
}

function isSeatTable(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length !== 4) return false
  const seen = new Set<number>()
  for (const table of value) {
    if (!Array.isArray(table) || table.length !== 4) return false
    for (const seat of table) {
      if (typeof seat !== 'number' || seat < 0 || seat >= PRECON_FIELD_SIZE) {
        return false
      }
      if (seen.has(seat)) return false
      seen.add(seat)
    }
  }
  return seen.size === PRECON_FIELD_SIZE
}

function parseResults(value: unknown): PreconTableResult[] | null {
  if (
    Array.isArray(value) &&
    value.length === PRECON_TABLE_COUNT &&
    value.every(isPreconTableResult)
  ) {
    return value.map(result => ({
      kills: result.kills,
      winner: result.winner,
      finished: result.finished === true
    }))
  }
  return emptyPreconResults()
}

function parseRound(value: unknown): PreconRound | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { tables?: unknown; results?: unknown }
  if (!isSeatTable(record.tables)) return null
  return {
    tables: record.tables,
    results: parseResults(record.results) ?? emptyPreconResults()
  }
}

function parseSaved(raw: string | null): SavedPrecon {
  const blank: SavedPrecon = { names: emptyNames(), rounds: [] }
  if (!raw) return blank
  try {
    const parsed = JSON.parse(raw) as Partial<SavedPrecon> & {
      tables?: unknown
      results?: unknown
    }
    if (
      !Array.isArray(parsed.names) ||
      parsed.names.length !== PRECON_FIELD_SIZE
    ) {
      return blank
    }
    const names = parsed.names.map(name =>
      typeof name === 'string' ? name : ''
    )
    if (Array.isArray(parsed.rounds)) {
      const rounds = parsed.rounds
        .map(parseRound)
        .filter((round): round is PreconRound => round !== null)
        .slice(0, PRECON_ROUND_LIMIT)
      return { names, rounds }
    }
    const legacy = parseRound({
      tables: parsed.tables,
      results: parsed.results
    })
    return { names, rounds: legacy ? [legacy] : [] }
  } catch {
    return blank
  }
}

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cacheReady = false

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readRaw(): string | null {
  if (!cacheReady) {
    cacheReady = true
    try {
      cachedRaw = localStorage.getItem(STORAGE_KEY)
    } catch {
      cachedRaw = null
    }
  }
  return cachedRaw
}

function readServerRaw(): string | null {
  return null
}

function writeDraft(next: SavedPrecon) {
  cachedRaw = JSON.stringify(next)
  try {
    localStorage.setItem(STORAGE_KEY, cachedRaw)
  } catch {
    // Sigue en memoria si el navegador bloquea el almacenamiento.
  }
  for (const listener of listeners) listener()
}

export default function AdminPreconClient() {
  const raw = useSyncExternalStore(subscribe, readRaw, readServerRaw)
  const draft = useMemo(() => parseSaved(raw), [raw])
  const { names, rounds } = draft
  const activeRound = rounds[rounds.length - 1] ?? null
  const results = activeRound?.results ?? null
  const roundNumber = rounds.length
  const [error, setError] = useState<string | null>(null)
  const [tabOverride, setTabOverride] = useState<number | null>(null)
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [reportView, setReportView] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reshuffleOpen, setReshuffleOpen] = useState(false)
  const requestedTab = tabOverride ?? (rounds.length > 0 ? rounds.length : 0)
  const tab =
    rounds.length === 0 ? 0 : Math.min(Math.max(requestedTab, 0), rounds.length)
  const viewedRound = tab > 0 ? (rounds[tab - 1] ?? null) : null
  const viewedTables = viewedRound?.tables ?? null
  const viewedResults = viewedRound?.results ?? null
  const editingRound = tab > 0 && tab === rounds.length
  const hasScores = rounds.some(round =>
    round.results.some(
      result => result.winner !== null || result.kills.some(kill => kill > 0)
    )
  )
  const allFinished = Boolean(
    results && results.length > 0 && results.every(result => result.finished)
  )
  const canLaunchNext = allFinished && roundNumber < PRECON_ROUND_LIMIT

  const setDraft = (next: SavedPrecon) => {
    writeDraft(next)
  }

  const trimmed = useMemo(() => names.map(name => name.trim()), [names])
  const ready = trimmed.every(name => name.length > 0)
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const name of trimmed) {
      if (!name) continue
      const key = name.toLocaleLowerCase('es')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  }, [trimmed])

  const commitRound = () => {
    try {
      setDraft({
        names,
        rounds: [
          { tables: pairPreconFirstRound(names), results: emptyPreconResults() }
        ]
      })
      setError(null)
      setReportView(false)
      setTabOverride(1)
      setReshuffleOpen(false)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo asignar la primera ronda.'
      )
      setReshuffleOpen(false)
    }
  }

  const assignRound = () => {
    if (hasScores) {
      setReshuffleOpen(true)
      return
    }
    commitRound()
  }

  const fillSampleNames = () => {
    setDraft({ names: [...SAMPLE_NAMES], rounds })
    setError(null)
  }

  const clearAll = () => {
    setDraft({ names: emptyNames(), rounds: [] })
    setError(null)
    setTabOverride(0)
  }

  const launchNext = () => {
    try {
      setDraft({
        names,
        rounds: [
          ...rounds,
          { tables: pairPreconNextRound(rounds), results: emptyPreconResults() }
        ]
      })
      setError(null)
      setTableFilter('all')
      setReportView(false)
      setTabOverride(rounds.length + 1)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo lanzar la siguiente ronda.'
      )
    }
  }

  const updateResult = (tableIndex: number, next: PreconTableResult) => {
    if (!activeRound) return
    setDraft({
      names,
      rounds: rounds.map((round, index) =>
        index === rounds.length - 1
          ? {
              ...round,
              results: round.results.map((result, resultIndex) =>
                resultIndex === tableIndex ? next : result
              )
            }
          : round
      )
    })
  }

  const standings = useMemo(() => {
    if (rounds.length === 0) return []
    const totals = new Map<number, number | null>()
    for (const round of rounds) {
      for (const seats of round.tables) {
        for (const player of seats) {
          if (!totals.has(player)) totals.set(player, null)
        }
      }
      round.tables.forEach((seats, tableIndex) => {
        const result = round.results[tableIndex]
        if (!result) return
        seats.forEach((playerIndex, seat) => {
          const scored = preconSeatPoints(result, seat)
          if (scored === null) return
          totals.set(playerIndex, (totals.get(playerIndex) ?? 0) + scored)
        })
      })
    }
    const rows = [...totals.entries()].map(([playerIndex, points]) => ({
      playerIndex,
      name: names[playerIndex]?.trim() || 'Sin nombre',
      points
    }))
    return rows.sort((a, b) => {
      if (a.points === null && b.points === null) {
        return a.name.localeCompare(b.name, 'es')
      }
      if (a.points === null) return 1
      if (b.points === null) return -1
      if (b.points !== a.points) return b.points - a.points
      return a.name.localeCompare(b.name, 'es')
    })
  }, [names, rounds])

  const shareText = useMemo(() => {
    if (!viewedTables) return ''
    const lines = [`*Ronda ${tab}*`, '']
    viewedTables.forEach((seats, index) => {
      lines.push(`*Mesa ${index + 1}*`)
      for (const playerIndex of seats) {
        lines.push(names[playerIndex]?.trim() || 'Sin nombre')
      }
      lines.push('')
    })
    return lines.join('\n').trim()
  }, [names, tab, viewedTables])

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar el mensaje.')
    }
  }

  const sendShareText = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        py: 4,
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.05)} 0%, ${t.palette.background.default} 42%)`
      })}
    >
      <Container maxWidth="md">
        <AdminStorePageHeading>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: t => alpha(t.palette.primary.main, 0.1),
                color: 'primary.main',
                flexShrink: 0
              }}
            >
              <CasinoOutlined />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                Precon
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.6 }}
              >
                Inscribe a los 16 jugadores y sortea la primera ronda en 4 mesas
                de 4. En cada mesa: {PRECON_KILL_POINTS} punto por rival
                eliminado y {PRECON_WIN_POINTS} por ganar, con un tope de{' '}
                {PRECON_POINTS_CAP}. Quien gana suma{' '}
                {preconTablePoints({ kills: 3, won: true })}, aunque haya
                eliminado rivales. Dos bajas sin ganar suman{' '}
                {preconTablePoints({ kills: 2, won: false })}.
              </Typography>
            </Box>
          </Stack>
        </AdminStorePageHeading>

        <Box sx={{ mt: 3 }}>
          <Tabs
            value={tab}
            onChange={(_event, value: number) => setTabOverride(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Jugadores" />
            {rounds.map((round, index) => (
              <Tab key={index} label={`Ronda ${index + 1}`} value={index + 1} />
            ))}
          </Tabs>

          {tab === 0 ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mt: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5
                }}
              >
                {names.map((name, index) => (
                  <TextField
                    key={index}
                    label={`Jugador ${index + 1}`}
                    value={name}
                    onChange={event => {
                      const next = [...names]
                      next[index] = event.target.value
                      setDraft({ names: next, rounds })
                    }}
                    fullWidth
                    autoComplete="off"
                  />
                ))}
              </Box>

              {duplicateNames.length > 0 ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Hay nombres repetidos. Distínguelos antes de sentarlos, si no
                  las mesas se leen igual.
                </Alert>
              ) : null}
              {error ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              ) : null}

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mt: 2 }}
              >
                <Button
                  variant="contained"
                  startIcon={<CasinoOutlined />}
                  onClick={assignRound}
                  disabled={!ready}
                >
                  Asignar primera ronda
                </Button>
                <Button variant="outlined" onClick={fillSampleNames}>
                  Rellenar 16 nombres
                </Button>
                <Button
                  variant="text"
                  color="inherit"
                  startIcon={<RestartAlt />}
                  onClick={clearAll}
                >
                  Borrar lista
                </Button>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5 }}
              >
                El sorteo queda guardado en este navegador. Si cambias de
                computador hay que anotarlo de nuevo.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Ronda {tab}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  {editingRound && canLaunchNext ? (
                    <Button variant="contained" onClick={launchNext}>
                      Lanzar ronda {roundNumber + 1}
                    </Button>
                  ) : null}
                  {editingRound && rounds.length === 1 ? (
                    <Button
                      variant="outlined"
                      startIcon={<CasinoOutlined />}
                      onClick={assignRound}
                      disabled={!ready}
                    >
                      Volver a sortear
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
              {error ? (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {error}
                </Alert>
              ) : null}
              {viewedTables && viewedResults ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: reportView ? 500 : 800 }}
                    >
                      Compartir mesas
                    </Typography>
                    <Switch
                      checked={reportView}
                      onChange={(_event, checked) => setReportView(checked)}
                      inputProps={{
                        'aria-label':
                          'Cambiar entre compartir mesas y reportar resultado'
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: reportView ? 800 : 500 }}
                    >
                      Reportar resultado
                    </Typography>
                  </Stack>
                  {reportView ? (
                    <>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={tableFilter}
                        onChange={(_event, value: TableFilter | null) => {
                          if (value) setTableFilter(value)
                        }}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        <ToggleButton value="all">Todas</ToggleButton>
                        <ToggleButton value="open">
                          En curso (
                          {
                            viewedResults.filter(result => !result.finished)
                              .length
                          }
                          )
                        </ToggleButton>
                        <ToggleButton value="done">
                          Completadas (
                          {
                            viewedResults.filter(result => result.finished)
                              .length
                          }
                          )
                        </ToggleButton>
                      </ToggleButtonGroup>
                      {viewedResults.every(
                        result => !tableMatches(result.finished, tableFilter)
                      ) ? (
                        <Alert severity="info">
                          {tableFilter === 'done'
                            ? 'Todavía no hay mesas completadas en esta ronda.'
                            : 'No hay mesas en curso. Esta ronda está completa.'}
                        </Alert>
                      ) : (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            gap: 1.5
                          }}
                        >
                          {viewedTables.map((seats, tableIndex) => {
                            const result = viewedResults[tableIndex]
                            if (
                              !result ||
                              !tableMatches(result.finished, tableFilter)
                            ) {
                              return null
                            }
                            const swept = result.kills.findIndex(
                              kill => kill === PRECON_MAX_KILLS
                            )
                            return (
                              <Paper
                                key={tableIndex}
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  borderRadius: 3,
                                  borderColor: result.finished
                                    ? 'success.main'
                                    : 'divider'
                                }}
                              >
                                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
                                  Mesa {tableIndex + 1}
                                </Typography>
                                <Stack spacing={1.5}>
                                  {seats.map((playerIndex, seat) => {
                                    const points = preconSeatPoints(
                                      result,
                                      seat
                                    )
                                    const choices = preconKillChoices(
                                      result,
                                      seat
                                    )
                                    const kills = result.kills[seat] ?? 0
                                    const won = result.winner === seat
                                    return (
                                      <Box key={playerIndex}>
                                        <Stack
                                          direction="row"
                                          spacing={1}
                                          alignItems="center"
                                          justifyContent="space-between"
                                        >
                                          <Typography
                                            sx={{
                                              fontWeight: 700,
                                              lineHeight: 1.3
                                            }}
                                          >
                                            {names[playerIndex]?.trim() ||
                                              'Sin nombre'}
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontWeight: 800,
                                              color:
                                                points === null
                                                  ? 'text.secondary'
                                                  : 'primary.main'
                                            }}
                                          >
                                            {points === null
                                              ? '—'
                                              : `${points} pts`}
                                          </Typography>
                                        </Stack>
                                        <Stack
                                          direction="row"
                                          spacing={1}
                                          alignItems="center"
                                          sx={{ mt: 0.75 }}
                                        >
                                          <TextField
                                            select
                                            size="small"
                                            label="Bajas"
                                            disabled={
                                              !editingRound || result.finished
                                            }
                                            value={kills}
                                            onChange={event => {
                                              updateResult(
                                                tableIndex,
                                                withPreconKills(
                                                  result,
                                                  seat,
                                                  Number(event.target.value)
                                                )
                                              )
                                            }}
                                            sx={{ width: 96 }}
                                          >
                                            {choices.map(choice => (
                                              <MenuItem
                                                key={choice}
                                                value={choice}
                                              >
                                                {choice}
                                              </MenuItem>
                                            ))}
                                          </TextField>
                                          <Button
                                            size="small"
                                            variant={
                                              won ? 'contained' : 'outlined'
                                            }
                                            disabled={
                                              !editingRound ||
                                              result.finished ||
                                              (swept >= 0 && swept !== seat)
                                            }
                                            onClick={() => {
                                              updateResult(
                                                tableIndex,
                                                withPreconWinner(result, seat)
                                              )
                                            }}
                                          >
                                            Ganó
                                          </Button>
                                        </Stack>
                                      </Box>
                                    )
                                  })}
                                </Stack>
                                {preconMissingWinner(result) ? (
                                  <Typography
                                    variant="caption"
                                    color="warning.main"
                                    sx={{ display: 'block', mt: 1.25 }}
                                  >
                                    Falta marcar quién ganó la mesa.
                                  </Typography>
                                ) : null}
                                {editingRound && !result.finished ? (
                                  <Button
                                    fullWidth
                                    variant="outlined"
                                    disabled={result.winner === null}
                                    onClick={() => {
                                      updateResult(
                                        tableIndex,
                                        withPreconFinished(result, true)
                                      )
                                    }}
                                    sx={{ mt: 1.5 }}
                                  >
                                    Mesa finalizada
                                  </Button>
                                ) : null}
                                {editingRound && result.finished ? (
                                  <Button
                                    size="small"
                                    color="inherit"
                                    onClick={() => {
                                      updateResult(
                                        tableIndex,
                                        withPreconFinished(result, false)
                                      )
                                    }}
                                    sx={{ mt: 0.5 }}
                                  >
                                    Corregir
                                  </Button>
                                ) : null}
                              </Paper>
                            )
                          })}
                        </Box>
                      )}
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                        <Typography sx={{ fontWeight: 800, mb: 1.25 }}>
                          {roundNumber > 1
                            ? 'Puntaje del torneo'
                            : 'Puntaje de la ronda'}
                        </Typography>
                        <Stack spacing={0.75}>
                          {standings.map(row => (
                            <Stack
                              key={row.playerIndex}
                              direction="row"
                              spacing={1}
                              justifyContent="space-between"
                            >
                              <Typography sx={{ fontWeight: 600 }}>
                                {row.name}
                              </Typography>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color:
                                    row.points === null
                                      ? 'text.secondary'
                                      : 'text.primary'
                                }}
                              >
                                {row.points === null
                                  ? 'Sin anotar'
                                  : row.points}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Paper>
                    </>
                  ) : (
                    <>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                      >
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<WhatsApp />}
                          onClick={sendShareText}
                        >
                          Enviar por WhatsApp
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<ContentCopy />}
                          onClick={() => {
                            void copyShareText()
                          }}
                        >
                          {copied ? 'Copiado' : 'Copiar mensaje'}
                        </Button>
                      </Stack>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5
                        }}
                      >
                        {viewedTables.map((seats, tableIndex) => (
                          <Paper
                            key={tableIndex}
                            variant="outlined"
                            sx={{ p: 2, borderRadius: 3 }}
                          >
                            <Typography sx={{ fontWeight: 800, mb: 1 }}>
                              Mesa {tableIndex + 1}
                            </Typography>
                            <Stack spacing={0.5}>
                              {seats.map(playerIndex => (
                                <Typography
                                  key={playerIndex}
                                  sx={{ fontWeight: 700, lineHeight: 1.4 }}
                                >
                                  {names[playerIndex]?.trim() || 'Sin nombre'}
                                </Typography>
                              ))}
                            </Stack>
                          </Paper>
                        ))}
                      </Box>
                    </>
                  )}
                </Stack>
              ) : (
                <Alert severity="info">
                  Todavía no hay mesas. Anota a los 16 en Jugadores y asigna la
                  ronda.
                </Alert>
              )}
            </Box>
          )}
        </Box>
        <Dialog open={reshuffleOpen} onClose={() => setReshuffleOpen(false)}>
          <DialogTitle>Volver a sortear</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Se sortea de nuevo la primera ronda y se borran los puntajes ya
              anotados.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReshuffleOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={commitRound}>
              Sortear
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}
