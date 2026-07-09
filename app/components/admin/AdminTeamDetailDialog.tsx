'use client'

import { useState } from 'react'
import Link from 'next/link'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { ADMIN_TEAM_STATUS_LABELS } from '@/lib/teams/approval-workflow-display'
import { TEAM_POST_VISIBILITY_LABELS } from '@/lib/teams/post-constants'
import { useAdminTeamDetail } from '@/hooks/useAdminTeamDetail'

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

type AdminTeamDetailDialogProps = {
  teamId: string | null
  open: boolean
  onClose: () => void
}

export default function AdminTeamDetailDialog({
  teamId,
  open,
  onClose
}: AdminTeamDetailDialogProps) {
  const [tab, setTab] = useState<'info' | 'members' | 'posts'>('info')
  const { data, isPending, isError, error } = useAdminTeamDetail(
    teamId,
    open && Boolean(teamId)
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{ pb: 1 }}>
        {data?.name ?? 'Detalle del equipo'}
      </DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 0 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error instanceof Error ? error.message : 'Error al cargar'}
          </Alert>
        ) : data ? (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Avatar
                src={data.logoUrl || undefined}
                alt={data.name}
                sx={{ width: 56, height: 56, borderRadius: 2 }}
                variant="rounded"
              >
                {data.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {data.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={ADMIN_TEAM_STATUS_LABELS[data.displayStatus]}
                    color={
                      data.displayStatus === 'approved'
                        ? 'success'
                        : data.displayStatus === 'pending'
                          ? 'warning'
                          : 'default'
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {data.publicPath}
                </Typography>
              </Box>
              <Button
                component={Link}
                href={data.publicPath}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Ver página pública
              </Button>
            </Stack>

            <Tabs
              value={tab}
              onChange={(_e, v: 'info' | 'members' | 'posts') => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab value="info" label="Información" />
              <Tab value="members" label={`Miembros (${data.memberCount})`} />
              <Tab value="posts" label={`Publicaciones (${data.postCount})`} />
            </Tabs>

            {tab === 'info' ? (
              <Stack spacing={1.5}>
                {data.bio ? (
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {data.bio}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin descripción.
                  </Typography>
                )}
                <Divider />
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Capitán
                  </Typography>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar src={data.captain.imageUrl || undefined}>
                      {data.captain.displayName.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {data.captain.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.captain.email || '—'}
                        {data.captain.popid
                          ? ` · POP ${data.captain.popid}`
                          : ''}
                        {data.captain.rut ? ` · ${data.captain.rut}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
                <Divider />
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Solicitud enviada:{' '}
                    <Box component="span" sx={{ color: 'text.primary' }}>
                      {formatWhen(data.submittedAt)}
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revisado:{' '}
                    <Box component="span" sx={{ color: 'text.primary' }}>
                      {formatWhen(data.reviewedAt)}
                    </Box>
                  </Typography>
                  {data.rejectionReason ? (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Motivo: {data.rejectionReason}
                    </Alert>
                  ) : null}
                </Stack>
              </Stack>
            ) : null}

            {tab === 'members' ? (
              data.members.length === 0 ? (
                <Alert severity="info">Sin miembros activos.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Miembro</TableCell>
                      <TableCell>Rol</TableCell>
                      <TableCell>Contacto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.members.map(member => (
                      <TableRow key={member.userId}>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Avatar src={member.imageUrl || undefined}>
                              {member.displayName.slice(0, 1).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {member.displayName}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={member.roleLabel} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {member.email || '—'}
                            {member.popid ? ` · POP ${member.popid}` : ''}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : null}

            {tab === 'posts' ? (
              data.posts.length === 0 ? (
                <Alert severity="info">Sin publicaciones.</Alert>
              ) : (
                <Stack spacing={1.25}>
                  {data.posts.map(post => (
                    <Box
                      key={post.id}
                      sx={t => ({
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: alpha(t.palette.text.primary, 0.1),
                        bgcolor: alpha(t.palette.text.primary, 0.02)
                      })}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                        justifyContent="space-between"
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 800 }}
                          >
                            {post.title || '(Sin título)'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {post.author.displayName} ·{' '}
                            {formatWhen(post.createdAt)}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={TEAM_POST_VISIBILITY_LABELS[post.visibility]}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1, lineHeight: 1.5 }}
                      >
                        {post.commentCount} comentarios · {post.likeCount} likes
                        · {post.dislikeCount} dislikes
                        {post.decklist ? ` · mazo: ${post.decklist.name}` : ''}
                      </Typography>
                    </Box>
                  ))}
                  {data.postCount > data.posts.length ? (
                    <Typography variant="caption" color="text.secondary">
                      Mostrando {data.posts.length} de {data.postCount}{' '}
                      publicaciones.
                    </Typography>
                  ) : null}
                </Stack>
              )
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
