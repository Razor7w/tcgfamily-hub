'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import BarChartIcon from '@mui/icons-material/BarChart'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha } from '@mui/material/styles'
import { useMyMatchupStats } from '@/hooks/useWeeklyEvents'
import {
  winRatePercent,
  type MyDeckStatsRowDTO
} from '@/lib/pokemon-matchup-stats'

const PREVIEW_ROWS = 6

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function deckLabel(row: MyDeckStatsRowDTO): string {
  if (row.myDeckSlugs.length === 0) return 'Sin deck en perfil'
  return row.myDeckSlugs.map(slugToTitle).join(' / ')
}

export default function DashboardStatisticsCard() {
  const { data, isPending, isError, error, refetch, isFetching } =
    useMyMatchupStats('all', null)

  const previewRows = useMemo(() => {
    const list = data?.myDecks ?? []
    return list.slice(0, PREVIEW_ROWS)
  }, [data?.myDecks])

  const rowCount = data?.myDecks?.length ?? 0
  const hiddenCount = Math.max(0, rowCount - PREVIEW_ROWS)
  const hasRows = rowCount > 0

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        borderColor: t => alpha(t.palette.text.primary, 0.1)
      }}
    >
      <Box
        sx={t => ({
          px: 2,
          py: 2,
          background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.paper} 42%, ${t.palette.background.paper} 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider'
        })}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'primary.main',
              bgcolor: t => alpha(t.palette.primary.main, 0.12),
              border: '1px solid',
              borderColor: t => alpha(t.palette.primary.main, 0.22)
            }}
            aria-hidden
          >
            <BarChartIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" component="h2" fontWeight={700}>
              Estadísticas por mazo
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, lineHeight: 1.5 }}
            >
              Por cada mazo de tu perfil: mesas jugadas y win rate.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <CardContent sx={{ pt: 2.5, pb: 2, px: 2 }}>
        {isPending ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={32} />
          </Stack>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                Reintentar
              </Button>
            }
          >
            {error instanceof Error ? error.message : 'No se pudo cargar'}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {hasRows ? (
              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: t =>
                    alpha(
                      t.palette.primary.main,
                      t.palette.mode === 'dark' ? 0.06 : 0.03
                    )
                }}
              >
                <Table size="small" sx={{ minWidth: 280 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Mazo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Veces jugado
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Win rate
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRows.map(row => {
                      const wr = winRatePercent(row.wins, row.losses, row.ties)
                      return (
                        <TableRow key={row.myDeckKey} hover>
                          <TableCell
                            sx={{
                              maxWidth: { xs: 160, sm: 280 },
                              fontWeight: 600
                            }}
                          >
                            <Typography
                              variant="body2"
                              noWrap
                              title={deckLabel(row)}
                            >
                              {deckLabel(row)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.roundsPlayed}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {wr != null ? `${Math.round(wr)}%` : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aún no hay mesas con deck en perfil. Elige Pokémon en «Mis
                torneos», reporta rondas o añade un torneo custom.
              </Typography>
            )}

            {hiddenCount > 0 ? (
              <Typography variant="caption" color="text.secondary">
                +{hiddenCount} mazo{hiddenCount === 1 ? '' : 's'} más en la
                vista completa.
              </Typography>
            ) : null}

            <Button
              component={Link}
              href="/dashboard/estadisticas"
              variant="contained"
              fullWidth
              endIcon={<ChevronRightIcon />}
              sx={{ textTransform: 'none', fontWeight: 700, py: 1.25 }}
            >
              Ver estadísticas completas
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
