'use client'

import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { formatStorePointsClpEquivalent } from '@/lib/store-points-clp'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import { useMeStores } from '@/hooks/useMeStores'
import { useSession } from 'next-auth/react'
import {
  useTournamentPointsCoupons,
  type TournamentPointsCouponAdminItem
} from '@/hooks/useTournamentPoints'

function formatCouponDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatPoints(n: number): string {
  return normalizeStorePointsAmount(n).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })
}

const EMPTY_COUPONS: TournamentPointsCouponAdminItem[] = []

export default function TournamentPointsCouponsPanel() {
  const { data: session } = useSession()
  const { data: meStoresData } = useMeStores()
  const couponsQuery = useTournamentPointsCoupons(true)
  const [filter, setFilter] = useState('')

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

  const coupons = couponsQuery.data ?? EMPTY_COUPONS

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return coupons
    return coupons.filter(c => {
      const hay = [
        c.code,
        c.userName,
        c.popId,
        c.email,
        c.reason,
        formatPoints(c.points),
        formatStorePointsClpEquivalent(c.points, activeStoreSlug)
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [coupons, filter, activeStoreSlug])

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Cupones de canje generados por los jugadores. El saldo ya fue descontado
        al crear el cupón; el canje en tienda debería hacerse dentro de las 24
        horas desde la fecha.
      </Typography>

      {couponsQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {couponsQuery.isError ? (
        <Alert severity="error">
          {couponsQuery.error instanceof Error
            ? couponsQuery.error.message
            : 'Error al cargar canjes'}
        </Alert>
      ) : null}

      {!couponsQuery.isLoading &&
      !couponsQuery.isError &&
      coupons.length === 0 ? (
        <Alert severity="info">
          Aún no hay canjes registrados en esta tienda.
        </Alert>
      ) : null}

      {coupons.length > 0 ? (
        <>
          <TextField
            size="small"
            label="Buscar"
            placeholder="Código, jugador, RUT, razón…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            fullWidth
          />
          <TableContainer
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Jugador</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell align="right">Descuento</TableCell>
                  <TableCell>Razón</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c: TournamentPointsCouponAdminItem) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatCouponDate(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {c.userName}
                      </Typography>
                      {c.popId ? (
                        <Typography variant="caption" color="text.secondary">
                          {c.popId}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '0.02em'
                        }}
                      >
                        {c.code}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {formatStorePointsClpEquivalent(
                          c.points,
                          activeStoreSlug
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPoints(c.points)} pts
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={c.reason}
                      >
                        {c.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.expired ? 'Vencido' : 'Vigente'}
                        color={c.expired ? 'default' : 'success'}
                        variant={c.expired ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        Ningún canje coincide con la búsqueda.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Stack>
  )
}
