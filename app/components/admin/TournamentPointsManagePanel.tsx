'use client'

import { Fragment, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  AddCircleOutline,
  DeleteOutline,
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
import TournamentPointsManualRegister from '@/components/admin/TournamentPointsManualRegister'
import {
  useAddTournamentPointsPlayer,
  useDeductTournamentPointsPlayer,
  useRemoveTournamentPointsPlayerFromList,
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
  const isOwner = session?.user?.storeRole === 'owner'
  const { data: meStoresData } = useMeStores()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [deductKey, setDeductKey] = useState<string | null>(null)
  const [addKey, setAddKey] = useState<string | null>(null)
  const [auditKey, setAuditKey] = useState<string | null>(null)
  const [subtractAmount, setSubtractAmount] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [reason, setReason] = useState('')
  const [removeTarget, setRemoveTarget] =
    useState<TournamentPointsAggregatedPlayer | null>(null)
  const [removeReason, setRemoveReason] = useState('')

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
  const addPoints = useAddTournamentPointsPlayer()
  const removeFromList = useRemoveTournamentPointsPlayerFromList()
  const pointsMutationInFlightRef = useRef(false)

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

  const closeAddForm = () => {
    setAddKey(null)
    setAddAmount('')
    setReason('')
  }

  const closeAuditPanel = () => {
    setAuditKey(null)
  }

  const closeRemoveDialog = () => {
    setRemoveTarget(null)
    setRemoveReason('')
  }

  const handleConfirmRemove = async () => {
    if (!removeTarget || pointsMutationInFlightRef.current) return
    const trimmedReason = removeReason.trim()
    if (trimmedReason.length < 3) return

    pointsMutationInFlightRef.current = true
    try {
      await removeFromList.mutateAsync({
        userId: removeTarget.userId,
        primaryPopId: removeTarget.primaryPopId,
        displayName: removeTarget.displayName,
        reason: trimmedReason
      })
      closeRemoveDialog()
      closeDeductForm()
      closeAddForm()
      closeAuditPanel()
    } finally {
      pointsMutationInFlightRef.current = false
    }
  }

  const handleApplyDeduct = async (row: TournamentPointsAggregatedPlayer) => {
    if (pointsMutationInFlightRef.current) return
    const subtract = normalizeStorePointsAmount(subtractAmount)
    const trimmedReason = reason.trim()
    if (subtract <= 0) return
    if (subtract > row.pointsTotal) return
    if (trimmedReason.length < 3) return

    pointsMutationInFlightRef.current = true
    try {
      await deduct.mutateAsync({
        userId: row.userId,
        primaryPopId: row.primaryPopId,
        subtract,
        reason: trimmedReason
      })
      closeDeductForm()
    } finally {
      pointsMutationInFlightRef.current = false
    }
  }

  const handleApplyAdd = async (row: TournamentPointsAggregatedPlayer) => {
    if (pointsMutationInFlightRef.current) return
    const add = normalizeStorePointsAmount(addAmount)
    const trimmedReason = reason.trim()
    if (add <= 0) return
    if (trimmedReason.length < 3) return

    pointsMutationInFlightRef.current = true
    try {
      await addPoints.mutateAsync({
        userId: row.userId,
        primaryPopId: row.primaryPopId,
        displayName: row.displayName,
        add,
        reason: trimmedReason
      })
      closeAddForm()
    } finally {
      pointsMutationInFlightRef.current = false
    }
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
    !deduct.isPending &&
    !addPoints.isPending &&
    !removeFromList.isPending

  const addRow = addKey
    ? (filteredPlayers.find(p => playerRowKey(p) === addKey) ?? null)
    : null
  const addNum = normalizeStorePointsAmount(addAmount)
  const canApplyAdd =
    addRow != null &&
    addNum > 0 &&
    reasonOk &&
    !addPoints.isPending &&
    !deduct.isPending &&
    !removeFromList.isPending

  const removeReasonOk = removeReason.trim().length >= 3
  const canConfirmRemove =
    removeTarget != null && removeReasonOk && !removeFromList.isPending

  const pointsMutationPending =
    deduct.isPending || addPoints.isPending || removeFromList.isPending

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Historial de jugadores que recibieron puntos de torneo (unificados por
        cuenta o POP), incluidos los que ya no tienen saldo.
        {isOwner ? (
          <>
            {' '}
            Puedes <strong>sumar</strong> o <strong>descontar</strong> puntos,{' '}
            <strong>quitar de la lista</strong> o ver la{' '}
            <strong>auditoría</strong> de cada uno.
          </>
        ) : (
          <>
            {' '}
            Puedes <strong>descontar</strong> puntos o ver la{' '}
            <strong>auditoría</strong> de cada uno.
          </>
        )}
      </Typography>

      {isOwner ? (
        <>
          <TournamentPointsCsvImport />
          <TournamentPointsManualRegister />
        </>
      ) : null}

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
                        <TableCell align="right" width={360}>
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPlayers.map(row => {
                        const key = playerRowKey(row)
                        const isDeductOpen = deductKey === key
                        const isAddOpen = addKey === key
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
                                      pointsMutationPending ||
                                      (deductKey != null &&
                                        deductKey !== key &&
                                        !isAuditOpen) ||
                                      (addKey != null &&
                                        addKey !== key &&
                                        !isAuditOpen)
                                    }
                                    onClick={() => {
                                      closeDeductForm()
                                      closeAddForm()
                                      setAuditKey(isAuditOpen ? null : key)
                                    }}
                                  >
                                    Auditoría
                                  </Button>
                                  {isOwner ? (
                                    <Button
                                      size="small"
                                      variant={
                                        isAddOpen ? 'contained' : 'outlined'
                                      }
                                      color="success"
                                      startIcon={<AddCircleOutline />}
                                      disabled={
                                        pointsMutationPending ||
                                        (deductKey != null &&
                                          deductKey !== key) ||
                                        (addKey != null && addKey !== key) ||
                                        (auditKey != null && auditKey !== key)
                                      }
                                      onClick={() => {
                                        closeAuditPanel()
                                        closeDeductForm()
                                        if (isAddOpen) {
                                          closeAddForm()
                                        } else {
                                          setAddKey(key)
                                          setAddAmount('1')
                                          setReason('')
                                        }
                                      }}
                                    >
                                      Sumar
                                    </Button>
                                  ) : null}
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<RemoveCircleOutline />}
                                    disabled={
                                      !hasBalance ||
                                      pointsMutationPending ||
                                      (deductKey != null &&
                                        deductKey !== key) ||
                                      (addKey != null && addKey !== key) ||
                                      (auditKey != null && auditKey !== key)
                                    }
                                    onClick={() => {
                                      closeAuditPanel()
                                      closeAddForm()
                                      setDeductKey(key)
                                      setSubtractAmount('1')
                                      setReason('')
                                    }}
                                  >
                                    Descontar
                                  </Button>
                                  {isOwner ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      startIcon={<DeleteOutline />}
                                      disabled={
                                        pointsMutationPending ||
                                        (deductKey != null &&
                                          deductKey !== key) ||
                                        (addKey != null && addKey !== key) ||
                                        (auditKey != null &&
                                          auditKey !== key) ||
                                        removeTarget != null
                                      }
                                      onClick={() => {
                                        closeDeductForm()
                                        closeAddForm()
                                        closeAuditPanel()
                                        setRemoveTarget(row)
                                        setRemoveReason('')
                                      }}
                                    >
                                      Quitar
                                    </Button>
                                  ) : null}
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
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      Saldo vigente:{' '}
                                      <strong>{row.pointsTotal} pts</strong>
                                      {row.sources.length > 0
                                        ? ` (${row.sources.map(s => `${s.eventTitle}: ${s.points}`).join(' · ')})`
                                        : ''}
                                      . «Creación» = asignación inicial; si no
                                      coincide con el saldo, busca entradas
                                      «Descuento» más abajo.
                                    </Typography>
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
                            {isOwner && isAddOpen ? (
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
                                        label="Puntos a sumar"
                                        type="number"
                                        value={addAmount}
                                        onChange={e =>
                                          setAddAmount(e.target.value)
                                        }
                                        inputProps={{ min: 0.1, step: 0.1 }}
                                        sx={{ width: { xs: '100%', sm: 160 } }}
                                      />
                                      <TextField
                                        size="small"
                                        label="Motivo del abono"
                                        value={reason}
                                        onChange={e =>
                                          setReason(e.target.value)
                                        }
                                        placeholder="Ej. corrección de puntos, premio extra…"
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
                                        color="success"
                                        size="small"
                                        disabled={!canApplyAdd}
                                        onClick={() => void handleApplyAdd(row)}
                                      >
                                        {addPoints.isPending
                                          ? 'Aplicando…'
                                          : 'Confirmar abono'}
                                      </Button>
                                      <Button
                                        size="small"
                                        disabled={addPoints.isPending}
                                        onClick={closeAddForm}
                                      >
                                        Cancelar
                                      </Button>
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

              {addPoints.isError ? (
                <Alert severity="error">
                  {addPoints.error instanceof Error
                    ? addPoints.error.message
                    : 'Error al sumar puntos'}
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

              {addPoints.isSuccess && addPoints.data?.changed ? (
                <Alert severity="success" onClose={() => addPoints.reset()}>
                  Abono aplicado en{' '}
                  <strong>{addPoints.data.awardsTouched ?? 0}</strong>{' '}
                  asignación(es). Saldo ajustado en{' '}
                  <strong>{addPoints.data.adjustments ?? 0}</strong>{' '}
                  jugador(es).
                  {(addPoints.data.skippedNoUser ?? 0) > 0
                    ? ` Sin usuario en la app: ${addPoints.data.skippedNoUser}.`
                    : ''}
                </Alert>
              ) : null}

              {removeFromList.isError ? (
                <Alert severity="error">
                  {removeFromList.error instanceof Error
                    ? removeFromList.error.message
                    : 'Error al quitar jugador'}
                </Alert>
              ) : null}

              {removeFromList.isSuccess && removeFromList.data?.changed ? (
                <Alert
                  severity="success"
                  onClose={() => removeFromList.reset()}
                >
                  Jugador quitado de la lista. Filas eliminadas:{' '}
                  <strong>{removeFromList.data.rowsRemoved ?? 0}</strong>
                  {(removeFromList.data.pointsRemoved ?? 0) > 0
                    ? ` · ${removeFromList.data.pointsRemoved} pts revertidos en wallet`
                    : ''}
                  .
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

      <Dialog
        open={removeTarget != null}
        onClose={() => {
          if (!removeFromList.isPending) closeRemoveDialog()
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Quitar jugador de la lista</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2">
              Se quitará <strong>{removeTarget?.displayName}</strong> de la
              gestión de puntos en esta tienda.
            </Typography>
            {removeTarget && removeTarget.pointsTotal > 0 ? (
              <Alert severity="warning" variant="outlined">
                Tiene <strong>{removeTarget.pointsTotal} pts</strong> vigentes.
                Se eliminarán sus filas en los torneos/importaciones y se
                revertirá el saldo en la app si está vinculado.
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tiene saldo vigente; dejará de mostrarse aunque quede
                historial en auditoría.
              </Typography>
            )}
            <TextField
              autoFocus
              size="small"
              label="Motivo"
              value={removeReason}
              onChange={e => setRemoveReason(e.target.value)}
              placeholder="Ej. jugador duplicado, datos incorrectos…"
              fullWidth
              required
              error={removeReason.length > 0 && !removeReasonOk}
              helperText={
                removeReason.length > 0 && !removeReasonOk
                  ? 'Mínimo 3 caracteres'
                  : 'Obligatorio para auditoría'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeRemoveDialog}
            disabled={removeFromList.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!canConfirmRemove}
            onClick={() => void handleConfirmRemove()}
          >
            {removeFromList.isPending ? 'Quitando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
