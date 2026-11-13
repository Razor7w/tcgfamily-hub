'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import CasinoOutlined from '@mui/icons-material/CasinoOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
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
  PRECON_DEFAULT_SETTINGS,
  PRECON_MIN_PLAYERS,
  PRECON_TABLE_SIZE,
  emptyPreconResults,
  normalizePreconSettings,
  pairPreconFirstRound,
  pairPreconNextRound,
  preconSeatPoints,
  preconSettingsError,
  preconTableCount,
  readPreconTableResult,
  withPreconFinished,
  withPreconPoints,
  type PreconRound,
  type PreconSettings,
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
  settings: PreconSettings
}

function emptyNames(count: number): string[] {
  return Array.from({ length: count }, () => '')
}

function resizeNames(names: readonly string[], count: number): string[] {
  return [
    ...names.slice(0, count),
    ...emptyNames(Math.max(0, count - names.length))
  ]
}

function sampleNames(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => SAMPLE_NAMES[index] ?? `Jugador ${index + 1}`
  )
}

function isSeatTable(value: unknown, playerCount: number): value is number[][] {
  const tableCount = playerCount / PRECON_TABLE_SIZE
  if (!Array.isArray(value) || value.length !== tableCount) return false
  const seen = new Set<number>()
  for (const table of value) {
    if (!Array.isArray(table) || table.length !== PRECON_TABLE_SIZE)
      return false
    for (const seat of table) {
      if (typeof seat !== 'number' || seat < 0 || seat >= playerCount) {
        return false
      }
      if (seen.has(seat)) return false
      seen.add(seat)
    }
  }
  return seen.size === playerCount
}

function parseResults(
  value: unknown,
  settings: PreconSettings
): PreconTableResult[] {
  if (!Array.isArray(value) || value.length !== preconTableCount(settings)) {
    return emptyPreconResults(settings)
  }
  const results = value.map(readPreconTableResult)
  if (results.some(result => result === null)) {
    return emptyPreconResults(settings)
  }
  return results.filter(
    (result): result is PreconTableResult => result !== null
  )
}

function parseRound(
  value: unknown,
  settings: PreconSettings
): PreconRound | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { tables?: unknown; results?: unknown }
  if (!isSeatTable(record.tables, settings.players)) return null
  return {
    tables: record.tables,
    results: parseResults(record.results, settings)
  }
}

function parseSaved(raw: string | null): SavedPrecon {
  const blank: SavedPrecon = {
    names: emptyNames(PRECON_DEFAULT_SETTINGS.players),
    rounds: [],
    settings: PRECON_DEFAULT_SETTINGS
  }
  if (!raw) return blank
  try {
    const parsed = JSON.parse(raw) as Partial<SavedPrecon> & {
      tables?: unknown
      results?: unknown
    }
    const settings = normalizePreconSettings(parsed.settings)
    if (!Array.isArray(parsed.names)) return { ...blank, settings }
    const names = resizeNames(
      parsed.names.map(name => (typeof name === 'string' ? name : '')),
      settings.players
    )
    const rounds = Array.isArray(parsed.rounds)
      ? parsed.rounds
          .map(round => parseRound(round, settings))
          .filter((round): round is PreconRound => round !== null)
          .slice(0, settings.rounds)
      : []
    if (rounds.length === 0) {
      const legacy = parseRound(
        { tables: parsed.tables, results: parsed.results },
        settings
      )
      return { names, rounds: legacy ? [legacy] : [], settings }
    }
    return { names, rounds, settings }
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
  const { names, rounds, settings } = draft
  const activeRound = rounds[rounds.length - 1] ?? null
  const results = activeRound?.results ?? null
  const roundNumber = rounds.length
  const [error, setError] = useState<string | null>(null)
  const [tabOverride, setTabOverride] = useState<number | null>(null)
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [reportView, setReportView] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reshuffleOpen, setReshuffleOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [configDraft, setConfigDraft] = useState({
    players: String(PRECON_DEFAULT_SETTINGS.players),
    rounds: String(PRECON_DEFAULT_SETTINGS.rounds)
  })
  const [configError, setConfigError] = useState<string | null>(null)
  const requestedTab = tabOverride ?? (rounds.length > 0 ? rounds.length : 0)
  const tab =
    rounds.length === 0 ? 0 : Math.min(Math.max(requestedTab, 0), rounds.length)
  const viewedRound = tab > 0 ? (rounds[tab - 1] ?? null) : null
  const viewedTables = viewedRound?.tables ?? null
  const viewedResults = viewedRound?.results ?? null
  const editingRound = tab > 0 && tab === rounds.length
  const tournamentStarted = rounds.length > 0
  const hasScores = rounds.some(round =>
    round.results.some(
      result => result.finished || result.points.some(point => point > 0)
    )
  )
  const allFinished = Boolean(
    results && results.length > 0 && results.every(result => result.finished)
  )
  const canLaunchNext = allFinished && roundNumber < settings.rounds

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
        settings,
        rounds: [
          {
            tables: pairPreconFirstRound(names, settings),
            results: emptyPreconResults(settings)
          }
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
    setDraft({ names: sampleNames(settings.players), rounds, settings })
    setError(null)
  }

  const clearAll = () => {
    setDraft({ names: emptyNames(settings.players), rounds: [], settings })
    setError(null)
    setTabOverride(0)
  }

  const openConfig = () => {
    setConfigDraft({
      players: String(settings.players),
      rounds: String(settings.rounds)
    })
    setConfigError(null)
    setConfigOpen(true)
  }

  const saveConfig = () => {
    if (tournamentStarted) return
    const next = {
      players: Number(configDraft.players),
      rounds: Number(configDraft.rounds)
    }
    const invalid = preconSettingsError(next)
    if (invalid) {
      setConfigError(invalid)
      return
    }
    setDraft({
      names: resizeNames(names, next.players),
      rounds: [],
      settings: next
    })
    setTabOverride(0)
    setConfigError(null)
    setConfigOpen(false)
  }

  const launchNext = () => {
    try {
      setDraft({
        names,
        settings,
        rounds: [
          ...rounds,
          {
            tables: pairPreconNextRound(rounds, settings),
            results: emptyPreconResults(settings)
          }
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
      settings,
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
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 800 }}
                >
                  Precon
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SettingsOutlined />}
                  onClick={openConfig}
                >
                  Configuración
                </Button>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.6 }}
              >
                Inscribe a los {settings.players} jugadores y sortea la primera
                ronda en mesas de {PRECON_TABLE_SIZE}. En cada mesa anota los
                puntos a mano y finaliza la mesa. Esos puntos arman la siguiente
                ronda.
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
                      setDraft({ names: next, rounds, settings })
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
                  Rellenar {settings.players} nombres
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
                                  {seats.map((playerIndex, seat) => (
                                    <Stack
                                      key={playerIndex}
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
                                      <TextField
                                        type="number"
                                        size="small"
                                        label="Puntos"
                                        disabled={
                                          !editingRound || result.finished
                                        }
                                        value={result.points[seat] ?? 0}
                                        onChange={event => {
                                          updateResult(
                                            tableIndex,
                                            withPreconPoints(
                                              result,
                                              seat,
                                              Number(event.target.value)
                                            )
                                          )
                                        }}
                                        sx={{ width: 112 }}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                      />
                                    </Stack>
                                  ))}
                                </Stack>
                                {editingRound && !result.finished ? (
                                  <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => {
                                      updateResult(
                                        tableIndex,
                                        withPreconFinished(result, true)
                                      )
                                    }}
                                    sx={{ mt: 1.5 }}
                                  >
                                    Finalizar mesa
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
        <Dialog
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          fullWidth
        >
          <DialogTitle>Configuración del precon</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {tournamentStarted ? (
                <Alert severity="info">
                  El torneo ya comenzó. Borra la lista para poder cambiar la
                  configuración.
                </Alert>
              ) : null}
              <TextField
                label="Jugadores"
                type="number"
                value={configDraft.players}
                onChange={event =>
                  setConfigDraft(current => ({
                    ...current,
                    players: event.target.value
                  }))
                }
                helperText={`Mínimo ${PRECON_MIN_PLAYERS} y múltiplo de ${PRECON_TABLE_SIZE}.`}
                disabled={tournamentStarted}
                fullWidth
                slotProps={{
                  htmlInput: {
                    min: PRECON_MIN_PLAYERS,
                    step: PRECON_TABLE_SIZE
                  }
                }}
              />
              <TextField
                label="Rondas"
                type="number"
                value={configDraft.rounds}
                onChange={event =>
                  setConfigDraft(current => ({
                    ...current,
                    rounds: event.target.value
                  }))
                }
                helperText="De 1 a 5."
                disabled={tournamentStarted}
                fullWidth
                slotProps={{ htmlInput: { min: 1, max: 5 } }}
              />
              {configError ? (
                <Alert severity="error">{configError}</Alert>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={saveConfig}
              disabled={tournamentStarted}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
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
