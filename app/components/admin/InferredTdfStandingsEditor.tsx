'use client'

import { useMemo } from 'react'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import {
  Alert,
  Box,
  Button,
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
import {
  categoryLabelFromIndex,
  isUnifiedStandingsPayload,
  reorderStandingRows,
  unifyStandingsCategories,
  type InferredStandingRow
} from '@/lib/inferred-tdf-standings'
import {
  buildPlayerTiebreakersFromMatches,
  formatTiebreakerPercent,
  OPPONENT_WIN_PCT_FLOOR
} from '@/lib/tournament-tiebreakers'
import {
  formatMatchRecordWlt,
  type MatchRecord,
  type ParsedMatch,
  type ParsedPlayer
} from '@/lib/tournament-xml'
import type { TournamentStandingsCategoryPayload } from '@/lib/tournament-xml'
import MergeType from '@mui/icons-material/MergeType'
import { useAdminUploadStandingsPod } from '@/hooks/useWeeklyEvents'

type InferredTdfStandingsEditorProps = {
  eventId?: string
  standings: TournamentStandingsCategoryPayload[]
  onStandingsChange: (next: TournamentStandingsCategoryPayload[]) => void
  names: Map<string, string>
  matchRecords: Map<string, MatchRecord>
  matches: ParsedMatch[]
  droppedPopIds?: ReadonlySet<string>
  fieldSize?: number
  players?: ParsedPlayer[]
  /** Rivales solo de la misma categoría Play! (por categoría); false = pod unificado. */
  sameCategoryTiebreakers?: boolean
}

function updateCategoryFinished(
  standings: TournamentStandingsCategoryPayload[],
  categoryIndex: number,
  finished: InferredStandingRow[]
): TournamentStandingsCategoryPayload[] {
  return standings.map(cat =>
    cat.categoryIndex === categoryIndex ? { ...cat, finished } : cat
  )
}

export default function InferredTdfStandingsEditor({
  eventId,
  standings,
  onStandingsChange,
  names,
  matchRecords,
  matches,
  droppedPopIds,
  fieldSize,
  players,
  sameCategoryTiebreakers
}: InferredTdfStandingsEditorProps) {
  const uploadStandingsPod = useAdminUploadStandingsPod()
  const showEventActions = Boolean(eventId)

  const isUnifiedView = useMemo(
    () => isUnifiedStandingsPayload(standings),
    [standings]
  )

  const tiebreakers = useMemo(
    () =>
      buildPlayerTiebreakersFromMatches(
        matches,
        matchRecords,
        droppedPopIds,
        fieldSize,
        players,
        { sameCategoryOnly: sameCategoryTiebreakers ?? !isUnifiedView }
      ),
    [
      matches,
      matchRecords,
      droppedPopIds,
      fieldSize,
      players,
      sameCategoryTiebreakers,
      isUnifiedView
    ]
  )

  const totalFinished = useMemo(
    () => standings.reduce((n, cat) => n + cat.finished.length, 0),
    [standings]
  )

  const categoriesWithPlayers = useMemo(
    () =>
      standings.filter(
        cat => cat.finished.length > 0 || (cat.dnf?.length ?? 0) > 0
      ),
    [standings]
  )

  const handleMove = (
    categoryIndex: number,
    index: number,
    direction: -1 | 1
  ) => {
    const cat = standings.find(c => c.categoryIndex === categoryIndex)
    if (!cat) return
    const nextFinished = reorderStandingRows(cat.finished, index, direction)
    onStandingsChange(
      updateCategoryFinished(standings, categoryIndex, nextFinished)
    )
  }

  const handleSaveCategory = async (categoryIndex: 0 | 1 | 2) => {
    if (!eventId) return
    const cat = standings.find(c => c.categoryIndex === categoryIndex)
    if (!cat || cat.finished.length === 0) return
    await uploadStandingsPod.mutateAsync({
      eventId,
      categoryIndex,
      podType: 'finished',
      rows: cat.finished.map(r => ({ popId: r.popId, place: r.place })),
      clearOtherAgeCategories: isUnifiedView && categoryIndex === 1
    })
  }

  const handleSaveAll = async () => {
    if (!eventId) return
    if (isUnifiedView) {
      const senior = standings.find(c => c.categoryIndex === 1)
      if (!senior || senior.finished.length === 0) return
      await uploadStandingsPod.mutateAsync({
        eventId,
        categoryIndex: 1,
        podType: 'finished',
        rows: senior.finished.map(r => ({ popId: r.popId, place: r.place })),
        clearOtherAgeCategories: true
      })
      return
    }
    for (const cat of standings) {
      if (cat.finished.length === 0) continue
      const ci = cat.categoryIndex
      if (ci !== 0 && ci !== 1 && ci !== 2) continue
      await uploadStandingsPod.mutateAsync({
        eventId,
        categoryIndex: ci,
        podType: 'finished',
        rows: cat.finished.map(r => ({ popId: r.popId, place: r.place }))
      })
    }
  }

  if (categoriesWithPlayers.length === 0) {
    return (
      <Alert severity="info">
        No hay jugadores en el archivo para proponer una clasificación.
      </Alert>
    )
  }

  const handleUnifyCategories = () => {
    onStandingsChange(
      unifyStandingsCategories(standings, matchRecords, matches)
    )
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
        El archivo no incluye <code>&lt;standings&gt;</code>. Orden sugerido por
        puntos de partida, récord W/L/T, <strong>OWP</strong> y{' '}
        <strong>OOWP</strong> (TOM: victorias del récord con bye ÷ rondas suizo;
        suelo 33 %). Por defecto se
        separa por categoría según fecha de nacimiento (2025–26). Usa las flechas
        para corregir el puesto antes de guardar o subir.
      </Typography>

      {totalFinished > 0 ? (
        <Button
          type="button"
          variant="outlined"
          size="small"
          startIcon={<MergeType />}
          onClick={handleUnifyCategories}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          {isUnifiedView
            ? 'Recalcular orden unificado'
            : 'Unificar categorías'}
        </Button>
      ) : null}
      {isUnifiedView ? (
        <Typography variant="caption" color="text.secondary">
          Clasificación unificada en Sénior (todas las edades en una sola tabla).
          Al guardar Sénior se vacían Júnior y Máster en el evento para no dejar
          puestos antiguos del TDF.
        </Typography>
      ) : null}

      {standings.map(cat => {
        if (cat.finished.length === 0) return null
        const ci = cat.categoryIndex
        const label = categoryLabelFromIndex(ci)
        return (
          <Paper
            key={`inferred-cat-${ci}`}
            variant="outlined"
            sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}
          >
            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                flexWrap: 'wrap'
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {label} ({cat.finished.length})
              </Typography>
              {showEventActions ? (
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  disabled={
                    uploadStandingsPod.isPending || cat.finished.length === 0
                  }
                  onClick={() => void handleSaveCategory(ci as 0 | 1 | 2)}
                >
                  Guardar {label}
                </Button>
              ) : null}
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={56} />
                    <TableCell width={72}>Puesto</TableCell>
                    <TableCell width={120}>POP ID</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">W / L / T</TableCell>
                    <TableCell align="center" width={72}>
                      Pts
                    </TableCell>
                    <TableCell align="right" width={88}>
                      OWP
                    </TableCell>
                    <TableCell align="right" width={88}>
                      OOWP
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cat.finished.map((row, index) => (
                    <TableRow key={`${ci}-${row.popId}`}>
                      <TableCell padding="checkbox">
                        <Stack direction="row" spacing={0}>
                          <Tooltip title="Subir">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                onClick={() => handleMove(ci, index, -1)}
                                aria-label="Subir jugador"
                              >
                                <ArrowUpward fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Bajar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === cat.finished.length - 1}
                                onClick={() => handleMove(ci, index, 1)}
                                aria-label="Bajar jugador"
                              >
                                <ArrowDownward fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {row.place}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {row.popId}
                      </TableCell>
                      <TableCell>{names.get(row.popId) ?? '—'}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {formatMatchRecordWlt(matchRecords.get(row.popId))}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {tiebreakers.get(row.popId)?.matchPoints ?? 0}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 13 }}>
                        {formatTiebreakerPercent(
                          tiebreakers.get(row.popId)?.owp ?? OPPONENT_WIN_PCT_FLOOR
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
          </Paper>
        )
      })}

      {showEventActions ? (
        <Stack spacing={1}>
          <Button
            type="button"
            variant="contained"
            disabled={uploadStandingsPod.isPending}
            onClick={() => void handleSaveAll()}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            Guardar todas las categorías
          </Button>
          {uploadStandingsPod.isError ? (
            <Alert severity="error">
              {uploadStandingsPod.error instanceof Error
                ? uploadStandingsPod.error.message
                : 'Error al guardar la clasificación'}
            </Alert>
          ) : null}
          {uploadStandingsPod.isSuccess ? (
            <Alert
              severity="success"
              onClose={() => uploadStandingsPod.reset()}
            >
              Clasificación guardada en el evento.
              {isUnifiedView
                ? ' Júnior y Máster quedaron sin puestos (tabla unificada).'
                : ''}
            </Alert>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  )
}
