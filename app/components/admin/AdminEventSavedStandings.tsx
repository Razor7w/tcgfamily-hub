'use client'

import { useMemo } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import EmojiEvents from '@mui/icons-material/EmojiEvents'
import {
  categoryLabelFromIndex,
  matchPoints
} from '@/lib/inferred-tdf-standings'
import { popidForStorage } from '@/lib/rut-chile'
import {
  formatTiebreakerPercent,
  OPPONENT_WIN_PCT_FLOOR
} from '@/lib/tournament-tiebreakers'
import { formatMatchRecordWlt, type MatchRecord } from '@/lib/tournament-xml'
import {
  attachTiebreakersToFullPublicStandings,
  buildTournamentStandingsPublic,
  PUBLIC_STANDINGS_FULL_MAX,
  type TournamentStandingLean
} from '@/lib/weekly-event-public'
import type {
  AdminSavedRoundSnapshot,
  AdminWeeklyEvent
} from '@/hooks/useWeeklyEvents'

type Props = {
  standings?: AdminWeeklyEvent['tournamentStandings']
  participants: AdminWeeklyEvent['participants']
  roundSnapshots?: AdminSavedRoundSnapshot[]
  eventState?: AdminWeeklyEvent['state']
}

function hasStandingsData(standings?: Props['standings']): boolean {
  return (standings ?? []).some(
    c => (c.finished?.length ?? 0) > 0 || (c.dnf?.length ?? 0) > 0
  )
}

function nameForPop(
  popId: string,
  participants: AdminWeeklyEvent['participants']
): string {
  const pop = popidForStorage(popId)
  const part = participants.find(
    p => popidForStorage(p.popId === '—' ? '' : p.popId) === pop
  )
  return part?.displayName?.trim() || '—'
}

export default function AdminEventSavedStandings({
  standings,
  participants,
  roundSnapshots,
  eventState
}: Props) {
  const recordByPop = useMemo(() => {
    const map = new Map<string, MatchRecord>()
    for (const p of participants) {
      const pop = popidForStorage(p.popId === '—' ? '' : p.popId)
      if (!pop) continue
      map.set(pop, {
        wins: p.wins,
        losses: p.losses,
        ties: p.ties
      })
    }
    return map
  }, [participants])

  const tiebreakersByPop = useMemo(() => {
    if (!hasStandingsData(standings)) return new Map()
    const { standingsTopByCategory } = buildTournamentStandingsPublic(
      standings as TournamentStandingLean[],
      participants,
      undefined,
      undefined,
      { maxRowsPerCategory: PUBLIC_STANDINGS_FULL_MAX }
    )
    const enriched = attachTiebreakersToFullPublicStandings(
      standingsTopByCategory.filter(c => c.rows.length > 0),
      roundSnapshots,
      participants
    )
    const map = new Map<string, { owp?: number | null; oowp?: number | null }>()
    for (const cat of enriched) {
      for (const row of cat.rows) {
        const pop = row.popId ? popidForStorage(row.popId) : ''
        if (!pop) continue
        map.set(pop, { owp: row.owp, oowp: row.oowp })
      }
    }
    return map
  }, [standings, participants, roundSnapshots])

  const categoriesWithFinished = useMemo(() => {
    return [...(standings ?? [])]
      .filter(c => (c.finished?.length ?? 0) > 0)
      .sort((a, b) => {
        const order = (ci: number) => (ci === 1 ? 0 : ci === 2 ? 1 : 2)
        return order(a.categoryIndex) - order(b.categoryIndex)
      })
  }, [standings])

  const dnfSections = useMemo(() => {
    return (standings ?? [])
      .filter(c => (c.dnf?.length ?? 0) > 0)
      .map(c => ({
        categoryIndex: c.categoryIndex,
        label: categoryLabelFromIndex(c.categoryIndex),
        rows: (c.dnf ?? []).map(d => ({
          popId: d.popId,
          displayName: nameForPop(d.popId, participants)
        }))
      }))
  }, [standings, participants])

  if (!hasStandingsData(standings)) {
    if (eventState === 'close') {
      return (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Divider />
          <Alert severity="info" variant="outlined">
            Torneo cerrado sin clasificación publicada en el evento.
          </Alert>
        </Stack>
      )
    }
    return null
  }

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <Divider />
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <EmojiEvents color="primary" fontSize="small" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Clasificación final
        </Typography>
        {eventState === 'close' ? (
          <Chip
            size="small"
            label="Publicada"
            color="success"
            variant="outlined"
          />
        ) : (
          <Chip size="small" label="Guardada en el evento" variant="outlined" />
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Standing persistido en el evento (TDF, guardado manual o torneo online
        cerrado). Los jugadores lo ven cuando el torneo está cerrado.
      </Typography>

      {categoriesWithFinished.map(cat => {
        const label = categoryLabelFromIndex(cat.categoryIndex)
        const sorted = [...cat.finished].sort((a, b) => a.place - b.place)
        return (
          <Paper
            key={`saved-standing-cat-${cat.categoryIndex}`}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <Box
              sx={{
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {label} ({sorted.length})
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={72}>Puesto</TableCell>
                    <TableCell width={120}>POP ID</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">W / L / T</TableCell>
                    <TableCell align="center" width={56}>
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
                  {sorted.map(row => {
                    const pop = popidForStorage(row.popId)
                    const rec = recordByPop.get(pop)
                    const tb = tiebreakersByPop.get(pop)
                    return (
                      <TableRow
                        key={`${cat.categoryIndex}-${row.place}-${pop}`}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>
                          {row.place}º
                        </TableCell>
                        <TableCell
                          sx={{ fontFamily: 'monospace', fontSize: 13 }}
                        >
                          {pop || row.popId}
                        </TableCell>
                        <TableCell>
                          {nameForPop(row.popId, participants)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                          {formatMatchRecordWlt(rec)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                          {rec ? matchPoints(rec) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13 }}>
                          {formatTiebreakerPercent(
                            tb?.owp ?? OPPONENT_WIN_PCT_FLOOR
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13 }}>
                          {formatTiebreakerPercent(
                            tb?.oowp ?? OPPONENT_WIN_PCT_FLOOR
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )
      })}

      {dnfSections.map(section => (
        <Paper
          key={`dnf-cat-${section.categoryIndex}`}
          variant="outlined"
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {section.label} — DNF
            </Typography>
            <Chip size="small" label="No terminó" variant="outlined" />
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
            {section.rows.map(row => (
              <Chip
                key={row.popId}
                size="small"
                label={`${row.displayName} (${row.popId})`}
                variant="outlined"
              />
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
