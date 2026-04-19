'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BarChartIcon from '@mui/icons-material/BarChart'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import ReportCustomTournamentDialog from '@/components/events/ReportCustomTournamentDialog'
import {
  useMyMatchupStats,
  type TournamentOriginFilter
} from '@/hooks/useWeeklyEvents'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'
import {
  winRatePercent,
  type MyDeckStatsRowDTO,
  type OpponentMatchupRowDTO
} from '@/lib/pokemon-matchup-stats'

const SPRITE_BOX = limitlessSpriteDimensions(32)

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function myDeckLabel(row: MyDeckStatsRowDTO): string {
  if (row.myDeckSlugs.length === 0) return 'Sin deck en perfil'
  return row.myDeckSlugs.map(slugToTitle).join(' / ')
}

function opponentLabel(row: OpponentMatchupRowDTO): string {
  if (row.opponentSlugs.length === 0) return 'Sin deck rival'
  return row.opponentSlugs.map(slugToTitle).join(' / ')
}

type SortKey = 'lastPlayed' | 'winRate' | 'rounds'

function EstadisticasTorneosContent() {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const searchParams = useSearchParams()
  const deckParam = searchParams.get('deck')
  const myDeckKey = deckParam ? decodeURIComponent(deckParam) : null

  const [origin, setOrigin] = useState<TournamentOriginFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('lastPlayed')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [weekAnchor] = useState(() => new Date())
  const [customTournamentOpen, setCustomTournamentOpen] = useState(false)

  const { data, isPending, isError, error } = useMyMatchupStats(
    origin,
    myDeckKey
  )

  const isDetail = Boolean(myDeckKey)

  const detailTitle = !myDeckKey
    ? ''
    : data?.myDeckSlugs && data.myDeckSlugs.length > 0
      ? data.myDeckSlugs.map(slugToTitle).join(' / ')
      : myDeckKey === '__empty__'
        ? 'Sin deck en perfil'
        : myDeckKey.split('|').map(slugToTitle).join(' / ')

  const sortedMyDecks = useMemo(() => {
    const rows = data?.myDecks ?? []
    const copy = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      if (sortKey === 'lastPlayed') {
        return (
          dir *
          (new Date(a.lastPlayedAt).getTime() -
            new Date(b.lastPlayedAt).getTime())
        )
      }
      if (sortKey === 'rounds') {
        return dir * (a.roundsPlayed - b.roundsPlayed)
      }
      const pa = winRatePercent(a.wins, a.losses, a.ties)
      const pb = winRatePercent(b.wins, b.losses, b.ties)
      return dir * ((pa ?? -1) - (pb ?? -1))
    })
    return copy
  }, [data?.myDecks, sortKey, sortDir])

  const sortedOpponents = useMemo(() => {
    const rows = data?.opponents ?? []
    const copy = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      if (sortKey === 'lastPlayed') {
        return (
          dir *
          (new Date(a.lastPlayedAt).getTime() -
            new Date(b.lastPlayedAt).getTime())
        )
      }
      if (sortKey === 'rounds') {
        return dir * (a.roundsPlayed - b.roundsPlayed)
      }
      const pa = winRatePercent(a.wins, a.losses, a.ties)
      const pb = winRatePercent(b.wins, b.losses, b.ties)
      return dir * ((pa ?? -1) - (pb ?? -1))
    })
    return copy
  }, [data?.opponents, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'lastPlayed' ? 'desc' : 'desc')
    }
  }

  const goDeckDetail = (key: string) => {
    router.push(`/dashboard/estadisticas?deck=${encodeURIComponent(key)}`)
  }

  const goList = () => {
    router.push('/dashboard/estadisticas')
  }

  const rowsForTable = isDetail ? sortedOpponents : sortedMyDecks
  const empty = !isPending && !isError && rowsForTable.length === 0

  return (
    <DashboardModuleRouteGate moduleId="statistics">
      <Box
        sx={t => ({
          minHeight: '100dvh',
          py: { xs: 2, sm: 4 },
          background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`
        })}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            {isDetail ? (
              <Button
                onClick={goList}
                startIcon={<ArrowBackIcon />}
                size="medium"
                sx={t => ({
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: 44,
                  '&:hover': {
                    bgcolor: alpha(t.palette.primary.main, 0.08),
                    color: 'primary.main'
                  }
                })}
              >
                Todos los mazos
              </Button>
            ) : (
              <Button
                component={Link}
                href="/dashboard/torneos-semana"
                startIcon={<ArrowBackIcon />}
                size="medium"
                sx={t => ({
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: 44,
                  '&:hover': {
                    bgcolor: alpha(t.palette.primary.main, 0.08),
                    color: 'primary.main'
                  }
                })}
              >
                Volver a mis torneos
              </Button>
            )}
          </Stack>

          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <BarChartIcon
                sx={{
                  fontSize: 36,
                  color: 'primary.main',
                  opacity: 0.9,
                  mt: 0.25
                }}
              />
              <Box>
                <Typography variant="h4" component="h1" fontWeight={800}>
                  {isDetail
                    ? `Rivales · ${detailTitle}`
                    : 'Estadísticas por mazo'}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, maxWidth: 720 }}
                >
                  {isDetail
                    ? 'Mesas agrupadas por el deck rival que reportaste, solo con el mazo elegido en el perfil del torneo (sprites de «Perfil de jugador»).'
                    : 'Usamos los Pokémon de tu perfil por torneo (hasta dos) para agrupar mesas y calcular tu récord y win rate. Entra al detalle para ver rivales (p. ej. Mega Lucario) y el win rate por matchup.'}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={origin}
                onChange={(_e, v) => v != null && setOrigin(v)}
                aria-label="Origen del torneo"
              >
                <ToggleButton value="all">Todos</ToggleButton>
                <ToggleButton value="official">Oficiales</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
              {data && !isDetail ? (
                <Typography variant="caption" color="text.secondary">
                  {data.eventsWithReportedRounds ?? 0} torneo
                  {(data.eventsWithReportedRounds ?? 0) === 1 ? '' : 's'} con
                  rondas
                  {data.eventsScanned > 0
                    ? ` · últimos ${data.eventsScanned} revisados`
                    : ''}
                </Typography>
              ) : data && isDetail ? (
                <Typography variant="caption" color="text.secondary">
                  {data.eventsScanned > 0
                    ? `${data.eventsScanned} torneos revisados`
                    : null}
                </Typography>
              ) : null}
            </Stack>

            {isPending ? (
              <Stack alignItems="center" py={6}>
                <CircularProgress />
              </Stack>
            ) : isError ? (
              <Alert severity="error">
                {error instanceof Error ? error.message : 'No se pudo cargar'}
              </Alert>
            ) : empty ? (
              <Paper
                variant="outlined"
                sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}
              >
                <Stack spacing={2} alignItems="center">
                  <Typography color="text.secondary">
                    {isDetail
                      ? 'No hay mesas con este mazo y rivales reportados para este filtro.'
                      : 'Aún no hay mesas con un deck en perfil. Elige Pokémon en «Mis torneos» y reporta rondas.'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SportsEsportsIcon />}
                    onClick={() => setCustomTournamentOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Añadir torneo
                  </Button>
                </Stack>
              </Paper>
            ) : narrow ? (
              <Stack spacing={1.5}>
                {isDetail
                  ? sortedOpponents.map(row => (
                      <MatchupCard
                        key={row.opponentKey}
                        row={row}
                        labelFn={opponentLabel}
                      />
                    ))
                  : sortedMyDecks.map(row => (
                      <MyDeckCard
                        key={row.myDeckKey}
                        row={row}
                        onOpenDetail={() => goDeckDetail(row.myDeckKey)}
                      />
                    ))}
              </Stack>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        {isDetail ? 'Deck rival' : 'Tu mazo (perfil)'}
                      </TableCell>
                      {!isDetail ? (
                        <TableCell align="center">Torneos</TableCell>
                      ) : null}
                      <TableCell
                        align="right"
                        sortDirection={
                          sortKey === 'lastPlayed' ? sortDir : false
                        }
                      >
                        <TableSortLabel
                          active={sortKey === 'lastPlayed'}
                          direction={sortKey === 'lastPlayed' ? sortDir : 'asc'}
                          onClick={() => handleSort('lastPlayed')}
                        >
                          Última vez
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">Récord (W‑L‑T)</TableCell>
                      <TableCell
                        align="right"
                        sortDirection={sortKey === 'rounds' ? sortDir : false}
                      >
                        <TableSortLabel
                          active={sortKey === 'rounds'}
                          direction={sortKey === 'rounds' ? sortDir : 'asc'}
                          onClick={() => handleSort('rounds')}
                        >
                          Mesas
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="right"
                        sortDirection={sortKey === 'winRate' ? sortDir : false}
                      >
                        <TableSortLabel
                          active={sortKey === 'winRate'}
                          direction={sortKey === 'winRate' ? sortDir : 'asc'}
                          onClick={() => handleSort('winRate')}
                        >
                          % victorias
                        </TableSortLabel>
                      </TableCell>
                      {!isDetail ? (
                        <TableCell align="right" width={56} />
                      ) : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isDetail
                      ? sortedOpponents.map(row => (
                          <TableRow key={row.opponentKey} hover>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                              >
                                <DeckSprites slugs={row.opponentSlugs} />
                                <Typography variant="body2" fontWeight={600}>
                                  {opponentLabel(row)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ whiteSpace: 'nowrap' }}
                            >
                              {formatDateEs(row.lastPlayedAt)}
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {row.wins}-{row.losses}-{row.ties}
                              </Typography>
                              {row.neutral > 0 ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  +{row.neutral} sin cerrar
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell align="right">
                              {row.roundsPlayed}
                            </TableCell>
                            <TableCell align="right">
                              {formatWinRate(row.wins, row.losses, row.ties)}
                            </TableCell>
                          </TableRow>
                        ))
                      : sortedMyDecks.map(row => (
                          <TableRow
                            key={row.myDeckKey}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => goDeckDetail(row.myDeckKey)}
                          >
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                              >
                                <DeckSprites slugs={row.myDeckSlugs} />
                                <Typography variant="body2" fontWeight={600}>
                                  {myDeckLabel(row)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="center">
                              {row.tournamentsWithDeck}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ whiteSpace: 'nowrap' }}
                            >
                              {formatDateEs(row.lastPlayedAt)}
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {row.wins}-{row.losses}-{row.ties}
                              </Typography>
                              {row.neutral > 0 ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  +{row.neutral} sin cerrar
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell align="right">
                              {row.roundsPlayed}
                            </TableCell>
                            <TableCell align="right">
                              {formatWinRate(row.wins, row.losses, row.ties)}
                            </TableCell>
                            <TableCell
                              align="right"
                              onClick={e => e.stopPropagation()}
                            >
                              <Tooltip title="Ver rivales">
                                <IconButton
                                  size="small"
                                  aria-label="Ver rivales"
                                  onClick={() => goDeckDetail(row.myDeckKey)}
                                >
                                  <ChevronRightIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Container>

        <ReportCustomTournamentDialog
          open={customTournamentOpen}
          onClose={() => setCustomTournamentOpen(false)}
          weekAnchor={weekAnchor}
          onCreated={eventId => {
            setCustomTournamentOpen(false)
            router.push(`/dashboard/torneos-semana/${eventId}`)
          }}
        />
      </Box>
    </DashboardModuleRouteGate>
  )
}

export default function EstadisticasTorneosPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '40dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <EstadisticasTorneosContent />
    </Suspense>
  )
}

function formatDateEs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatWinRate(wins: number, losses: number, ties: number): string {
  const p = winRatePercent(wins, losses, ties)
  if (p == null) return '—'
  return `${p.toFixed(p >= 100 || p === 0 ? 0 : 2)}%`
}

function DeckSprites({ slugs }: { slugs: string[] }) {
  const shown = slugs.slice(0, 2)
  if (shown.length === 0) {
    return (
      <Chip size="small" label="—" variant="outlined" sx={{ minWidth: 40 }} />
    )
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {shown.map(slug => (
        <Box
          key={slug}
          component="img"
          className="pokemon"
          src={getLimitlessPokemonSpriteUrl(slug)}
          alt=""
          sx={{
            width: SPRITE_BOX.width,
            height: SPRITE_BOX.height,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            borderRadius: 0.75,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        />
      ))}
    </Stack>
  )
}

function MyDeckCard({
  row,
  onOpenDetail
}: {
  row: MyDeckStatsRowDTO
  onOpenDetail: () => void
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <DeckSprites slugs={row.myDeckSlugs} />
            <Typography
              variant="subtitle1"
              fontWeight={700}
              noWrap
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {myDeckLabel(row)}
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            onClick={onOpenDetail}
            sx={{ flexShrink: 0, textTransform: 'none' }}
          >
            Rivales
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {row.tournamentsWithDeck} torneo
          {row.tournamentsWithDeck === 1 ? '' : 's'} · Última vez{' '}
          {formatDateEs(row.lastPlayedAt)}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {row.wins}-{row.losses}-{row.ties}
          {row.neutral > 0 ? ` · +${row.neutral} sin cerrar` : ''} ·{' '}
          {formatWinRate(row.wins, row.losses, row.ties)} · {row.roundsPlayed}{' '}
          mesas
        </Typography>
      </Stack>
    </Paper>
  )
}

function MatchupCard({
  row,
  labelFn
}: {
  row: OpponentMatchupRowDTO
  labelFn: (r: OpponentMatchupRowDTO) => string
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <DeckSprites slugs={row.opponentSlugs} />
          <Typography variant="subtitle1" fontWeight={700}>
            {labelFn(row)}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
          spacing={1}
        >
          <Typography variant="body2" color="text.secondary">
            Última vez: {formatDateEs(row.lastPlayedAt)}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {row.wins}-{row.losses}-{row.ties}
            {row.neutral > 0 ? ` · ${row.neutral} sin cerrar` : ''}
          </Typography>
          <Typography variant="body2" color="primary" fontWeight={700}>
            {formatWinRate(row.wins, row.losses, row.ties)} · {row.roundsPlayed}{' '}
            mesas
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  )
}
