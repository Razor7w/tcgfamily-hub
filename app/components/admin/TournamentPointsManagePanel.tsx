'use client'

import { Fragment, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  History,
  RemoveCircleOutline
} from '@mui/icons-material'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import { popidForStorage } from '@/lib/rut-chile'
import { formatStorePointsClpEquivalent } from '@/lib/store-points-clp'
import { useMeStores } from '@/hooks/useMeStores'
import TournamentPointsCsvImport from '@/components/admin/TournamentPointsCsvImport'
import {
  useDeductTournamentPointsPlayer,
  useTournamentPointsAuditLog,
  useTournamentPointsAwards,
  type TournamentPointsAggregatedPlayer,
  type TournamentPointsAuditEntry
} from '@/hooks/useTournamentPoints'

function formatEventDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString('es-CL')
}

function playerRowKey(row: TournamentPointsAggregatedPlayer): string {
  return row.identityKey
}

function collectPopIdsForPlayer(
  row: TournamentPointsAggregatedPlayer
): string[] {
  return [
    ...new Set(
      [row.primaryPopId, ...row.sources.map(s => s.popId)]
        .map(p => popidForStorage(p))
        .filter(Boolean)
    )
  ]
}

function formatSourcesSubtitle(
  sources: TournamentPointsAggregatedPlayer['sources']
): string {
  if (sources.length === 0) return 'Sin saldo actual'
  const positive = sources.filter(s => s.points > 0)
  const visible = positive.length > 0 ? positive : sources
  if (visible.length === 1) {
    const s = visible[0]
    return `${s.eventTitle}${s.awardedAt ? ` · ${formatEventDate(s.awardedAt)}` : ''} · ${s.points} pts`
  }
  return visible.map(s => `${s.eventTitle} (${s.points} pts)`).join(' · ')
}

function auditActionLabel(
  action: TournamentPointsAuditEntry['action']
): string {
  if (action === 'created') return 'Creación'
  if (action === 'deducted') return 'Descuento'
  return 'Actualización'
}

function auditActionColor(
  action: TournamentPointsAuditEntry['action']
): 'success' | 'warning' | 'primary' {
  if (action === 'created') return 'success'
  if (action === 'deducted') return 'warning'
  return 'primary'
}

function AuditEntryRow({ entry }: { entry: TournamentPointsAuditEntry }) {
  const [open, setOpen] = useState(false)
  const hasDetail = entry.changes.length > 0

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={1}
        sx={{
          px: 1.5,
          py: 1,
          cursor: hasDetail ? 'pointer' : 'default'
        }}
        onClick={() => {
          if (hasDetail) setOpen(v => !v)
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <Chip
              size="small"
              label={auditActionLabel(entry.action)}
              color={auditActionColor(entry.action)}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {entry.eventTitle}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {entry.summary}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(entry.createdAt)} · {entry.changedByName}
          </Typography>
        </Box>
        {hasDetail ? (
          open ? (
            <ExpandLess fontSize="small" color="action" />
          ) : (
            <ExpandMore fontSize="small" color="action" />
          )
        ) : null}
      </Stack>
      <Collapse in={open}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Jugador</TableCell>
                <TableCell align="center">Puntos</TableCell>
                <TableCell>Motivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entry.changes.map((c, i) => (
                <TableRow key={`${c.popId}-${i}`}>
                  <TableCell>
                    <Typography variant="body2">{c.displayName}</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {c.pointsBefore != null || c.pointsAfter != null
                      ? `${c.pointsBefore ?? 0} → ${c.pointsAfter ?? 0}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {c.reason?.trim() || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  )
}

export default function TournamentPointsManagePanel() {
  const { data: session } = useSession()
  const { data: meStoresData } = useMeStores()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [deductKey, setDeductKey] = useState<string | null>(null)
  const [auditKey, setAuditKey] = useState<string | null>(null)
  const [subtractAmount, setSubtractAmount] = useState('')
  const [reason, setReason] = useState('')

  const activeStoreSlug = useMemo(() => {
    const activeStoreId = session?.user?.activeStoreId?.trim() ?? ''
    if (!activeStoreId) return null
    const hit = (meStoresData?.stores ?? []).find(
      r => String(r.id) === activeStoreId
    )
    const slug =
      typeof hit?.slug === 'string' ? hit.slug.trim().toLowerCase() : ''
    return slug || null
  }, [session?.user?.activeStoreId, meStoresData?.stores])

  const awardsQuery = useTournamentPointsAwards(true)
  const auditQuery = useTournamentPointsAuditLog(tab === 1)
  const deduct = useDeductTournamentPointsPlayer()

  const players = useMemo(
    () => awardsQuery.data?.players ?? [],
    [awardsQuery.data?.players]
  )

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      p =>
        p.displayName.toLowerCase().includes(q) ||
        p.primaryPopId.toLowerCase().includes(q) ||
        p.sources.some(s => s.eventTitle.toLowerCase().includes(q))
    )
  }, [players, search])

  const auditRow = useMemo(
    () =>
      auditKey
        ? (filteredPlayers.find(p => playerRowKey(p) === auditKey) ?? null)
        : null,
    [auditKey, filteredPlayers]
  )

  const auditPopIds = useMemo(
    () => (auditRow ? collectPopIdsForPlayer(auditRow) : []),
    [auditRow]
  )

  const playerAuditQuery = useTournamentPointsAuditLog(auditKey != null, {
    popIds: auditPopIds,
    userId: auditRow?.userId ?? null,
    playerOnly: true,
    limit: 50
  })

  const pointsSum = filteredPlayers.reduce((s, r) => s + r.pointsTotal, 0)

  const closeDeductForm = () => {
    setDeductKey(null)
    setSubtractAmount('')
    setReason('')
  }

  const closeAuditPanel = () => {
    setAuditKey(null)
  }

  const handleApplyDeduct = async (row: TournamentPointsAggregatedPlayer) => {
    const subtract = normalizeStorePointsAmount(subtractAmount)
    const trimmedReason = reason.trim()
    if (subtract <= 0) return
    if (subtract > row.pointsTotal) return
    if (trimmedReason.length < 3) return

    await deduct.mutateAsync({
      userId: row.userId,
      primaryPopId: row.primaryPopId,
      subtract,
      reason: trimmedReason
    })
    closeDeductForm()
  }

  const deductRow = deductKey
    ? (filteredPlayers.find(p => playerRowKey(p) === deductKey) ?? null)
    : null
  const subtractNum = normalizeStorePointsAmount(subtractAmount)
  const reasonOk = reason.trim().length >= 3
  const canApply =
    deductRow != null &&
    subtractNum > 0 &&
    subtractNum <= deductRow.pointsTotal &&
    reasonOk &&
    !deduct.isPending

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Historial de jugadores que recibieron puntos de torneo (unificados por
        cuenta o POP), incluidos los que ya no tienen saldo. Puedes{' '}
        <strong>descontar</strong> si aún tienen puntos, o ver la{' '}
        <strong>auditoría</strong> de cada uno.
      </Typography>

      <TournamentPointsCsvImport />

      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Asignaciones" />
        <Tab
          label="Auditoría"
          icon={<History fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>

      {tab === 0 ? (
        <Stack spacing={2}>
          {awardsQuery.isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Cargando jugadores…
            </Typography>
          ) : null}

          {awardsQuery.isError ? (
            <Alert severity="error">
              {awardsQuery.error instanceof Error
                ? awardsQuery.error.message
                : 'Error al cargar'}
            </Alert>
          ) : null}

          {!awardsQuery.isLoading && players.length === 0 ? (
            <Alert severity="info">
              Aún no hay jugadores con historial de puntos en esta tienda.
            </Alert>
          ) : null}

          {players.length > 0 ? (
            <>
              <TextField
                size="small"
                label="Buscar jugador"
                placeholder="Nombre, POP o torneo…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                fullWidth
              />

              <Typography variant="body2" color="text.secondary">
                <strong>{filteredPlayers.length}</strong> jugador(es) ·{' '}
                <strong>{pointsSum}</strong> pts (
                {formatStorePointsClpEquivalent(pointsSum, activeStoreSlug)})
              </Typography>

              {filteredPlayers.length === 0 ? (
                <Alert severity="info">
                  Ningún jugador coincide con la búsqueda.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Jugador</TableCell>
                        <TableCell align="right" width={100}>
                          Puntos
                        </TableCell>
                        <TableCell align="right" width={220}>
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPlayers.map(row => {
                        const key = playerRowKey(row)
                        const isDeductOpen = deductKey === key
                        const isAuditOpen = auditKey === key
                        const hasBalance = row.pointsTotal > 0
                        return (
                          <Fragment key={key}>
                            <TableRow
                              sx={
                                !hasBalance
                                  ? { bgcolor: 'action.hover', opacity: 0.92 }
                                  : undefined
                              }
                            >
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {row.displayName}
                                </Typography>
                                {row.primaryPopId ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    POP {row.primaryPopId}
                                  </Typography>
                                ) : null}
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatSourcesSubtitle(row.sources)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>
                                {row.pointsTotal}
                              </TableCell>
                              <TableCell align="right">
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  justifyContent="flex-end"
                                  flexWrap="wrap"
                                  useFlexGap
                                >
                                  <Button
                                    size="small"
                                    variant={
                                      isAuditOpen ? 'contained' : 'outlined'
                                    }
                                    color="inherit"
                                    startIcon={<History fontSize="small" />}
                                    disabled={
                                      deduct.isPending ||
                                      (deductKey != null &&
                                        deductKey !== key &&
                                        !isAuditOpen)
                                    }
                                    onClick={() => {
                                      closeDeductForm()
                                      setAuditKey(isAuditOpen ? null : key)
                                    }}
                                  >
                                    Auditoría
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<RemoveCircleOutline />}
                                    disabled={
                                      !hasBalance ||
                                      deduct.isPending ||
                                      (deductKey != null &&
                                        deductKey !== key) ||
                                      (auditKey != null && auditKey !== key)
                                    }
                                    onClick={() => {
                                      closeAuditPanel()
                                      setDeductKey(key)
                                      setSubtractAmount('1')
                                      setReason('')
                                    }}
                                  >
                                    Descontar
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                            {isAuditOpen ? (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  sx={{ bgcolor: 'action.selected' }}
                                >
                                  <Stack spacing={1.5} sx={{ py: 0.5 }}>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      spacing={1}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 700 }}
                                      >
                                        Auditoría de {row.displayName}
                                      </Typography>
                                      <Button
                                        size="small"
                                        onClick={closeAuditPanel}
                                      >
                                        Cerrar
                                      </Button>
                                    </Stack>
                                    {playerAuditQuery.isLoading ? (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Cargando historial…
                                      </Typography>
                                    ) : null}
                                    {playerAuditQuery.isError ? (
                                      <Alert severity="error">
                                        {playerAuditQuery.error instanceof Error
                                          ? playerAuditQuery.error.message
                                          : 'Error al cargar auditoría'}
                                      </Alert>
                                    ) : null}
                                    {!playerAuditQuery.isLoading &&
                                    !playerAuditQuery.isError &&
                                    (playerAuditQuery.data?.length ?? 0) ===
                                      0 ? (
                                      <Alert severity="info">
                                        Sin registros de auditoría para este
                                        jugador.
                                      </Alert>
                                    ) : null}
                                    <Stack spacing={1}>
                                      {(playerAuditQuery.data ?? []).map(
                                        entry => (
                                          <AuditEntryRow
                                            key={entry.id}
                                            entry={entry}
                                          />
                                        )
                                      )}
                                    </Stack>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ) : null}
                            {isDeductOpen ? (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  sx={{ bgcolor: 'action.hover' }}
                                >
                                  <Stack spacing={1.5} sx={{ py: 0.5 }}>
                                    <Stack
                                      direction={{ xs: 'column', sm: 'row' }}
                                      spacing={1.5}
                                      alignItems={{
                                        xs: 'stretch',
                                        sm: 'flex-end'
                                      }}
                                    >
                                      <TextField
                                        size="small"
                                        label="Puntos a descontar"
                                        type="number"
                                        value={subtractAmount}
                                        onChange={e =>
                                          setSubtractAmount(e.target.value)
                                        }
                                        inputProps={{
                                          min: 0.1,
                                          max: row.pointsTotal,
                                          step: 0.1
                                        }}
                                        helperText={`Máximo ${row.pointsTotal} pts`}
                                        sx={{ width: { xs: '100%', sm: 160 } }}
                                      />
                                      <TextField
                                        size="small"
                                        label="Motivo del descuento"
                                        value={reason}
                                        onChange={e =>
                                          setReason(e.target.value)
                                        }
                                        placeholder="Ej. error al repartir, jugador no asistió…"
                                        fullWidth
                                        required
                                        error={reason.length > 0 && !reasonOk}
                                        helperText={
                                          reason.length > 0 && !reasonOk
                                            ? 'Mínimo 3 caracteres'
                                            : 'Obligatorio para auditoría'
                                        }
                                      />
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                      <Button
                                        variant="contained"
                                        color="warning"
                                        size="small"
                                        disabled={!canApply}
                                        onClick={() =>
                                          void handleApplyDeduct(row)
                                        }
                                      >
                                        {deduct.isPending
                                          ? 'Aplicando…'
                                          : 'Confirmar descuento'}
                                      </Button>
                                      <Button
                                        size="small"
                                        disabled={deduct.isPending}
                                        onClick={closeDeductForm}
                                      >
                                        Cancelar
                                      </Button>
                                    </Stack>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {deduct.isError ? (
                <Alert severity="error">
                  {deduct.error instanceof Error
                    ? deduct.error.message
                    : 'Error al descontar'}
                </Alert>
              ) : null}

              {deduct.isSuccess && deduct.data?.changed ? (
                <Alert severity="success" onClose={() => deduct.reset()}>
                  Descuento aplicado en{' '}
                  <strong>{deduct.data.awardsTouched ?? 0}</strong>{' '}
                  asignación(es). Saldo ajustado en{' '}
                  <strong>{deduct.data.adjustments ?? 0}</strong> jugador(es).
                  {(deduct.data.skippedNoUser ?? 0) > 0
                    ? ` Sin usuario en la app: ${deduct.data.skippedNoUser}.`
                    : ''}
                </Alert>
              ) : null}
            </>
          ) : null}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {auditQuery.isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Cargando historial…
            </Typography>
          ) : null}

          {auditQuery.isError ? (
            <Alert severity="error">
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : 'Error al cargar auditoría'}
            </Alert>
          ) : null}

          {!auditQuery.isLoading &&
          !auditQuery.isError &&
          (auditQuery.data?.length ?? 0) === 0 ? (
            <Alert severity="info">No hay registros de auditoría aún.</Alert>
          ) : null}

          <Stack spacing={1}>
            {(auditQuery.data ?? []).map(entry => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
