'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { SeasonRecentRoundDTO } from '@/lib/player-season-summary-types'

export function formatRelativeWhen(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / 86_400_000
  )
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays > 1 && diffDays < 7) return `Hace ${diffDays} días`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

export function roundOutcomeChip(outcome: 'win' | 'loss' | 'tie' | 'neutral') {
  if (outcome === 'win') {
    return (
      <Chip
        size="small"
        label="Victoria"
        color="success"
        sx={{ fontWeight: 800 }}
      />
    )
  }
  if (outcome === 'loss') {
    return (
      <Chip
        size="small"
        label="Derrota"
        color="error"
        sx={{ fontWeight: 800 }}
      />
    )
  }
  if (outcome === 'tie') {
    return (
      <Chip
        size="small"
        label="Empate"
        variant="outlined"
        sx={{ fontWeight: 800 }}
      />
    )
  }
  return (
    <Chip size="small" label="—" variant="outlined" sx={{ fontWeight: 700 }} />
  )
}

type SeasonRoundsTableProps = {
  rounds: SeasonRecentRoundDTO[]
}

export default function SeasonRoundsTable({ rounds }: SeasonRoundsTableProps) {
  const router = useRouter()

  if (rounds.length === 0) return null

  return (
    <>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Resultado</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Mi mazo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Rival</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Torneo</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Fecha
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rounds.map(row => {
              const eventHref = `/dashboard/torneos-semana/${row.eventId}`
              return (
                <TableRow
                  key={`${row.eventId}-${row.roundNum}`}
                  hover
                  tabIndex={0}
                  role="link"
                  onClick={() => router.push(eventHref)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(eventHref)
                    }
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:last-child td': { borderBottom: 0 }
                  }}
                >
                  <TableCell>{roundOutcomeChip(row.outcome)}</TableCell>
                  <TableCell sx={{ maxWidth: 160 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {row.myDeckLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      R{row.roundNum} · {row.gamesSummary}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 160 }}>
                    <Typography variant="body2" noWrap>
                      {row.opponentDeckLabel}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 140 }}>
                    <Typography variant="body2" noWrap>
                      {row.eventTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.tournamentOrigin === 'custom' ? 'Custom' : 'Oficial'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      {formatRelativeWhen(row.playedAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1} sx={{ p: 1.5, display: { xs: 'flex', md: 'none' } }}>
        {rounds.map(row => (
          <Paper
            key={`${row.eventId}-${row.roundNum}-m`}
            component={Link}
            href={`/dashboard/torneos-semana/${row.eventId}`}
            variant="outlined"
            sx={{
              p: 1.5,
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <Stack spacing={0.75}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                {roundOutcomeChip(row.outcome)}
                <Typography variant="caption" color="text.secondary">
                  {formatRelativeWhen(row.playedAt)}
                </Typography>
              </Stack>
              <Typography variant="body2" fontWeight={800}>
                {row.myDeckLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs {row.opponentDeckLabel} · {row.eventTitle}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  )
}
