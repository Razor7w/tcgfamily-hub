'use client'

import Link from 'next/link'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useNotifications,
  notificationsQueryKey
} from '@/hooks/useNotifications'
import {
  useAcceptTeamInvitation,
  useDeclineTeamInvitation
} from '@/hooks/useTeams'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function NotificationsClient() {
  const { data, isPending, isError, error, refetch } = useNotifications()
  const acceptInvite = useAcceptTeamInvitation()
  const declineInvite = useDeclineTeamInvitation()
  const qc = useQueryClient()
  const respondJoinRequest = useMutation({
    mutationFn: async (input: {
      teamSlug: string
      joinRequestId: string
      action: 'accept' | 'decline'
    }) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(input.teamSlug)}/join-requests/${encodeURIComponent(input.joinRequestId)}/${input.action}`,
        { method: 'POST' }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : 'Error')
      }
      return j
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsQueryKey })
      void qc.invalidateQueries({ queryKey: ['teams'] })
    }
  })
  const declineFriendly = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(matchId)}/decline`,
        { method: 'POST' }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : 'Error')
      }
      return j
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsQueryKey })
    }
  })

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.12),
              color: 'primary.main'
            }}
          >
            <NotificationsNoneIcon />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
              Notificaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Solicitudes y avisos de tu cuenta
            </Typography>
          </Box>
        </Stack>

        {isPending ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error ? error.message : 'Error'}
          </Alert>
        ) : data && data.items.length > 0 ? (
          <Stack spacing={1.5}>
            {data.items.map(item => {
              if (item.kind === 'team_invitation') {
                return (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 3 }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={item.teamLogoUrl || undefined}>
                          {item.teamName.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700}>
                            Invitación a {item.teamName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.invitedByName} te invitó a unirte al equipo
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(item.createdAt)} · expira{' '}
                            {formatDate(item.expiresAt)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Divider />
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          variant="contained"
                          size="small"
                          disabled={acceptInvite.isPending}
                          onClick={() =>
                            void acceptInvite.mutateAsync({
                              invitationId: item.invitationId
                            })
                          }
                        >
                          Aceptar
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={declineInvite.isPending}
                          onClick={() =>
                            void declineInvite.mutateAsync({
                              invitationId: item.invitationId
                            })
                          }
                        >
                          Rechazar
                        </Button>
                        <Button
                          component={Link}
                          href={`/equipos/${item.teamSlug}`}
                          size="small"
                        >
                          Ver equipo
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )
              }

              if (item.kind === 'team_join_request') {
                return (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 3 }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={item.requesterImage || undefined}>
                          {item.requesterName.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700}>
                            Solicitud para unirse a {item.teamName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.requesterName} quiere unirse a tu equipo
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(item.createdAt)} · expira{' '}
                            {formatDate(item.expiresAt)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Divider />
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          variant="contained"
                          size="small"
                          disabled={respondJoinRequest.isPending}
                          onClick={() =>
                            void respondJoinRequest.mutateAsync({
                              teamSlug: item.teamSlug,
                              joinRequestId: item.joinRequestId,
                              action: 'accept'
                            })
                          }
                        >
                          Aceptar
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={respondJoinRequest.isPending}
                          onClick={() =>
                            void respondJoinRequest.mutateAsync({
                              teamSlug: item.teamSlug,
                              joinRequestId: item.joinRequestId,
                              action: 'decline'
                            })
                          }
                        >
                          Rechazar
                        </Button>
                        <Button
                          component={Link}
                          href="/dashboard/equipo"
                          size="small"
                        >
                          Ver en Miembros
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )
              }

              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3 }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={item.challengerTeamLogoUrl || undefined}>
                        {item.challengerTeamName.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          Versus amistoso: {item.challengerTeamName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.requestedByName} retó a tu equipo
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(item.createdAt)} · expira{' '}
                          {formatDate(item.expiresAt)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Divider />
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        component={Link}
                        href="/dashboard/equipo"
                        variant="contained"
                        size="small"
                      >
                        Responder en Versus
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={declineFriendly.isPending}
                        onClick={() =>
                          void declineFriendly.mutateAsync(item.matchId)
                        }
                      >
                        Rechazar
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        ) : (
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}
          >
            <Typography color="text.secondary">
              No tienes notificaciones pendientes.
            </Typography>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
