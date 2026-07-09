'use client'

import { useState } from 'react'
import GroupsIcon from '@mui/icons-material/Groups'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useSession } from 'next-auth/react'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import AdminTeamDetailDialog from '@/components/admin/AdminTeamDetailDialog'
import {
  useAdminTeams,
  useApproveTeam,
  useRejectTeam,
  type AdminTeamRow
} from '@/hooks/useAdminTeams'
import {
  ADMIN_TEAM_STATUS_LABELS,
  adminTeamDisplayStatus
} from '@/lib/teams/approval-workflow-display'
import type { TeamApprovalStatus } from '@/lib/teams/constants'

function formatWhen(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const TABS: { value: TeamApprovalStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'all', label: 'Todos' }
]

export default function AdminEquiposPage() {
  const { data: session, status } = useSession()
  const isOwner = session?.user?.storeRole === 'owner'
  const [tab, setTab] = useState<TeamApprovalStatus | 'all'>('pending')
  const [rejectTarget, setRejectTarget] = useState<AdminTeamRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null)

  const { data, isPending, isError, error, refetch } = useAdminTeams(
    tab,
    status === 'authenticated' && isOwner
  )
  const approveTeam = useApproveTeam()
  const rejectTeam = useRejectTeam()

  const rows = data?.teams ?? []

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={3}>
        <AdminStorePageHeading showActiveStoreAvatar={false}>
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
              <GroupsIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                Equipos
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.6 }}
              >
                Aprueba o rechaza solicitudes de equipos de jugadores. Solo el
                owner puede gestionar este panel.
              </Typography>
            </Box>
          </Stack>
        </AdminStorePageHeading>

        {status === 'authenticated' && !isOwner ? (
          <Alert severity="warning">
            Solo el owner del club puede gestionar equipos.
          </Alert>
        ) : null}

        {isOwner ? (
          <>
            <Tabs
              value={tab}
              onChange={(_e, v: TeamApprovalStatus | 'all') => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {TABS.map(t => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>

            {isPending ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : isError ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => refetch()}
                  >
                    Reintentar
                  </Button>
                }
              >
                {error instanceof Error ? error.message : 'Error'}
              </Alert>
            ) : rows.length === 0 ? (
              <Alert severity="info">No hay equipos en esta pestaña.</Alert>
            ) : (
              <TableContainer
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: t => alpha(t.palette.text.primary, 0.08)
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipo</TableCell>
                      <TableCell>Solicitante</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Enviada</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{row.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            /equipos/{row.slug}
                          </Typography>
                          {row.bio ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5, maxWidth: 280 }}
                            >
                              {row.bio}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Avatar src={row.captain.imageUrl || undefined}>
                              {row.captain.displayName
                                .slice(0, 1)
                                .toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {row.captain.displayName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {row.captain.popid
                                  ? `POP ${row.captain.popid}`
                                  : row.captain.email || row.captain.rut || '—'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const displayStatus = adminTeamDisplayStatus(row)
                            return (
                              <Chip
                                size="small"
                                label={ADMIN_TEAM_STATUS_LABELS[displayStatus]}
                                color={
                                  displayStatus === 'approved'
                                    ? 'success'
                                    : displayStatus === 'rejected' ||
                                        displayStatus === 'disbanded'
                                      ? 'default'
                                      : 'warning'
                                }
                              />
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatWhen(row.submittedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                            alignItems="center"
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDetailTeamId(row.id)}
                            >
                              Ver
                            </Button>
                            {row.approvalStatus === 'pending' ? (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={approveTeam.isPending}
                                  onClick={() =>
                                    void approveTeam.mutateAsync(row.id)
                                  }
                                >
                                  Aprobar
                                </Button>
                                <Button
                                  size="small"
                                  color="inherit"
                                  disabled={rejectTeam.isPending}
                                  onClick={() => {
                                    setRejectTarget(row)
                                    setRejectReason('')
                                  }}
                                >
                                  Rechazar
                                </Button>
                              </>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {row.reviewedAt
                                  ? `Revisado ${formatWhen(row.reviewedAt)}`
                                  : '—'}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : null}
      </Stack>

      <Dialog
        open={rejectTarget != null}
        onClose={() => setRejectTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {rejectTarget
              ? `¿Rechazar el equipo "${rejectTarget.name}"?`
              : null}
          </Typography>
          <TextField
            label="Motivo (opcional)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!rejectTarget || rejectTeam.isPending}
            onClick={async () => {
              if (!rejectTarget) return
              await rejectTeam.mutateAsync({
                teamId: rejectTarget.id,
                reason: rejectReason
              })
              setRejectTarget(null)
            }}
          >
            Rechazar
          </Button>
        </DialogActions>
      </Dialog>

      <AdminTeamDetailDialog
        teamId={detailTeamId}
        open={detailTeamId != null}
        onClose={() => setDetailTeamId(null)}
      />
    </Container>
  )
}
