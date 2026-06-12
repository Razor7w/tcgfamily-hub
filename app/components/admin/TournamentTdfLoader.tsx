'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ExpandMore from '@mui/icons-material/ExpandMore'
import {
  CloudUpload,
  DeleteOutline,
  EventSeat,
  FolderOpen,
  GroupAdd,
  MergeType
} from '@mui/icons-material'
import InferredTdfStandingsEditor from '@/components/admin/InferredTdfStandingsEditor'
import {
  buildInferredStandingsByCategory,
  buildUnifiedInferredStandings
} from '@/lib/inferred-tdf-standings'
import {
  buildPlayerTiebreakersFromMatches,
  formatTiebreakerPercent,
  OPPONENT_WIN_PCT_FLOOR
} from '@/lib/tournament-tiebreakers'
import { buildFullTournamentUploadPayload } from '@/lib/tournament-tdf-payload'
import {
  buildMatchRecordsFromMatches,
  buildParticipantRecordsForSyncRound,
  buildPlayerNameLookup,
  buildRecordsBeforeEachMatch,
  droppedPopIdsFromPlayers,
  filterMatchesExcludingRounds,
  formatMatchRecordWlt,
  groupMatchesByRound,
  parseTournamentXml,
  tdfStandingsHasPlayers,
  type ParsedMatch,
  type TournamentStandingsCategoryPayload
} from '@/lib/tournament-xml'
import { popidForStorage, validatePopidOptional } from '@/lib/rut-chile'
import {
  useAdminDeleteEventRound,
  useAdminPreinscribeBatch,
  useAdminSyncEventRound,
  useAdminUploadFullTournament,
  useAdminUploadStandingsPod,
  type AdminSavedRoundPairing,
  type AdminSavedRoundSnapshot,
  type AdminSyncRoundResult
} from '@/hooks/useWeeklyEvents'

function standingsPodTypeLabel(type: string) {
  const t = type.toLowerCase()
  if (t === 'finished') return 'Finalizado'
  if (t === 'dnf') return 'DNF (no terminó)'
  return type || '—'
}

/** Índices TDF: 0 Júnior, 1 Sénior, 2 Máster. */
function standingsCategoryTitle(category: string): string {
  const n = parseInt(category, 10)
  if (n === 0) return 'Categoría Júnior'
  if (n === 1) return 'Categoría Sénior'
  if (n === 2) return 'Categoría Máster'
  return `Categoría ${category || '—'}`
}

function standingsCategoryIndex(cat: string): 0 | 1 | 2 | null {
  const n = parseInt(cat, 10)
  if (n === 0 || n === 1 || n === 2) return n
  return null
}

type DisplayPairing = AdminSavedRoundPairing

type TournamentTdfLoaderProps = {
  /** Si es false, no muestra el párrafo introductorio (p. ej. la página Torneo XML ya lo tiene arriba). */
  showIntro?: boolean
  /** Evento semanal: muestra botón de preinscripción en lote al listado. */
  eventId?: string
  /** POP ID ya presentes en el evento (normalizados con `popidForStorage`), para no duplicar. */
  registeredPopIds?: string[]
  /** Números de ronda ya guardados en el evento. */
  syncedRoundNums?: number[]
  /** Snapshots persistidos (se muestran sin cargar .tdf). */
  savedRoundSnapshots?: AdminSavedRoundSnapshot[]
  /** Ronda operativa actual del evento. */
  eventRoundNum?: number
}

function formatWltRecord(r?: {
  wins: number
  losses: number
  ties: number
}): string {
  if (!r) return '0-0-0'
  return `${r.wins}-${r.losses}-${r.ties}`
}

function RoundPairingsPanel({
  roundNum,
  pairings,
  headerActions,
  syncedAtLabel
}: {
  roundNum: number
  pairings: DisplayPairing[]
  headerActions?: ReactNode
  syncedAtLabel?: string | null
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap'
        }}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" fontWeight={700}>
            Ronda {roundNum}
          </Typography>
          {syncedAtLabel ? (
            <Typography variant="caption" color="text.secondary">
              Guardada {syncedAtLabel}
            </Typography>
          ) : null}
        </Stack>
        {headerActions}
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={72}>Mesa</TableCell>
              <TableCell>Jugador 1</TableCell>
              <TableCell>Jugador 2</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pairings.map((p, idx) => (
              <TableRow key={`${roundNum}-${idx}-${p.tableNumber}`}>
                <TableCell>{p.tableNumber || '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2" component="span">
                    {p.player1Name || p.player1PopId || '—'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="primary"
                    sx={{ ml: 0.75, fontWeight: 700 }}
                  >
                    ({formatWltRecord(p.player1Record)})
                  </Typography>
                  {p.player1PopId ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {p.player1PopId}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  {p.isBye || !p.player2PopId ? (
                    <Typography variant="body2" color="text.secondary">
                      Bye
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2" component="span">
                        {p.player2Name || p.player2PopId}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ ml: 0.75, fontWeight: 700 }}
                      >
                        ({formatWltRecord(p.player2Record)})
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {p.player2PopId}
                      </Typography>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export default function TournamentTdfLoader({
  showIntro = true,
  eventId,
  registeredPopIds = [],
  syncedRoundNums = [],
  savedRoundSnapshots = [],
  eventRoundNum = 0
}: TournamentTdfLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState('')
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [fileReadError, setFileReadError] = useState<string | null>(null)

  const parsed = useMemo(() => parseTournamentXml(raw), [raw])
  const names = useMemo(
    () => buildPlayerNameLookup(parsed.players),
    [parsed.players]
  )
  const [excludedTdfRoundNums, setExcludedTdfRoundNums] = useState<Set<number>>(
    () => new Set()
  )

  const activeMatches = useMemo(
    () => filterMatchesExcludingRounds(parsed.matches, excludedTdfRoundNums),
    [parsed.matches, excludedTdfRoundNums]
  )

  const matchRecords = useMemo(
    () => buildMatchRecordsFromMatches(activeMatches),
    [activeMatches]
  )
  const recordsBeforeEachMatch = useMemo(
    () => buildRecordsBeforeEachMatch(activeMatches),
    [activeMatches]
  )
  const matchIndexByRef = useMemo(() => {
    const map = new Map<ParsedMatch, number>()
    activeMatches.forEach((m, i) => map.set(m, i))
    return map
  }, [activeMatches])
  const rounds = useMemo(
    () => groupMatchesByRound(activeMatches),
    [activeMatches]
  )

  /** Última ronda activa (TDF no excluida + guardada en el evento). */
  const currentLastRoundNum = useMemo(() => {
    let max = 0
    for (const n of rounds.keys()) max = Math.max(max, n)
    for (const s of savedRoundSnapshots) {
      const n = Math.round(Number(s.roundNum))
      if (Number.isFinite(n) && !excludedTdfRoundNums.has(n)) {
        max = Math.max(max, n)
      }
    }
    return max
  }, [rounds, savedRoundSnapshots, excludedTdfRoundNums])
  const standingsPlayerCount = useMemo(
    () => parsed.standings.reduce((n, pod) => n + pod.players.length, 0),
    [parsed.standings]
  )

  const tdfHasStandingsData = useMemo(
    () => tdfStandingsHasPlayers(parsed.standings),
    [parsed.standings]
  )

  const inferredStandingsSeed = useMemo(() => {
    if (tdfHasStandingsData || parsed.players.length === 0) return null
    return buildInferredStandingsByCategory(
      parsed.players,
      matchRecords,
      activeMatches
    )
  }, [tdfHasStandingsData, parsed.players, matchRecords, activeMatches])

  /** Overrides manuales; `null` = usar {@link inferredStandingsSeed} del TDF parseado. */
  const [editedInferredStandings, setEditedInferredStandings] = useState<
    TournamentStandingsCategoryPayload[] | null
  >(null)

  const effectiveInferredStandings =
    editedInferredStandings ?? inferredStandingsSeed

  const showAdjustedStandingsEditor = Boolean(
    effectiveInferredStandings &&
    (!tdfHasStandingsData || editedInferredStandings != null)
  )

  const droppedPopIds = useMemo(
    () => droppedPopIdsFromPlayers(parsed.players),
    [parsed.players]
  )

  const tiebreakers = useMemo(
    () =>
      buildPlayerTiebreakersFromMatches(
        activeMatches,
        matchRecords,
        droppedPopIds,
        parsed.players.length,
        parsed.players,
        { sameCategoryOnly: false }
      ),
    [activeMatches, matchRecords, droppedPopIds, parsed.players]
  )

  const standingsOverrideForUpload =
    editedInferredStandings ??
    (!tdfHasStandingsData
      ? (effectiveInferredStandings ?? undefined)
      : undefined)

  const preinscribeBatch = useAdminPreinscribeBatch()
  const syncRound = useAdminSyncEventRound()
  const deleteRound = useAdminDeleteEventRound()
  const uploadFullTournament = useAdminUploadFullTournament()
  const uploadStandingsPod = useAdminUploadStandingsPod()
  const [lastRoundSync, setLastRoundSync] =
    useState<AdminSyncRoundResult | null>(null)
  const registeredSet = useMemo(
    () =>
      new Set(registeredPopIds.map(id => popidForStorage(id)).filter(Boolean)),
    [registeredPopIds]
  )

  const syncedRoundSet = useMemo(
    () =>
      new Set(
        syncedRoundNums
          .map(n => Math.round(Number(n)))
          .filter(n => Number.isFinite(n))
      ),
    [syncedRoundNums]
  )

  const savedRoundsSorted = useMemo(
    () =>
      [...savedRoundSnapshots].sort(
        (a, b) => Math.round(a.roundNum) - Math.round(b.roundNum)
      ),
    [savedRoundSnapshots]
  )

  const pendingTdfRounds = useMemo(() => {
    return [...rounds.entries()].filter(
      ([roundNum]) =>
        !syncedRoundSet.has(roundNum) && !excludedTdfRoundNums.has(roundNum)
    )
  }, [rounds, syncedRoundSet, excludedTdfRoundNums])

  const showEventActions = Boolean(eventId)

  const batchPlayers = useMemo(() => {
    const seen = new Set<string>()
    const out: { displayName: string; popId: string }[] = []
    for (const p of parsed.players) {
      const popNorm = popidForStorage(p.popId)
      if (!popNorm) continue
      if (validatePopidOptional(popNorm)) continue
      if (seen.has(popNorm)) continue
      seen.add(popNorm)
      if (registeredSet.has(popNorm)) continue
      const displayName =
        [p.firstName, p.lastName].filter(Boolean).join(' ').trim() ||
        `Jugador ${popNorm}`
      out.push({ displayName, popId: p.popId })
    }
    return out
  }, [parsed.players, registeredSet])

  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileReadError(null)
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setRaw(text)
      setLastRoundSync(null)
      syncRound.reset()
      setExcludedTdfRoundNums(new Set())
      setEditedInferredStandings(null)
      setLoadedFileName(file.name)
      e.target.value = ''
    }
    reader.onerror = () => {
      setFileReadError('No se pudo leer el archivo.')
      setLoadedFileName(null)
      e.target.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <Stack spacing={2}>
      {showIntro ? (
        <Typography variant="body2" color="text.secondary">
          Las rondas ya guardadas en el evento aparecen abajo. Sube un{' '}
          <strong>.tdf</strong> para añadir jugadores, publicar rondas o cerrar
          con clasificación.
        </Typography>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".tdf,.xml,application/xml,text/xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2.5,
          borderStyle: loadedFileName ? 'solid' : 'dashed'
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Archivo del torneo
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Exportación .tdf desde TOM
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<FolderOpen />}
            onClick={handlePickFile}
            sx={{ alignSelf: { sm: 'flex-start' }, fontWeight: 700 }}
          >
            Elegir .tdf
          </Button>
        </Stack>
        {loadedFileName ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.25, fontVariantNumeric: 'tabular-nums' }}
          >
            Cargado: <strong>{loadedFileName}</strong>
          </Typography>
        ) : null}
      </Paper>

      {fileReadError ? <Alert severity="error">{fileReadError}</Alert> : null}

      {raw.trim() && parsed.error && (
        <Alert severity="error">{parsed.error}</Alert>
      )}

      {parsed.meta && (parsed.meta.name || parsed.meta.startDate) ? (
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px !important',
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" fontWeight={700}>
              Datos del archivo (opcional)
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={0.5}>
              {parsed.meta.name ? (
                <Typography variant="body2">
                  <strong>Nombre:</strong> {parsed.meta.name}
                </Typography>
              ) : null}
              {parsed.meta.startDate ? (
                <Typography variant="body2">
                  <strong>Fecha inicio:</strong> {parsed.meta.startDate}
                </Typography>
              ) : null}
              {parsed.meta.city || parsed.meta.country ? (
                <Typography variant="body2">
                  <strong>Lugar:</strong>{' '}
                  {[parsed.meta.city, parsed.meta.state, parsed.meta.country]
                    .filter(Boolean)
                    .join(', ')}
                </Typography>
              ) : null}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ) : null}

      {parsed.players.length > 0 && (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Jugadores en el archivo ({parsed.players.length})
            </Typography>
            {showEventActions ? (
              <Button
                variant="outlined"
                size="medium"
                startIcon={<GroupAdd />}
                disabled={
                  !eventId ||
                  batchPlayers.length === 0 ||
                  preinscribeBatch.isPending
                }
                onClick={async () => {
                  if (!eventId || batchPlayers.length === 0) return
                  try {
                    await preinscribeBatch.mutateAsync({
                      eventId,
                      players: batchPlayers
                    })
                  } catch {
                    /* error en estado */
                  }
                }}
                sx={{
                  fontWeight: 700,
                  alignSelf: { xs: 'stretch', sm: 'flex-start' }
                }}
              >
                Añadir al evento
                {batchPlayers.length > 0 ? ` (${batchPlayers.length})` : ''}
              </Button>
            ) : null}
          </Stack>
          {showEventActions && preinscribeBatch.isError ? (
            <Alert severity="error">
              {preinscribeBatch.error instanceof Error
                ? preinscribeBatch.error.message
                : 'Error al preinscribir'}
            </Alert>
          ) : null}
          {showEventActions &&
          preinscribeBatch.isSuccess &&
          preinscribeBatch.data ? (
            <Alert severity="success" onClose={() => preinscribeBatch.reset()}>
              Añadidos al listado:{' '}
              <strong>{preinscribeBatch.data.added}</strong>.
              {preinscribeBatch.data.skippedAlreadyRegistered > 0
                ? ` Omitidos (ya en el evento o usuario duplicado): ${preinscribeBatch.data.skippedAlreadyRegistered}.`
                : ''}
              {preinscribeBatch.data.skippedDuplicateInFile > 0
                ? ` Duplicados en el archivo: ${preinscribeBatch.data.skippedDuplicateInFile}.`
                : ''}
              {preinscribeBatch.data.skippedInvalidPop > 0
                ? ` POP inválidos: ${preinscribeBatch.data.skippedInvalidPop}.`
                : ''}
              {preinscribeBatch.data.skippedCapacity > 0
                ? ` Sin cupo: ${preinscribeBatch.data.skippedCapacity}.`
                : ''}
            </Alert>
          ) : null}
          <Accordion
            defaultExpanded={parsed.players.length <= 6}
            disableGutters
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px !important',
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body2" fontWeight={700}>
                Ver lista completa de jugadores
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>POP ID</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell align="center">W / L / T</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsed.players.map(p => (
                      <TableRow key={p.popId}>
                        <TableCell
                          sx={{ fontFamily: 'monospace', fontSize: 13 }}
                        >
                          {p.popId}
                        </TableCell>
                        <TableCell>
                          {[p.firstName, p.lastName]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          {formatMatchRecordWlt(matchRecords.get(p.popId))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {!tdfHasStandingsData &&
      showAdjustedStandingsEditor &&
      raw.trim() &&
      !parsed.error &&
      parsed.players.length > 0 &&
      effectiveInferredStandings ? (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Clasificación propuesta (sin standings en el archivo)
          </Typography>
          <InferredTdfStandingsEditor
            eventId={eventId}
            standings={effectiveInferredStandings}
            onStandingsChange={setEditedInferredStandings}
            names={names}
            matchRecords={matchRecords}
            matches={activeMatches}
            fieldSize={parsed.players.length}
            players={parsed.players}
            sameCategoryTiebreakers={false}
          />
        </>
      ) : null}

      {showEventActions &&
      raw.trim() &&
      !parsed.error &&
      parsed.players.length > 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: theme => alpha(theme.palette.success.main, 0.06),
            borderColor: 'success.main'
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" fontWeight={700}>
              Cerrar torneo de una vez
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Importa jugadores, rondas y clasificación (la tabla ajustada si
              unificaste categorías). Deja el evento <strong>cerrado</strong>.
            </Typography>
            <Button
              type="button"
              variant="contained"
              color="success"
              startIcon={<CloudUpload />}
              disabled={
                !eventId ||
                uploadFullTournament.isPending ||
                syncRound.isPending ||
                preinscribeBatch.isPending
              }
              onClick={async () => {
                if (!eventId) return
                try {
                  const payload = buildFullTournamentUploadPayload(
                    parsed,
                    standingsOverrideForUpload,
                    excludedTdfRoundNums
                  )
                  await uploadFullTournament.mutateAsync({ eventId, payload })
                  setLastRoundSync(null)
                  syncRound.reset()
                } catch {
                  /* error en estado */
                }
              }}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                fontWeight: 700
              }}
            >
              Subir torneo completo
            </Button>
            {uploadFullTournament.isError ? (
              <Alert severity="error">
                {uploadFullTournament.error instanceof Error
                  ? uploadFullTournament.error.message
                  : 'Error al subir el torneo'}
              </Alert>
            ) : null}
            {uploadFullTournament.isSuccess ? (
              <Alert
                severity="success"
                onClose={() => uploadFullTournament.reset()}
              >
                Torneo importado:{' '}
                <strong>{uploadFullTournament.data?.participantCount}</strong>{' '}
                participantes,{' '}
                <strong>
                  {uploadFullTournament.data?.roundSnapshotsCount}
                </strong>{' '}
                ronda(s), estado{' '}
                <strong>{uploadFullTournament.data?.state}</strong>.
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {showEventActions && savedRoundsSorted.length > 0 ? (
        <>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Rondas guardadas ({savedRoundsSorted.length})
            </Typography>
            {eventRoundNum > 0 ? (
              <Chip
                size="small"
                label={`Ronda activa en panel: ${eventRoundNum}`}
                variant="outlined"
              />
            ) : null}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Lo que ven los jugadores en el panel. Solo puedes quitar la{' '}
            <strong>última ronda</strong> (p. ej. si TOM obligó 5 pero la tienda
            jugó 4); al hacerlo se actualizan W/L/T y la clasificación
            propuesta.
          </Typography>
          <Stack spacing={2}>
            {savedRoundsSorted.map(snap => {
              const syncedLabel = snap.syncedAt
                ? new Date(snap.syncedAt).toLocaleString('es-CL', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    hour12: false
                  })
                : null
              return (
                <RoundPairingsPanel
                  key={`saved-${snap.roundNum}`}
                  roundNum={snap.roundNum}
                  pairings={snap.pairings ?? []}
                  syncedAtLabel={syncedLabel}
                  headerActions={
                    <Tooltip
                      title={
                        snap.roundNum === currentLastRoundNum
                          ? 'Quitar esta ronda del evento'
                          : `Solo se puede borrar la última ronda (ronda ${currentLastRoundNum})`
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={
                            !eventId ||
                            deleteRound.isPending ||
                            snap.roundNum !== currentLastRoundNum
                          }
                          onClick={async () => {
                            if (!eventId) return
                            try {
                              await deleteRound.mutateAsync({
                                eventId,
                                roundNum: snap.roundNum
                              })
                              setExcludedTdfRoundNums(prev => {
                                const next = new Set(prev)
                                next.add(snap.roundNum)
                                return next
                              })
                              setEditedInferredStandings(null)
                              setLastRoundSync(null)
                            } catch {
                              /* error en estado */
                            }
                          }}
                          aria-label={`Borrar ronda ${snap.roundNum}`}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                />
              )
            })}
          </Stack>
          {deleteRound.isError ? (
            <Alert severity="error">
              {deleteRound.error instanceof Error
                ? deleteRound.error.message
                : 'Error al borrar la ronda'}
            </Alert>
          ) : null}
        </>
      ) : null}

      {pendingTdfRounds.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Del archivo .tdf ({parsed.matches.length} partidas)
          </Typography>
          <Stack spacing={2}>
            {pendingTdfRounds.map(([roundNum, list]) => {
              const pairings: DisplayPairing[] = list.map(m => {
                const mi = matchIndexByRef.get(m)
                const before =
                  mi !== undefined ? recordsBeforeEachMatch[mi] : undefined
                const p2 = m.player2UserId?.trim() ?? ''
                const isBye = Boolean(m.player1UserId && !p2)
                return {
                  tableNumber: m.tableNumber ?? '',
                  player1PopId: m.player1UserId,
                  player2PopId: p2,
                  player1Name: names.get(m.player1UserId) ?? m.player1UserId,
                  player2Name: isBye ? '' : (names.get(p2) ?? p2),
                  player1Record: {
                    wins: before?.p1.wins ?? 0,
                    losses: before?.p1.losses ?? 0,
                    ties: before?.p1.ties ?? 0
                  },
                  player2Record: {
                    wins: before?.p2.wins ?? 0,
                    losses: before?.p2.losses ?? 0,
                    ties: before?.p2.ties ?? 0
                  },
                  isBye
                }
              })
              return (
                <RoundPairingsPanel
                  key={`tdf-${roundNum}`}
                  roundNum={roundNum}
                  pairings={pairings}
                  headerActions={
                    showEventActions ? (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Tooltip
                          title={
                            roundNum === currentLastRoundNum
                              ? 'Excluir esta ronda del TDF (actualiza récords y clasificación)'
                              : `Solo se puede quitar la última ronda (ronda ${currentLastRoundNum})`
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              startIcon={<DeleteOutline />}
                              disabled={
                                deleteRound.isPending ||
                                roundNum !== currentLastRoundNum
                              }
                              onClick={() => {
                                setExcludedTdfRoundNums(prev => {
                                  const next = new Set(prev)
                                  next.add(roundNum)
                                  return next
                                })
                                setEditedInferredStandings(null)
                              }}
                            >
                              Quitar
                            </Button>
                          </span>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EventSeat />}
                          disabled={
                            !eventId || syncRound.isPending || list.length === 0
                          }
                          onClick={async () => {
                            if (!eventId || list.length === 0) return
                            try {
                              const data = await syncRound.mutateAsync({
                                eventId,
                                roundNum,
                                matches: list.map(m => ({
                                  tableNumber: m.tableNumber ?? '',
                                  player1PopId: m.player1UserId,
                                  player2PopId: m.player2UserId
                                })),
                                participantRecords:
                                  buildParticipantRecordsForSyncRound(
                                    parsed.matches,
                                    parsed.players,
                                    roundNum
                                  ),
                                roundSnapshot: { pairings }
                              })
                              setLastRoundSync(data)
                              setExcludedTdfRoundNums(prev => {
                                const next = new Set(prev)
                                next.delete(roundNum)
                                return next
                              })
                            } catch {
                              setLastRoundSync(null)
                            }
                          }}
                        >
                          Setear ronda
                        </Button>
                      </Stack>
                    ) : null
                  }
                />
              )
            })}
          </Stack>
          {showEventActions && syncRound.isError ? (
            <Alert severity="error">
              {syncRound.error instanceof Error
                ? syncRound.error.message
                : 'Error al setear la ronda'}
            </Alert>
          ) : null}
          {showEventActions && lastRoundSync ? (
            <Alert
              severity={
                lastRoundSync.skipped.length > 0 ? 'warning' : 'success'
              }
              onClose={() => setLastRoundSync(null)}
            >
              Ronda <strong>{lastRoundSync.roundNum}</strong> guardada en el
              evento. Mesas aplicadas:{' '}
              <strong>{lastRoundSync.appliedMatches}</strong>. Récords W/L/T en
              listado: <strong>{lastRoundSync.recordsApplied}</strong>.{' '}
              Historial de rondas guardado:{' '}
              <strong>{lastRoundSync.roundSnapshotsCount}</strong> entrada(s).
              {lastRoundSync.skipped.length > 0 ? (
                <>
                  {' '}
                  Omitidas: {lastRoundSync.skipped.length} (
                  {lastRoundSync.skipped
                    .slice(0, 5)
                    .map(s => `mesa ${s.tableNumber}: ${s.reason}`)
                    .join('; ')}
                  {lastRoundSync.skipped.length > 5 ? '…' : ''}).
                </>
              ) : null}
            </Alert>
          ) : null}
        </>
      )}

      {tdfHasStandingsData && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Clasificación
            {standingsPlayerCount > 0
              ? ` (${standingsPlayerCount} en standings)`
              : ''}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 720 }}
          >
            Categorías en el TDF: <strong>0</strong> = Júnior,{' '}
            <strong>1</strong> = Sénior, <strong>2</strong> = Máster.{' '}
            <strong>DNF</strong> (did not finish) = no terminó el torneo. Los
            porcentajes <strong>OWP</strong> / <strong>OOWP</strong> siguen TOM
            (partidas con rival; suelo 25 %).
          </Typography>
          {parsed.players.length > 0 && activeMatches.length > 0 ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() =>
                  setEditedInferredStandings(
                    buildInferredStandingsByCategory(
                      parsed.players,
                      matchRecords,
                      activeMatches
                    )
                  )
                }
              >
                Recalcular puestos con desempates
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="small"
                startIcon={<MergeType />}
                onClick={() =>
                  setEditedInferredStandings(
                    buildUnifiedInferredStandings(
                      parsed.players,
                      matchRecords,
                      activeMatches
                    )
                  )
                }
              >
                Unificar categorías
              </Button>
            </Stack>
          ) : null}
          {editedInferredStandings != null ? (
            <Typography variant="caption" color="primary" fontWeight={600}>
              Hay una clasificación ajustada abajo; «Subir torneo completo» la
              usará en lugar de los puestos del XML. «Guardar Sénior» vacía
              Júnior y Máster en el evento si la tabla está unificada.
            </Typography>
          ) : null}
          <Stack spacing={2}>
            {parsed.standings.map((pod, podIdx) => (
              <Paper
                key={`standings-pod-${podIdx}-${pod.category}-${pod.type}`}
                variant="outlined"
                sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap'
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {standingsCategoryTitle(pod.category)}
                    </Typography>
                    <Chip
                      size="small"
                      label={standingsPodTypeLabel(pod.type)}
                      variant="outlined"
                    />
                  </Stack>
                  {showEventActions ? (
                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      disabled={
                        !eventId ||
                        uploadStandingsPod.isPending ||
                        standingsCategoryIndex(pod.category) === null
                      }
                      onClick={async () => {
                        if (!eventId) return
                        const ci = standingsCategoryIndex(pod.category)
                        if (ci === null) return
                        const t = pod.type.toLowerCase()
                        const podType = t === 'dnf' ? 'dnf' : 'finished'
                        const rows =
                          podType === 'finished'
                            ? pod.players.map(row => ({
                                popId: row.popId,
                                place: row.place
                              }))
                            : pod.players.map(row => ({ popId: row.popId }))
                        try {
                          await uploadStandingsPod.mutateAsync({
                            eventId,
                            categoryIndex: ci,
                            podType,
                            rows
                          })
                        } catch {
                          /* error en estado */
                        }
                      }}
                    >
                      Guardar esta tabla
                    </Button>
                  ) : null}
                </Box>
                {pod.players.length === 0 ? (
                  <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sin jugadores en este grupo.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={88}>Puesto</TableCell>
                          <TableCell width={120}>POP ID</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell align="center">W / L / T</TableCell>
                          <TableCell align="right" width={88}>
                            OWP
                          </TableCell>
                          <TableCell align="right" width={88}>
                            OOWP
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pod.players.map(row => (
                          <TableRow key={`${podIdx}-${row.place}-${row.popId}`}>
                            <TableCell>{row.place || '—'}</TableCell>
                            <TableCell
                              sx={{ fontFamily: 'monospace', fontSize: 13 }}
                            >
                              {row.popId}
                            </TableCell>
                            <TableCell>{names.get(row.popId) ?? '—'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>
                              {formatMatchRecordWlt(
                                matchRecords.get(row.popId)
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 13 }}>
                              {formatTiebreakerPercent(
                                tiebreakers.get(row.popId)?.owp ??
                                  OPPONENT_WIN_PCT_FLOOR
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 13 }}>
                              {formatTiebreakerPercent(
                                tiebreakers.get(row.popId)?.oowp ??
                                  OPPONENT_WIN_PCT_FLOOR
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            ))}
          </Stack>
          {showEventActions && uploadStandingsPod.isError ? (
            <Alert severity="error">
              {uploadStandingsPod.error instanceof Error
                ? uploadStandingsPod.error.message
                : 'Error al guardar la tabla'}
            </Alert>
          ) : null}
          {showEventActions && uploadStandingsPod.isSuccess ? (
            <Alert
              severity="success"
              onClose={() => uploadStandingsPod.reset()}
            >
              Tabla guardada en el evento.
            </Alert>
          ) : null}
        </>
      )}

      {tdfHasStandingsData &&
      editedInferredStandings != null &&
      effectiveInferredStandings ? (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Clasificación ajustada (desempates)
          </Typography>
          <InferredTdfStandingsEditor
            eventId={eventId}
            standings={effectiveInferredStandings}
            onStandingsChange={setEditedInferredStandings}
            names={names}
            matchRecords={matchRecords}
            matches={activeMatches}
            fieldSize={parsed.players.length}
            players={parsed.players}
            sameCategoryTiebreakers={false}
          />
        </>
      ) : null}

      {raw.trim() &&
        !parsed.error &&
        parsed.players.length === 0 &&
        parsed.matches.length === 0 &&
        !tdfHasStandingsData && (
          <Alert severity="info">
            No se encontraron jugadores, partidas ni clasificación en el XML.
            Revisa que incluya <code>&lt;players&gt;</code>,{' '}
            <code>&lt;rounds&gt;</code> o <code>&lt;standings&gt;</code>.
          </Alert>
        )}
    </Stack>
  )
}
